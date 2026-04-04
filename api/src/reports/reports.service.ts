import { Injectable, NotFoundException } from '@nestjs/common';
import { PersonType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function money(d: Prisma.Decimal) {
  return d.toFixed(2);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recibo: linhas por item de pedido + sumário no período (data de envio). */
  async closingReceipt(from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        shippingDate: { gte: from, lte: to },
      },
      include: {
        client: true,
        items: { include: { product: true } },
      },
      orderBy: [{ shippingDate: 'asc' }, { orderNumber: 'asc' }],
    });

    const rows = orders.flatMap((o) =>
      o.items.map((it) => {
        const line = new Prisma.Decimal(it.unitPrice).mul(it.quantity);
        return {
          shippingDate: o.shippingDate.toISOString().slice(0, 10),
          orderNumber: o.orderNumber,
          clientName: o.client.name,
          clientDocument: o.client.document,
          personType: o.client.type,
          productName: it.product.name,
          quantity: it.quantity,
          unitPrice: money(it.unitPrice),
          lineTotal: money(line),
        };
      }),
    );

    const totalMonetary = orders.reduce(
      (sum, o) => sum.add(o.total),
      new Prisma.Decimal(0),
    );

    return {
      period: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
      rows,
      summary: {
        orderCount: orders.length,
        lineCount: rows.length,
        totalBRL: money(totalMonetary),
      },
    };
  }

  /** Totais por mês (calendário) com base na data de envio. */
  async monthlyByShipping(year: number) {
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);
    const orders = await this.prisma.order.findMany({
      where: {
        shippingDate: { gte: from, lte: to },
      },
      select: { shippingDate: true, total: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: `${year}-${String(i + 1).padStart(2, '0')}`,
      orderCount: 0,
      totalBRL: new Prisma.Decimal(0),
    }));

    for (const o of orders) {
      const m = o.shippingDate.getMonth();
      months[m].orderCount += 1;
      months[m].totalBRL = months[m].totalBRL.add(o.total);
    }

    return {
      year,
      months: months.map((m) => ({
        month: m.month,
        label: m.label,
        orderCount: m.orderCount,
        totalBRL: money(m.totalBRL),
      })),
      yearTotalBRL: money(
        months.reduce((s, m) => s.add(m.totalBRL), new Prisma.Decimal(0)),
      ),
    };
  }

  /**
   * Fechamento por cliente (PF e PJ) no período.
   * Com `clientId`, apenas pedidos desse cliente; sem filtro, um resumo por cliente.
   */
  async byClient(from: Date, to: Date, clientId?: string) {
    if (clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client) {
        throw new NotFoundException('Cliente não encontrado');
      }
    }

    const orders = await this.prisma.order.findMany({
      where: {
        shippingDate: { gte: from, lte: to },
        ...(clientId ? { clientId } : {}),
      },
      include: { client: true },
    });

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        document: string;
        personType: PersonType;
        orderCount: number;
        total: Prisma.Decimal;
      }
    >();

    for (const o of orders) {
      const key = o.clientId;
      const cur = map.get(key) ?? {
        id: o.client.id,
        name: o.client.name,
        document: o.client.document,
        personType: o.client.type,
        orderCount: 0,
        total: new Prisma.Decimal(0),
      };
      cur.orderCount += 1;
      cur.total = cur.total.add(o.total);
      map.set(key, cur);
    }

    const clients = [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );

    const grand = clients.reduce(
      (s, c) => s.add(c.total),
      new Prisma.Decimal(0),
    );

    return {
      period: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
      filterClientId: clientId ?? null,
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        personType: c.personType,
        orderCount: c.orderCount,
        totalBRL: money(c.total),
      })),
      summary: {
        clientCount: clients.length,
        totalBRL: money(grand),
      },
    };
  }
}
