import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditService } from './audit/audit.service';
import { OutboxService } from './events/outbox.service';

// Domain Modules
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { CustomersModule } from './customers/customers.module';
import { LeadsModule } from './leads/leads.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { RequirementsModule } from './requirements/requirements.module';
import { ActivitiesModule } from './activities/activities.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { TagsModule } from './tags/tags.module';
import { DocumentsModule } from './documents/documents.module';
import { Customer360Module } from './customer-360/customer-360.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule,
    ContactsModule,
    CustomersModule,
    LeadsModule,
    PipelinesModule,
    OpportunitiesModule,
    RequirementsModule,
    ActivitiesModule,
    FollowUpsModule,
    TagsModule,
    DocumentsModule,
    Customer360Module,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuditService,
    OutboxService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
