import { db } from '../prisma/db.js';

export interface EmailDeliveryJobRecord {
  id: number;
  recipientEmail: string;
  recipientName: string | null;
  template: string;
  subject: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  scheduledFor: string;
  sentAt: string | null;
  createdAt: string;
}

export class EmailJobRepository {
  async enqueueJob(data: {
    recipientEmail: string;
    recipientName?: string | null;
    template: string;
    subject: string;
    payload: Record<string, any>;
    scheduledFor?: string;
    maxAttempts?: number;
  }): Promise<EmailDeliveryJobRecord> {
    const job = await db.orm.public.EmailDeliveryJob.create({
      recipientEmail: data.recipientEmail.toLowerCase().trim(),
      recipientName: data.recipientName ?? null,
      template: data.template,
      subject: data.subject,
      payload: JSON.stringify(data.payload),
      status: 'PENDING',
      attempts: 0,
      maxAttempts: data.maxAttempts ?? 3,
      lastError: null,
      scheduledFor: data.scheduledFor ?? new Date().toISOString(),
      sentAt: null,
    });

    return job as unknown as EmailDeliveryJobRecord;
  }

  async fetchPendingJobs(limit = 10): Promise<EmailDeliveryJobRecord[]> {
    const nowIso = new Date().toISOString();
    const allPending = (await db.orm.public.EmailDeliveryJob.where({ status: 'PENDING' }).all()) as unknown as EmailDeliveryJobRecord[];

    const ready = allPending
      .filter((j) => new Date(j.scheduledFor).getTime() <= Date.now())
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, limit);

    return ready;
  }

  async markProcessing(id: number): Promise<void> {
    await db.orm.public.EmailDeliveryJob.where({ id }).update({
      status: 'PROCESSING',
    });
  }

  async markSuccess(id: number): Promise<void> {
    await db.orm.public.EmailDeliveryJob.where({ id }).update({
      status: 'SENT',
      sentAt: new Date().toISOString(),
      lastError: null,
    });
  }

  async markFailed(id: number, error: string, currentAttempts: number, maxAttempts: number): Promise<void> {
    const nextAttempts = currentAttempts + 1;
    const isTerminal = nextAttempts >= maxAttempts;

    // Exponential backoff if not terminal: 2^attempts minutes
    const backoffMs = Math.min(60, Math.pow(2, nextAttempts)) * 60 * 1000;
    const nextSchedule = new Date(Date.now() + backoffMs).toISOString();

    await db.orm.public.EmailDeliveryJob.where({ id }).update({
      status: isTerminal ? 'FAILED' : 'PENDING',
      attempts: nextAttempts,
      lastError: error.slice(0, 500),
      scheduledFor: isTerminal ? new Date().toISOString() : nextSchedule,
    });
  }

  async hasDuplicateJob(
    template: string,
    recipientEmail: string,
    keyFragment: string,
    windowHours = 24
  ): Promise<boolean> {
    const jobs = (await db.orm.public.EmailDeliveryJob.where({
      recipientEmail: recipientEmail.toLowerCase().trim(),
      template,
    }).all()) as unknown as EmailDeliveryJobRecord[];

    const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
    return jobs.some(
      (j) =>
        new Date(j.createdAt).getTime() > cutoff &&
        j.payload.includes(keyFragment)
    );
  }

  async getDeliveryStats(): Promise<{
    pending: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    const all = (await db.orm.public.EmailDeliveryJob.all()) as unknown as EmailDeliveryJobRecord[];
    let pending = 0;
    let sent = 0;
    let failed = 0;

    for (const j of all) {
      if (j.status === 'PENDING' || j.status === 'PROCESSING') pending++;
      else if (j.status === 'SENT') sent++;
      else if (j.status === 'FAILED') failed++;
    }

    return {
      pending,
      sent,
      failed,
      total: all.length,
    };
  }

  async findRecent(limit = 20): Promise<EmailDeliveryJobRecord[]> {
    const all = (await db.orm.public.EmailDeliveryJob.all()) as unknown as EmailDeliveryJobRecord[];
    return all
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export const emailJobRepository = new EmailJobRepository();

