import { Module } from '@nestjs/common';
import { AppHttpController } from './app.http';
import { AppService } from './app.service';
import { BalanceModule } from './balance/balance.module';

@Module({
  imports: [
    BalanceModule,
  ],
  controllers: [
    AppHttpController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule {}
