// src/fintoc/fintoc-widget.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FintocAccountsService } from './fintoc-accounts.service';
import { FintocService } from './fintoc.service';

/**
 * Sirve la página del Widget de Fintoc para que la app móvil la abra en el
 * navegador del sistema (expo-web-browser). No lleva JwtAuthGuard a propósito:
 * se abre fuera de la app (sin el header Authorization), y el widgetToken ya
 * viene de una llamada autenticada previa a POST /fintoc/link-intents.
 *
 * El esquema de deep link varía según el entorno (Expo Go usa exp://, un build
 * standalone usa el scheme propio de app.json), así que la app manda su propia
 * redirectUri ya resuelta (Linking.createURL) en vez de que el backend asuma un
 * esquema fijo.
 *
 * La conexión de la cuenta se completa server-to-server (ver /widget/complete)
 * en vez de mandar el exchangeToken de vuelta a la app por el redirect: probando
 * en Expo Go, volver a la app por un deep link exp:// reinicia el bundle de JS
 * completo (no es una navegación in-app), perdiendo cualquier estado en memoria
 * — así que no se puede depender de que la app reciba y procese ese token.
 */
@Controller('fintoc')
export class FintocWidgetController {
  constructor(
    private readonly fintoc: FintocService,
    private readonly accounts: FintocAccountsService,
  ) {}

  @Get('widget')
  getWidget(
    @Query('widgetToken') widgetToken: string,
    @Query('redirectUri') redirectUri: string,
    @Res() res: Response,
  ) {
    if (!widgetToken || !redirectUri) {
      throw new BadRequestException('Faltan widgetToken o redirectUri');
    }

    const config = {
      publicKey: this.fintoc.publicKey,
      widgetToken,
      redirectUri,
    };

    res.type('text/html').send(buildWidgetHtml(config));
  }

  /** Llamado por la propia página del widget (fetch, sin JWT) al terminar con éxito. */
  @Post('widget/complete')
  async complete(
    @Body('widgetToken') widgetToken: string,
    @Body('exchangeToken') exchangeToken: string,
  ) {
    if (!widgetToken || !exchangeToken) {
      throw new BadRequestException('Faltan widgetToken o exchangeToken');
    }
    const accounts = await this.accounts.completeFromWidget(
      widgetToken,
      exchangeToken,
    );
    return { accounts };
  }
}

function buildWidgetHtml(config: {
  publicKey: string;
  widgetToken: string;
  redirectUri: string;
}): string {
  // JSON.stringify escapa comillas/backslashes de forma segura para incrustar
  // los valores dentro del <script>; publicKey/widgetToken vienen de nuestro
  // propio backend, redirectUri es del cliente pero nunca se interpreta como
  // HTML, solo se usa como string en location.href.
  const configJson = JSON.stringify(config);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conectar cuenta bancaria</title>
  <style>
    body { margin: 0; font-family: sans-serif; background: #111; color: #eee; display: flex; align-items: center; justify-content: center; height: 100vh; }
  </style>
</head>
<body>
  <p>Cargando Fintoc Link…</p>
  <script src="https://js.fintoc.com/v1/"></script>
  <script>
    var config = ${configJson};

    function goBack(params) {
      var qs = Object.keys(params)
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
      var sep = config.redirectUri.indexOf('?') === -1 ? '?' : '&';
      window.location.href = config.redirectUri + sep + qs;
    }

    var widget = Fintoc.create({
      publicKey: config.publicKey,
      widgetToken: config.widgetToken,
      onSuccess: function (linkIntent) {
        // La cuenta se conecta acá mismo (server-to-server), no se manda el
        // exchangeToken de vuelta a la app: ese round-trip no es confiable.
        fetch('/fintoc/widget/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetToken: config.widgetToken,
            exchangeToken: linkIntent.exchangeToken,
          }),
        })
          .then(function (res) { goBack({ status: res.ok ? 'success' : 'error' }); })
          .catch(function () { goBack({ status: 'error' }); });
      },
      onExit: function () {
        goBack({ status: 'exit' });
      },
    });
    widget.open();
  </script>
</body>
</html>`;
}
