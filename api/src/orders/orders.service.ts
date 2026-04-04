import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

const orderInclude = {
  client: true,
  items: { include: { product: true } },
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items.length) {
      throw new BadRequestException('Pedido precisa de ao menos um item');
    }
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Um ou mais produtos não existem');
    }
    const priceById = new Map(products.map((p) => [p.id, p.price]));

    let total = new Prisma.Decimal(0);
    const lineData = dto.items.map((item) => {
      const unit = priceById.get(item.productId)!;
      const line = new Prisma.Decimal(unit).mul(item.quantity);
      total = total.add(line);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: unit,
      };
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber: dto.orderNumber,
            clientId: dto.clientId,
            shippingDate: new Date(dto.shippingDate),
            total,
            items: { create: lineData },
          },
          include: orderInclude,
        });
        return order;
      });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Número de pedido já existe');
      }
      throw e;
    }
  }

  findAll() {
    return this.prisma.order.findMany({
      orderBy: { shippingDate: 'desc' },
      include: orderInclude,
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    await this.findOne(id);
    if (dto.items !== undefined && dto.items.length === 0) {
      throw new BadRequestException('Pedido precisa de ao menos um item');
    }
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
      });
      if (!client) {
        throw new NotFoundException('Cliente não encontrado');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.items) {
          const productIds = [...new Set(dto.items.map((i) => i.productId))];
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
          });
          if (products.length !== productIds.length) {
            throw new NotFoundException('Um ou mais produtos não existem');
          }
          const priceById = new Map(products.map((p) => [p.id, p.price]));
          let total = new Prisma.Decimal(0);
          const creates = dto.items.map((item) => {
            const unit = priceById.get(item.productId)!;
            const line = new Prisma.Decimal(unit).mul(item.quantity);
            total = total.add(line);
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: unit,
            };
          });
          await tx.orderItem.deleteMany({ where: { orderId: id } });
          await tx.order.update({
            where: { id },
            data: {
              orderNumber: dto.orderNumber,
              clientId: dto.clientId,
              shippingDate: dto.shippingDate
                ? new Date(dto.shippingDate)
                : undefined,
              total,
              items: { create: creates },
            },
            include: orderInclude,
          });
          return tx.order.findUniqueOrThrow({
            where: { id },
            include: orderInclude,
          });
        }

        const patch: {
          orderNumber?: string;
          clientId?: string;
          shippingDate?: Date;
        } = {};
        if (dto.orderNumber !== undefined) patch.orderNumber = dto.orderNumber;
        if (dto.clientId !== undefined) patch.clientId = dto.clientId;
        if (dto.shippingDate !== undefined) {
          patch.shippingDate = new Date(dto.shippingDate);
        }
        return tx.order.update({
          where: { id },
          data: patch,
          include: orderInclude,
        });
      });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Número de pedido já existe');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}
