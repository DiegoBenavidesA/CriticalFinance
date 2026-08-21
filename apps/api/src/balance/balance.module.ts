import { Module } from "@nestjs/common";
import { BalanceService } from "./balance.service";
import { MCP_STRATEGY, McpStrategy, StreamableHttpTransport } from "@rekog/mcp-nest";
import { BalanceMcpController } from "./balance.mcp";

export const mcpStrategy = new McpStrategy({
  name: 'critical_finance',
  version: '1.0.0',
  transports: [
    new StreamableHttpTransport,
  ],
});

@Module({
  controllers: [
    BalanceMcpController,
  ],
  providers: [
    BalanceService,
    {
      provide: MCP_STRATEGY,
      useValue: mcpStrategy,
    },
  ],
})
export class BalanceModule {}
