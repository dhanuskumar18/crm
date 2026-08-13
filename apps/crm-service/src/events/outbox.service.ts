import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrmEvent } from './event-publisher.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Outbox Service — Transactional Outbox Pattern
 *
 * Events are stored in the outbox_events table inside the same
 * database transaction as the business data change.
 * A background publisher (TODO: RabbitMQ) picks them up and publishes.
 *
 * This guarantees: if the DB commits, the event will eventually be published.
 * If the DB rolls back, no spurious event is published.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store an outbox event inside a transaction (tx must be provided
   * when this is called from within a $transaction block).
   */
  async storeEvent(
    eventType: string,
    data: Record<string, unknown>,
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const event: CrmEvent = {
      eventId: uuidv4(),
      eventType,
      version: 1,
      occurredAt: new Date().toISOString(),
      source: 'crm-service',
      data,
    };

    await (client as PrismaService).outboxEvent.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        version: event.version,
        source: event.source,
        payload: event as any,
        status: 'PENDING',
      },
    });

    this.logger.debug(`Stored outbox event: ${eventType} (${event.eventId})`);
  }

  /**
   * Get pending events for publishing.
   * TODO: Called by a background scheduler/RabbitMQ publisher.
   */
  async getPendingEvents(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Mark an event as published.
   */
  async markPublished(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  /**
   * Mark an event as failed.
   */
  async markFailed(eventId: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: 'FAILED',
        lastError: error,
        attempts: { increment: 1 },
      },
    });
  }
}
