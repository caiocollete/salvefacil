import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  orderNumber: string;

  @IsString()
  clientId: string;

  @IsDateString()
  shippingDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
