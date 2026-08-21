import { Module } from '@nestjs/common';
import { AppHttpController } from './app.http';
import { BalanceModule } from './balance/balance.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    McpModule,
    BalanceModule,
  ],
  controllers: [
    AppHttpController,
  ],
})
export class AppModule {}
