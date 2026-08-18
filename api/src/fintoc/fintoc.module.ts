// src/fintoc/fintoc.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FintocAccountsService } from './fintoc-accounts.service';
import { FintocController } from './fintoc.controller';
import { FintocWidgetController } from './fintoc-widget.controller';
import { FintocService } from './fintoc.service';

@Module({
  imports: [PrismaModule],
  controllers: [FintocController, FintocWidgetController],
  providers: [FintocService, FintocAccountsService],
})
export class FintocModule {}
