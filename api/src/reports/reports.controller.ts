import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('closing')
  closing(@Query('from') from: string, @Query('to') to: string) {
    const start = this.parseDate(from, 'from');
    const end = this.parseDateEnd(to, 'to');
    return this.reports.closingReceipt(start, end);
  }

  @Get('monthly')
  monthly(@Query('year') year: string) {
    const y = Number(year);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) {
      return this.reports.monthlyByShipping(new Date().getFullYear());
    }
    return this.reports.monthlyByShipping(y);
  }

  @Get('by-client')
  byClient(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('clientId') clientId?: string,
  ) {
    const start = this.parseDate(from, 'from');
    const end = this.parseDateEnd(to, 'to');
    const id =
      clientId !== undefined && clientId !== null && clientId.trim() !== ''
        ? clientId.trim()
        : undefined;
    return this.reports.byClient(start, end, id);
  }

  private parseDate(value: string, name: string): Date {
    if (!value) {
      throw new BadRequestException(`Query ${name} é obrigatória (YYYY-MM-DD)`);
    }
    const d = new Date(value + 'T00:00:00.000Z');
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Query ${name} inválida`);
    }
    return d;
  }

  private parseDateEnd(value: string, name: string): Date {
    if (!value) {
      throw new BadRequestException(`Query ${name} é obrigatória (YYYY-MM-DD)`);
    }
    const d = new Date(value + 'T23:59:59.999Z');
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Query ${name} inválida`);
    }
    return d;
  }
}
