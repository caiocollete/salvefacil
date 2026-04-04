import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: { ...dto } }).catch((e) => {
      if (e.code === 'P2002') {
        throw new ConflictException('Documento já cadastrado');
      }
      throw e;
    });
  }

  findAll() {
    return this.prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.client
      .update({ where: { id }, data: dto })
      .catch((e) => {
        if (e.code === 'P2002') {
          throw new ConflictException('Documento já cadastrado');
        }
        throw e;
      });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.delete({ where: { id } });
  }
}
