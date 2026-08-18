import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mailer initialized with host: ${host}`);
    } else {
      this.logger.warn('SMTP credentials not configured. Emails will be logged to console in dev mode.');
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, resetUrl?: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', 'noreply@costtracking.com');
    const link = resetUrl || `http://localhost:3000/reset-password?token=${resetToken}`;
    const subject = 'CostTracking CRM - Password Reset Request';
    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your CostTracking CRM account.</p>
      <p>Click the link below to set a new password. This link is valid for 1 hour:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, html });
        this.logger.log(`Password reset email sent to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send password reset email to ${to}: ${(error as Error).message}`);
      }
    } else {
      this.logger.log(`[DEV MAIL] To: ${to} | Subject: ${subject} | Link: ${link}`);
    }
  }

  async sendUserInviteEmail(to: string, inviteToken: string, tenantName: string, inviteUrl?: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM', 'noreply@costtracking.com');
    const link = inviteUrl || `http://localhost:3000/accept-invite?token=${inviteToken}`;
    const subject = `Invitation to join ${tenantName} on CostTracking CRM`;
    const html = `
      <h2>You've been invited!</h2>
      <p>You have been invited to join <strong>${tenantName}</strong> on CostTracking CRM.</p>
      <p>Click the link below to accept your invitation and set up your account password:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
      <p>This invitation will expire in 7 days.</p>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, html });
        this.logger.log(`Invite email sent to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send invite email to ${to}: ${(error as Error).message}`);
      }
    } else {
      this.logger.log(`[DEV MAIL] To: ${to} | Subject: ${subject} | Link: ${link}`);
    }
  }
}
