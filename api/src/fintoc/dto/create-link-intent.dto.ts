// src/fintoc/dto/create-link-intent.dto.ts
import { IsIn, IsOptional } from 'class-validator';

export class CreateLinkIntentDto {
  @IsOptional()
  @IsIn(['individual', 'business'])
  holderType?: 'individual' | 'business';
}
