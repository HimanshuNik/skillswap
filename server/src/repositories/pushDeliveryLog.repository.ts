import { db } from '../prisma/db.js';

export interface PushDeliveryLogRecord {
  id: number;
  userId: number;
  endpoint: string;
  eventType: string;
  payloadJson: string;
  status: string;
  statusCode: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface CreatePushDeliveryLogInput {
  userId: number;
  endpoint: string;
  eventType: string;
  payloadJson: string;
  status: string; // DELIVERED, FAILED, EXPIRED, SUPPRESSED
  statusCode?: number | null;
  errorMessage?: string | null;
}

export class PushDeliveryLogRepository {
  async create(
    input: CreatePushDeliveryLogInput,
    client: any = db
  ): Promise<PushDeliveryLogRecord> {
    const record = await client.orm.public.PushDeliveryLog.create({
      userId: input.userId,
      endpoint: input.endpoint,
      eventType: input.eventType,
      payloadJson: input.payloadJson,
      status: input.status,
      statusCode: input.statusCode ?? null,
      errorMessage: input.errorMessage ?? null,
    });
    return record as unknown as PushDeliveryLogRecord;
  }

  async findByUserId(
    userId: number,
    limit = 50,
    client: any = db
  ): Promise<PushDeliveryLogRecord[]> {
    const records = await client.orm.public.PushDeliveryLog.where({ userId }).all();
    return (records as unknown as PushDeliveryLogRecord[]).slice(0, limit);
  }
}

export const pushDeliveryLogRepository = new PushDeliveryLogRepository();

