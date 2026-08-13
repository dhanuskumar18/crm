export interface CrmEvent {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  source: string;
  data: Record<string, unknown>;
}

/**
 * Abstract event publisher interface.
 * This allows us to swap implementations (RabbitMQ, SQS, in-memory) without
 * changing the domain services.
 */
export abstract class EventPublisher {
  abstract publish(event: CrmEvent): Promise<void>;
  abstract publishBatch(events: CrmEvent[]): Promise<void>;
}

// ============================================================
// CRM EVENT TYPES
// ============================================================

export const CrmEventTypes = {
  // Lead events
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  LEAD_QUALIFIED: 'LEAD_QUALIFIED',
  LEAD_CONVERTED: 'LEAD_CONVERTED',
  LEAD_LOST: 'LEAD_LOST',
  LEAD_ASSIGNED: 'LEAD_ASSIGNED',

  // Company events
  COMPANY_CREATED: 'COMPANY_CREATED',
  COMPANY_UPDATED: 'COMPANY_UPDATED',
  COMPANY_DELETED: 'COMPANY_DELETED',

  // Contact events
  CONTACT_CREATED: 'CONTACT_CREATED',
  CONTACT_UPDATED: 'CONTACT_UPDATED',

  // Customer events
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  CUSTOMER_STATUS_CHANGED: 'CUSTOMER_STATUS_CHANGED',

  // Opportunity events
  OPPORTUNITY_CREATED: 'OPPORTUNITY_CREATED',
  OPPORTUNITY_UPDATED: 'OPPORTUNITY_UPDATED',
  OPPORTUNITY_STAGE_CHANGED: 'OPPORTUNITY_STAGE_CHANGED',
  OPPORTUNITY_WON: 'OPPORTUNITY_WON',
  OPPORTUNITY_LOST: 'OPPORTUNITY_LOST',

  // Requirement events
  REQUIREMENT_CREATED: 'REQUIREMENT_CREATED',
  REQUIREMENT_UPDATED: 'REQUIREMENT_UPDATED',
  REQUIREMENT_CONFIRMED: 'REQUIREMENT_CONFIRMED',
  REQUIREMENT_READY_FOR_QUOTATION: 'REQUIREMENT_READY_FOR_QUOTATION',
  REQUIREMENT_CANCELLED: 'REQUIREMENT_CANCELLED',

  // Follow-up events
  FOLLOW_UP_CREATED: 'FOLLOW_UP_CREATED',
  FOLLOW_UP_COMPLETED: 'FOLLOW_UP_COMPLETED',

  // Activity events
  ACTIVITY_CREATED: 'ACTIVITY_CREATED',

  // Document events
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
} as const;

export type CrmEventType = (typeof CrmEventTypes)[keyof typeof CrmEventTypes];
