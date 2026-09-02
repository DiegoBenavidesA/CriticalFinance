import { pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const providerIdentifierEnum = pgEnum('provider_identifier', ['fintoc', 'manual']);

export const provider = pgTable('provider', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: providerIdentifierEnum('identifier').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProviderRow = typeof provider.$inferSelect;
export type NewProviderRow = typeof provider.$inferInsert;
