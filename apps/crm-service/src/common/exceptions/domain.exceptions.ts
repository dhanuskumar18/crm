import { HttpException, HttpStatus } from '@nestjs/common';

// ============================================================
// BASE DOMAIN EXCEPTION
// ============================================================

export class DomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

// ============================================================
// COMPANY EXCEPTIONS
// ============================================================

export class CompanyNotFoundException extends DomainException {
  constructor(id: string) {
    super('COMPANY_NOT_FOUND', `Company with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateCompanyException extends DomainException {
  constructor(identifier: string) {
    super(
      'DUPLICATE_COMPANY',
      `An active company with identifier "${identifier}" already exists`,
      HttpStatus.CONFLICT,
    );
  }
}

// ============================================================
// CONTACT EXCEPTIONS
// ============================================================

export class ContactNotFoundException extends DomainException {
  constructor(id: string) {
    super('CONTACT_NOT_FOUND', `Contact with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateContactException extends DomainException {
  constructor(email: string) {
    super(
      'DUPLICATE_CONTACT',
      `A contact with email "${email}" already exists`,
      HttpStatus.CONFLICT,
    );
  }
}

// ============================================================
// LEAD EXCEPTIONS
// ============================================================

export class LeadNotFoundException extends DomainException {
  constructor(id: string) {
    super('LEAD_NOT_FOUND', `Lead with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class LeadAlreadyConvertedException extends DomainException {
  constructor(id: string) {
    super(
      'LEAD_ALREADY_CONVERTED',
      `Lead "${id}" has already been converted`,
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidLeadConversionException extends DomainException {
  constructor(message: string) {
    super('INVALID_LEAD_CONVERSION', message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class LeadAlreadyLostException extends DomainException {
  constructor(id: string) {
    super('LEAD_ALREADY_LOST', `Lead "${id}" has already been marked as lost`, HttpStatus.CONFLICT);
  }
}

// ============================================================
// CUSTOMER EXCEPTIONS
// ============================================================

export class CustomerNotFoundException extends DomainException {
  constructor(id: string) {
    super('CUSTOMER_NOT_FOUND', `Customer with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

// ============================================================
// PIPELINE EXCEPTIONS
// ============================================================

export class PipelineNotFoundException extends DomainException {
  constructor(id: string) {
    super('PIPELINE_NOT_FOUND', `Pipeline with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class PipelineStageNotFoundException extends DomainException {
  constructor(id: string) {
    super(
      'PIPELINE_STAGE_NOT_FOUND',
      `Pipeline stage with ID "${id}" not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidPipelineStateException extends DomainException {
  constructor(message: string) {
    super('INVALID_PIPELINE_STATE', message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ============================================================
// OPPORTUNITY EXCEPTIONS
// ============================================================

export class OpportunityNotFoundException extends DomainException {
  constructor(id: string) {
    super('OPPORTUNITY_NOT_FOUND', `Opportunity with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidOpportunityStageException extends DomainException {
  constructor(message: string) {
    super('INVALID_OPPORTUNITY_STAGE', message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ============================================================
// REQUIREMENT EXCEPTIONS
// ============================================================

export class RequirementNotFoundException extends DomainException {
  constructor(id: string) {
    super(
      'REQUIREMENT_NOT_FOUND',
      `Requirement with ID "${id}" not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidRequirementTransitionException extends DomainException {
  constructor(message: string) {
    super('INVALID_REQUIREMENT_TRANSITION', message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ============================================================
// ACTIVITY EXCEPTIONS
// ============================================================

export class ActivityNotFoundException extends DomainException {
  constructor(id: string) {
    super('ACTIVITY_NOT_FOUND', `Activity with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidActivityException extends DomainException {
  constructor(message: string) {
    super('INVALID_ACTIVITY', message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ============================================================
// FOLLOW-UP EXCEPTIONS
// ============================================================

export class FollowUpNotFoundException extends DomainException {
  constructor(id: string) {
    super('FOLLOW_UP_NOT_FOUND', `Follow-up with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

export class FollowUpAlreadyCompletedException extends DomainException {
  constructor(id: string) {
    super(
      'FOLLOW_UP_ALREADY_COMPLETED',
      `Follow-up "${id}" has already been completed`,
      HttpStatus.CONFLICT,
    );
  }
}

// ============================================================
// DOCUMENT EXCEPTIONS
// ============================================================

export class DocumentNotFoundException extends DomainException {
  constructor(id: string) {
    super('DOCUMENT_NOT_FOUND', `Document with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}

// ============================================================
// TAG EXCEPTIONS
// ============================================================

export class TagNotFoundException extends DomainException {
  constructor(id: string) {
    super('TAG_NOT_FOUND', `Tag with ID "${id}" not found`, HttpStatus.NOT_FOUND);
  }
}
