import { Module } from "@nestjs/common";
import { DRIZZLE_PG_CLIENT, drizzleProvider } from "./drizzle.provider";

@Module({
  exports: [
    DRIZZLE_PG_CLIENT,
  ],
  providers: drizzleProvider,
})
export class DrizzleModule {}
