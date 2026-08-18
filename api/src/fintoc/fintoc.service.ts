// src/fintoc/fintoc.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Fintoc } from 'fintoc';

export type FintocHolderType = 'individual' | 'business';

export interface FintocLinkIntent {
  id: string;
  object: 'link_intent';
  country: string;
  holder_type: FintocHolderType;
  product: 'movements';
  mode: 'live' | 'test';
  status: string;
  widget_token: string;
}

export interface FintocLinkAccount {
  id: string;
  number: string;
  name: string;
  official_name?: string;
  type: string;
  currency: string;
  balance?: { available?: number; current?: number; limit?: number };
  holder_name?: string;
  holder_id?: string;
}

export interface FintocLink {
  id: string;
  object: 'link';
  link_token: string;
  holder_id: string;
  holder_type: FintocHolderType;
  institution: { id: string; country: string; name: string };
  accounts: FintocLinkAccount[];
  status: string;
  mode: 'live' | 'test';
}

export interface FintocMovement {
  id: string;
  object: 'movement';
  amount: number;
  currency: string;
  type: string;
  // amount ya viene firmado (negativo = egreso, positivo = ingreso); no hay
  // campo "direction" en la respuesta real de la API pese a lo documentado.
  // transaction_date suele venir null en sandbox; post_date es lo confiable.
  transaction_date: string | null;
  post_date: string;
  description?: string;
}

const FINTOC_API_BASE_URL = 'https://api.fintoc.com';

/**
 * Delgado wrapper sobre el SDK oficial de Fintoc (`fintoc`) para todo lo
 * que el SDK ya soporta (cuentas, movimientos), más llamadas HTTP directas
 * para Link Intents / exchange, que el SDK de Node aún no expone.
 *
 * Siempre se usa la Secret Key configurada en FINTOC_SECRET_KEY. En sandbox
 * esa key trae el prefijo sk_test_, lo que hace que Fintoc devuelva
 * recursos con mode: "test" automáticamente — no hay un flag de modo
 * separado que pasar.
 */
@Injectable()
export class FintocService {
  private readonly logger = new Logger(FintocService.name);
  private readonly client: Fintoc;
  private readonly secretKey: string;
  readonly publicKey: string;

  constructor() {
    const secretKey = process.env.FINTOC_SECRET_KEY;
    if (!secretKey) {
      throw new InternalServerErrorException(
        'FINTOC_SECRET_KEY no está configurada',
      );
    }
    if (!secretKey.startsWith('sk_test_')) {
      throw new InternalServerErrorException(
        'FINTOC_SECRET_KEY debe ser una llave de sandbox (sk_test_...)',
      );
    }
    const publicKey = process.env.FINTOC_PUBLIC_KEY;
    if (!publicKey) {
      throw new InternalServerErrorException(
        'FINTOC_PUBLIC_KEY no está configurada',
      );
    }
    if (!publicKey.startsWith('pk_test_')) {
      throw new InternalServerErrorException(
        'FINTOC_PUBLIC_KEY debe ser una llave de sandbox (pk_test_...)',
      );
    }
    this.secretKey = secretKey;
    this.publicKey = publicKey;
    this.client = new Fintoc(secretKey);
  }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${FINTOC_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: this.secretKey,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Fintoc API error ${response.status} on ${path}: ${body}`,
      );
      throw new InternalServerErrorException('Error al comunicarse con Fintoc');
    }

    return response.json() as Promise<T>;
  }

  /** Crea un Link Intent para iniciar el flujo del Widget (Fintoc Link). */
  createLinkIntent(
    holderType: FintocHolderType = 'individual',
  ): Promise<FintocLinkIntent> {
    return this.apiFetch<FintocLinkIntent>('/v1/link_intents', {
      method: 'POST',
      body: JSON.stringify({
        country: 'cl',
        holder_type: holderType,
        product: 'movements',
      }),
    });
  }

  /** Cambia el exchange_token entregado por el Widget por un Link con su link_token. */
  exchangeToken(exchangeToken: string): Promise<FintocLink> {
    const params = new URLSearchParams({ exchange_token: exchangeToken });
    return this.apiFetch<FintocLink>(`/v1/links/exchange?${params.toString()}`);
  }

  /**
   * Devuelve un generador async que pagina los movimientos bajo demanda.
   * Cuentas de sandbox pueden simular miles de movimientos, así que no se
   * deben traer todos a memoria de una vez (lazy: true, el default del SDK).
   */
  async listMovements(
    linkToken: string,
    accountId: string,
  ): Promise<AsyncGenerator<FintocMovement>> {
    const movements = await this.client.accounts.movements.list({
      account_id: accountId,
      link_token: linkToken,
      lazy: true,
    } as any);
    return movements as unknown as AsyncGenerator<FintocMovement>;
  }
}
