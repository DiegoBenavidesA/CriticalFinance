import { Module } from '@nestjs/common';
import { AppHttpController } from './app.http';
import { AppService } from './app.service';

@Module({
  imports: [
  ],
  controllers: [
    AppHttpController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule {}
