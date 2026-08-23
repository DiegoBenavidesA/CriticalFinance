import { Module } from '@nestjs/common';
import { AppHttpController } from './app.http';
import { BalanceModule } from './balance/balance.module';
import { McpModule } from './mcp/mcp.module';
import { ConfigModule } from '@nestjs/config';
import { loadEnv } from './config';
import { EnvironmentModule } from './environment/environment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [loadEnv],
    }),
    EnvironmentModule,
    McpModule,
    BalanceModule,
  ],
  controllers: [
    AppHttpController,
  ],
})
export class AppModule {}
