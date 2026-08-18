// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { FintocModule } from './fintoc/fintoc.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // .env disponible en todo el proyecto
    PrismaModule,
    AuthModule,           // <-- añade autenticación JWT
    TransactionsModule,   // <-- tus endpoints de movimientos
    UsersModule,
    FintocModule,         // <-- conexión de cuentas vía Fintoc Link (sandbox)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}