import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagNotFoundException } from '../common/exceptions/domain.exceptions';
import { Tag } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(dto: CreateTagDto, userId?: string): Promise<Tag> {
    const existing = await this.prisma.tag.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException(`Tag with name ${dto.name} already exists`);
    }

    const tag = await this.prisma.tag.create({
      data: {
        ...dto,
        id: uuidv4(),
      },
    });

    await this.audit.log({
      entityType: 'Tag',
      entityId: tag.id,
      action: 'CREATE',
      performedBy: userId,
      newData: tag as unknown as Record<string, unknown>,
    });

    return tag;
  }

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new TagNotFoundException(id);
    return tag;
  }

  async update(id: string, dto: UpdateTagDto, userId?: string): Promise<Tag> {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.tag.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new BadRequestException(`Tag with name ${dto.name} already exists`);
    }

    const tag = await this.prisma.tag.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      entityType: 'Tag',
      entityId: id,
      action: 'UPDATE',
      performedBy: userId,
      newData: tag as unknown as Record<string, unknown>,
    });

    return tag;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.tag.delete({ where: { id } });
    await this.audit.log({ entityType: 'Tag', entityId: id, action: 'DELETE', performedBy: userId });
  }
}
