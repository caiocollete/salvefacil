import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        details: dto.details,
        price: new Prisma.Decimal(dto.price),
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const data: {
      name?: string;
      details?: string | null;
      price?: Prisma.Decimal;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.details !== undefined) data.details = dto.details;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
