import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './schema/index.ts',
  out: '../../drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? 'postgresql://user:password@localhost:5432/postgres',
  },
  verbose: true,
  strict: true,
});
