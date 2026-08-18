// src/fintoc/fintoc.controller.ts
import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateLinkIntentDto } from './dto/create-link-intent.dto';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { FintocAccountsService } from './fintoc-accounts.service';
import { FintocService } from './fintoc.service';

@Controller('fintoc')
@UseGuards(JwtAuthGuard)
export class FintocController {
  constructor(
    private readonly fintoc: FintocService,
    private readonly accounts: FintocAccountsService,
  ) {}

  // Paso 1: el frontend pide un widget_token para abrir el Widget de Fintoc Link.
  @Post('link-intents')
  async createLinkIntent(@Req() req: any, @Body() dto: CreateLinkIntentDto) {
    const userId = req.user.userId as string;
    const linkIntent = await this.fintoc.createLinkIntent(
      dto.holderType ?? 'individual',
    );
    // Registrado para que fintoc-widget.controller.ts pueda completar la
    // conexión sin JWT cuando el usuario termine el flujo en el navegador.
    this.accounts.registerWidgetToken(linkIntent.widget_token, userId);
    return linkIntent;
  }

  // Paso 2: tras el onSuccess del Widget, el frontend manda el exchange_token
  // y guardamos las cuentas conectadas para el usuario autenticado.
  @Post('link-intents/exchange')
  async exchange(@Req() req: any, @Body() dto: ExchangeTokenDto) {
    const userId = req.user.userId as string;
    const accounts = await this.accounts.connectAccounts(
      userId,
      dto.exchangeToken,
    );
    return { accounts };
  }

  // Trae y guarda los movimientos de una cuenta ya conectada.
  @Post('accounts/:accountId/sync-movements')
  syncMovements(@Req() req: any, @Param('accountId') accountId: string) {
    const userId = req.user.userId as string;
    return this.accounts.syncMovements(userId, accountId);
  }
}
