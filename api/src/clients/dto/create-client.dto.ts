import { ClientClassification, PersonType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsEnum(PersonType)
  type: PersonType;

  @IsEnum(ClientClassification)
  classification: ClientClassification;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(11)
  document: string;

  @IsString()
  @MinLength(3)
  address: string;

  @IsString()
  @MinLength(8)
  phone: string;
}
