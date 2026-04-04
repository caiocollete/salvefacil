import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { ok: true, at: new Date().toISOString() };
  }

  /** SELECT simples (ex.: keep-alive do banco). */
  @Get('db')
  async dbPing() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, at: new Date().toISOString() };
  }
}
