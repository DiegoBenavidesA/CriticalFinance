// src/fintoc/fintoc-accounts.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType, Currency, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FintocLink, FintocLinkAccount, FintocService } from './fintoc.service';

const PROVIDER = 'fintoc';

// Tope defensivo: cuentas de sandbox pueden simular miles de movimientos
// paginados de a 30. Sin esto, un sync inicial podría demorar minutos.
const MAX_MOVEMENTS_PER_SYNC = 500;

// providerRef no tiene espacio para guardar tanto el link_token como el id
// de cuenta de Fintoc, y el schema no define columnas nuevas para esto.
// Se codifican ambos en un solo string para no tocar el schema.
const REF_SEPARATOR = '::';

function encodeProviderRef(linkToken: string, fintocAccountId: string): string {
  return `${linkToken}${REF_SEPARATOR}${fintocAccountId}`;
}

function decodeProviderRef(providerRef: string): {
  linkToken: string;
  fintocAccountId: string;
} {
  const [linkToken, fintocAccountId] = providerRef.split(REF_SEPARATOR);
  return { linkToken, fintocAccountId };
}

const ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  checking_account: AccountType.CUENTA_CORRIENTE,
  vista_account: AccountType.CUENTA_VISTA,
  savings_account: AccountType.CUENTA_AHORRO,
  credit_card: AccountType.TARJETA_CREDITO,
};

function mapAccountType(fintocType: string): AccountType {
  return ACCOUNT_TYPE_MAP[fintocType] ?? AccountType.CUENTA_CORRIENTE;
}

function mapCurrency(fintocCurrency: string): Currency {
  return fintocCurrency in Currency
    ? (fintocCurrency as Currency)
    : Currency.CLP;
}

@Injectable()
export class FintocAccountsService {
  // Mapa en memoria widgetToken -> userId, de un solo uso. La página del
  // widget (fintoc-widget.controller.ts) corre en el navegador del sistema,
  // sin el JWT del usuario, así que necesita una forma de completar la
  // conexión sin autenticación clásica. Como esto corre en un solo proceso
  // Node (no hay múltiples instancias del backend), un Map alcanza; si
  // algún día se escala horizontalmente habría que moverlo a Redis/DB.
  private readonly pendingLinkIntents = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly fintoc: FintocService,
  ) {}

  registerWidgetToken(widgetToken: string, userId: string) {
    this.pendingLinkIntents.set(widgetToken, userId);
  }

  /**
   * Llamado desde la página del widget (sin JWT) cuando el usuario termina
   * el flujo de Fintoc. Resuelve el userId a partir del widgetToken
   * registrado en createLinkIntent y completa la conexión server-to-server,
   * para no depender de que el exchangeToken viaje de vuelta a la app por
   * un deep link (poco confiable: en Expo Go, volver por exp:// reinicia el
   * bundle de JS y pierde cualquier estado en memoria de la app).
   */
  async completeFromWidget(widgetToken: string, exchangeToken: string) {
    const userId = this.pendingLinkIntents.get(widgetToken);
    if (!userId) {
      throw new NotFoundException('widgetToken no reconocido o ya usado');
    }
    this.pendingLinkIntents.delete(widgetToken);
    return this.connectAccounts(userId, exchangeToken);
  }

  /**
   * Cambia el exchange_token del Widget por un Link de Fintoc y crea/actualiza
   * las cuentas del usuario (provider="fintoc", providerRef=link_token+accountId).
   */
  async connectAccounts(userId: string, exchangeToken: string) {
    const link: FintocLink = await this.fintoc.exchangeToken(exchangeToken);

    const accounts = await Promise.all(
      link.accounts.map((fintocAccount) =>
        this.upsertAccount(userId, link, fintocAccount),
      ),
    );

    return accounts;
  }

  private async upsertAccount(
    userId: string,
    link: FintocLink,
    fintocAccount: FintocLinkAccount,
  ) {
    const providerRef = encodeProviderRef(link.link_token, fintocAccount.id);
    const balanceCents =
      fintocAccount.balance?.current ?? fintocAccount.balance?.available ?? 0;

    const data = {
      userId,
      bank: link.institution.name,
      accountType: mapAccountType(fintocAccount.type),
      accountNumber: fintocAccount.number,
      holderName: fintocAccount.holder_name ?? '',
      rutTitular: fintocAccount.holder_id ?? link.holder_id,
      provider: PROVIDER,
      providerRef,
      currency: mapCurrency(fintocAccount.currency),
      balanceCents,
    };

    const existing = await this.prisma.account.findFirst({
      where: { userId, provider: PROVIDER, providerRef },
    });

    if (existing) {
      return this.prisma.account.update({ where: { id: existing.id }, data });
    }

    return this.prisma.account.create({ data });
  }

  /**
   * Trae los movimientos de una cuenta conectada por Fintoc y los guarda como
   * Transaction. Se procesan en streaming (página por página) y se corta en
   * MAX_MOVEMENTS_PER_SYNC, porque cuentas de sandbox pueden simular miles
   * de movimientos y no tiene sentido traerlos todos en una sola llamada.
   */
  async syncMovements(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    if (account.provider !== PROVIDER || !account.providerRef) {
      throw new ForbiddenException('La cuenta no está conectada a Fintoc');
    }

    const { linkToken, fintocAccountId } = decodeProviderRef(
      account.providerRef,
    );
    const movements = await this.fintoc.listMovements(
      linkToken,
      fintocAccountId,
    );

    let processed = 0;
    for await (const movement of movements) {
      if (processed >= MAX_MOVEMENTS_PER_SYNC) break;

      await this.prisma.transaction.upsert({
        where: {
          accountId_externalId: {
            accountId: account.id,
            externalId: movement.id,
          },
        },
        update: {},
        create: {
          accountId: account.id,
          bookedAt: new Date(movement.transaction_date ?? movement.post_date),
          valueCents: movement.amount,
          type:
            movement.amount < 0
              ? TransactionType.debit
              : TransactionType.credit,
          description: movement.description ?? movement.type,
          externalId: movement.id,
        },
      });
      processed += 1;
    }

    return { processed, truncated: processed >= MAX_MOVEMENTS_PER_SYNC };
  }
}
