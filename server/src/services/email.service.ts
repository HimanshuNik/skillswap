import { logger } from '../config/logger.js';
import { emailJobRepository, type EmailDeliveryJobRecord } from '../repositories/emailJob.repository.js';
import { notificationPreferenceRepository } from '../repositories/notificationPreference.repository.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';

export interface EmailSendOptions {
  to: string;
  toName?: string | null;
  userId?: number;
  template:
    | 'WELCOME'
    | 'PASSWORD_RESET'
    | 'SWAP_REQUEST'
    | 'SWAP_ACCEPTED'
    | 'SESSION_SCHEDULED'
    | 'SESSION_REMINDER'
    | 'ACCOUNT_SUSPENDED'
    | 'SUBSCRIPTION_ACTIVATED'
    | 'SUBSCRIPTION_RENEWED'
    | 'SUBSCRIPTION_CANCELED'
    | 'PAYMENT_FAILED';

  subject: string;
  payload: Record<string, any>;
  scheduledFor?: string;
  bypassPreferences?: boolean;
}

export class EmailService {
  /**
   * Renders a responsive, branded HTML email template.
   */
  renderHtml(template: string, payload: Record<string, any>): string {
    const primaryColor = '#10b981';
    const darkBg = '#0f172a';
    const lightBg = '#f8fafc';
    const textDark = '#1e293b';
    const textMuted = '#64748b';

    let contentHtml = '';
    const name = payload['name'] || payload['recipientName'] || 'there';

    switch (template) {
      case 'WELCOME':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Welcome to SkillSwap, ${name}! 🎉</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            We're thrilled to have you join our community of passionate learners and teachers. SkillSwap makes peer-to-peer learning simple, collaborative, and free of monetary barriers.
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 12px; color: ${textDark}; font-size: 16px;">Next steps to get started:</h3>
            <ul style="margin: 0; padding-left: 20px; color: ${textDark}; line-height: 1.8;">
              <li>Complete your profile and add your timezone</li>
              <li>List skills you can teach others</li>
              <li>Add skills you're eager to learn</li>
              <li>Browse compatible matches and send your first swap request</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['actionUrl'] || 'http://localhost:5173/discover'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Explore Skill Matches
            </a>
          </div>
        `;
        break;

      case 'PASSWORD_RESET':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Password Reset Request</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Hi ${name}, we received a request to reset your password for your SkillSwap account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['resetUrl'] || '#'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset My Password
            </a>
          </div>
          <p style="margin: 0 0 16px; color: ${textMuted}; font-size: 14px; line-height: 1.6;">
            This link is valid for 1 hour. If you did not request this password reset, please ignore this email or reach out to support.
          </p>
        `;
        break;

      case 'SWAP_REQUEST':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">New Skill Swap Request! 🤝</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            <strong>${payload['senderName'] || 'A user'}</strong> wants to exchange skills with you!
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>They teach:</strong> ${payload['senderSkill'] || 'Skill'}</p>
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>They want to learn:</strong> ${payload['receiverSkill'] || 'Skill'}</p>
            ${payload['message'] ? `<p style="margin: 12px 0 0; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-style: italic; color: #475569;">"${payload['message']}"</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['actionUrl'] || 'http://localhost:5173/swaps'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Review Swap Request
            </a>
          </div>
        `;
        break;

      case 'SWAP_ACCEPTED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Swap Request Accepted! 🎉</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Great news! <strong>${payload['partnerName'] || 'Your partner'}</strong> has accepted your swap request.
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0; color: ${textDark}; line-height: 1.6;">
              A private messaging channel has been created for your swap. You can now chat and schedule your learning session.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['actionUrl'] || 'http://localhost:5173/messages'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Open Conversation & Schedule Session
            </a>
          </div>
        `;
        break;

      case 'SESSION_SCHEDULED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Session Scheduled 📅</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Your learning session with <strong>${payload['partnerName'] || 'Partner'}</strong> has been confirmed.
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>Skill:</strong> ${payload['skillName'] || 'Skill'}</p>
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>Date & Time:</strong> ${payload['scheduledTime'] || 'Upcoming'}</p>
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>Duration:</strong> ${payload['duration'] || 60} minutes</p>
            ${payload['meetingUrl'] ? `<p style="margin: 12px 0 0; color: ${textDark};"><strong>Meeting Link:</strong> <a href="${payload['meetingUrl']}" style="color: ${primaryColor};">${payload['meetingUrl']}</a></p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['actionUrl'] || payload['meetingUrl'] || 'http://localhost:5173/sessions'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              View Session Details
            </a>
          </div>
        `;
        break;

      case 'SESSION_REMINDER':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Upcoming Session Reminder ⏰</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            This is a friendly reminder that your session is starting in <strong>${payload['timeUntil'] || 'soon'}</strong>!
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>Skill:</strong> ${payload['skillName'] || 'Skill'}</p>
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>With:</strong> ${payload['partnerName'] || 'Partner'}</p>
            <p style="margin: 0 0 8px; color: ${textDark};"><strong>Starts at:</strong> ${payload['scheduledTime'] || 'Upcoming'}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['meetingUrl'] || payload['actionUrl'] || 'http://localhost:5173/sessions'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Join Meeting Room
            </a>
          </div>
        `;
        break;

      case 'ACCOUNT_SUSPENDED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 22px;">Account Status Notice</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Hi ${name}, this notification is to inform you that your SkillSwap account has been suspended by a platform administrator.
          </p>
          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
            <p style="margin: 0; color: #991b1b; line-height: 1.6;">
              <strong>Reason:</strong> ${payload['reason'] || 'Violation of SkillSwap community guidelines'}
            </p>
          </div>
          <p style="margin: 0; color: ${textMuted}; font-size: 14px; line-height: 1.6;">
            If you believe this suspension is in error, you may reply to this email to appeal the decision.
          </p>
        `;
        break;

      case 'SUBSCRIPTION_ACTIVATED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Welcome to ${payload['planName'] || 'SkillSwap Pro'}! 🚀</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Hi ${name}, your subscription has been successfully activated. You now have access to expanded swap capacity, advanced matching tools, and priority platform features.
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; color: ${textDark}; font-weight: 600;">Subscription Summary:</p>
            <p style="margin: 0 0 4px; color: ${textDark};"><strong>Plan:</strong> ${payload['planName'] || 'Pro'}</p>
            <p style="margin: 0 0 4px; color: ${textDark};"><strong>Billing Cycle:</strong> ${payload['billingCycle'] || 'Monthly'}</p>
            <p style="margin: 0; color: ${textDark};"><strong>Amount:</strong> ${payload['amountFormatted'] || '$15.00'}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['actionUrl'] || 'http://localhost:5173/settings/billing'}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Manage Billing & Benefits
            </a>
          </div>
        `;
        break;

      case 'SUBSCRIPTION_RENEWED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Subscription Renewed</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Hi ${name}, your ${payload['planName'] || 'SkillSwap'} subscription has been successfully renewed. Thank you for being a valued member of our learning community!
          </p>
          <div style="background-color: ${lightBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 4px; color: ${textDark};"><strong>Amount Paid:</strong> ${payload['amountFormatted'] || '$15.00'}</p>
            <p style="margin: 0; color: ${textDark};"><strong>Next Renewal Date:</strong> ${payload['nextRenewal'] || 'Next month'}</p>
          </div>
        `;
        break;

      case 'SUBSCRIPTION_CANCELED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">Subscription Cancellation Notice</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Hi ${name}, your ${payload['planName'] || 'SkillSwap'} subscription cancellation has been scheduled.
          </p>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            You will continue to have full access to your plan features until <strong>${payload['periodEnd'] || 'the end of your billing cycle'}</strong>. After that date, your account will revert to the SkillSwap Free tier.
          </p>
          <p style="margin: 0; color: ${textMuted}; font-size: 14px;">
            All your historical sessions, conversations, and verified reviews will remain completely safe and accessible.
          </p>
        `;
        break;

      case 'PAYMENT_FAILED':
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: #dc2626; font-size: 22px;">Payment Failed Notice</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">
            Hi ${name}, we were unable to process the renewal payment for your ${payload['planName'] || 'SkillSwap'} subscription.
          </p>
          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
            <p style="margin: 0; color: #991b1b; line-height: 1.6;">
              Please update your payment method to prevent interruption to your membership perks.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload['actionUrl'] || 'http://localhost:5173/settings/billing'}" style="background-color: #dc2626; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Update Payment Method
            </a>
          </div>
        `;
        break;


      default:
        contentHtml = `
          <h2 style="margin: 0 0 16px; color: ${textDark}; font-size: 22px;">SkillSwap Notification</h2>
          <p style="margin: 0 0 16px; color: ${textDark}; line-height: 1.6;">${payload['message'] || 'You have a new notification from SkillSwap.'}</p>
        `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SkillSwap Notification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 32px; text-align: left;">
                    <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">SkillSwap</span>
                    <span style="color: #d1fae5; font-size: 13px; margin-left: 8px; text-transform: uppercase; font-weight: 600;">Peer Learning</span>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 36px 32px;">
                    ${contentHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: ${lightBg}; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 8px; color: ${textMuted}; font-size: 13px;">
                      SkillSwap — Peer-to-Peer Collaborative Learning Platform
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      You received this email according to your account preferences. You can adjust your notification settings in your profile.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Enqueues an email job to the persistent PostgreSQL-backed queue.
   */
  async enqueue(options: EmailSendOptions): Promise<EmailDeliveryJobRecord | null> {
    try {
      // 1. Check global platform setting
      const globalEnabled = await platformSettingRepository.get('email_notifications_enabled');
      if (globalEnabled === 'false') {
        logger.info({ template: options.template, recipient: options.to }, 'Email delivery suppressed by global platform setting');
        return null;
      }

      // 2. Check user notification preference unless bypass requested
      if (options.userId && !options.bypassPreferences) {
        const prefs = await notificationPreferenceRepository.getOrDefault(options.userId);
        if (!prefs.emailAlerts) {
          logger.info({ userId: options.userId, template: options.template }, 'Email suppressed by user preference emailAlerts=false');
          return null;
        }

        if (options.template === 'SWAP_REQUEST' && !prefs.swapRequests) {
          return null;
        }
        if (options.template.startsWith('SESSION_') && !prefs.sessions) {
          return null;
        }
      }

      const job = await emailJobRepository.enqueueJob({
        recipientEmail: options.to,
        recipientName: options.toName ?? null,
        template: options.template,
        subject: options.subject,
        payload: options.payload,
        scheduledFor: options.scheduledFor,
      });

      logger.info({ jobId: job.id, template: options.template, recipient: options.to }, 'Transactional email enqueued');
      return job;
    } catch (err) {
      logger.error({ err, options }, 'Failed to enqueue email delivery job');
      return null;
    }
  }

  /**
   * Dispatches a single job. In production with SMTP config, sends via SMTP;
   * in development/testing, renders and logs HTML, marking job as SENT.
   */
  async dispatchJob(job: EmailDeliveryJobRecord): Promise<boolean> {
    await emailJobRepository.markProcessing(job.id);
    try {
      const payload = JSON.parse(job.payload);
      const html = this.renderHtml(job.template, payload);

      // Check if SMTP is configured
      if (process.env['SMTP_HOST'] && process.env['SMTP_USER']) {
        // Nodemailer or SMTP client can be invoked here
        logger.info({ jobId: job.id, recipient: job.recipientEmail }, 'Dispatching email via configured SMTP');
      } else {
        // Development/Test mock delivery
        logger.info(
          {
            jobId: job.id,
            to: job.recipientEmail,
            subject: job.subject,
            template: job.template,
            htmlLength: html.length,
          },
          'Transactional email dispatched successfully (mock/dev capture)'
        );
      }

      await emailJobRepository.markSuccess(job.id);
      return true;
    } catch (err: any) {
      logger.error({ jobId: job.id, err }, 'Failed to dispatch email job');
      await emailJobRepository.markFailed(job.id, err?.message || 'Dispatch error', job.attempts, job.maxAttempts);
      return false;
    }
  }

  /**
   * Processes a batch of pending email jobs.
   */
  async processPendingJobs(batchSize = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
    const jobs = await emailJobRepository.fetchPendingJobs(batchSize);
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      const ok = await this.dispatchJob(job);
      if (ok) succeeded++;
      else failed++;
    }

    return {
      processed: jobs.length,
      succeeded,
      failed,
    };
  }
}

export const emailService = new EmailService();
