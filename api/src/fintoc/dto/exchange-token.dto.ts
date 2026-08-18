// src/fintoc/dto/exchange-token.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ExchangeTokenDto {
  @IsString()
  @IsNotEmpty()
  exchangeToken: string;
}
