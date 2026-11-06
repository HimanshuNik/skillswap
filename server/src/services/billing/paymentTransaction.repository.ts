import { db } from '../../prisma/db.js';

export interface PaymentTransactionRecord {
  id: number;
  userId: number;
  subscriptionId: number | null;
  providerPaymentId: string | null;
  providerInvoiceId: string | null;
  amountCents: number;
  currency: string;
  status: string; // PENDING, SUCCEEDED, FAILED, REFUNDED
  paymentMethod: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export const paymentTransactionRepository = {
  async create(data: {
    userId: number;
    subscriptionId?: number | null;
    providerPaymentId?: string | null;
    providerInvoiceId?: string | null;
    amountCents: number;
    currency?: string;
    status: string;
    paymentMethod?: string | null;
    errorMessage?: string | null;
  }): Promise<PaymentTransactionRecord> {
    const record = await db.orm.public.PaymentTransaction.create({
      userId: data.userId,
      subscriptionId: data.subscriptionId ?? null,
      providerPaymentId: data.providerPaymentId ?? null,
      providerInvoiceId: data.providerInvoiceId ?? null,
      amountCents: data.amountCents,
      currency: data.currency || 'USD',
      status: data.status,
      paymentMethod: data.paymentMethod ?? 'card',
      errorMessage: data.errorMessage ?? null,
    });
    return record as unknown as PaymentTransactionRecord;
  },

  async findByUserId(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ transactions: PaymentTransactionRecord[]; total: number; totalPages: number }> {
    const offset = (Math.max(1, page) - 1) * limit;
    const all = (await db.orm.public.PaymentTransaction.where({ userId }).all()) as any[];
    // Sort descending by id/createdAt
    all.sort((a: any, b: any) => b.id - a.id);

    const total = all.length;
    const paginated = all.slice(offset, offset + limit);

    return {
      transactions: paginated as unknown as PaymentTransactionRecord[],
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async findAll(
    page = 1,
    limit = 20
  ): Promise<{ transactions: any[]; total: number; totalPages: number }> {
    const offset = (Math.max(1, page) - 1) * limit;
    const all = (await db.orm.public.PaymentTransaction.all()) as any[];
    all.sort((a: any, b: any) => b.id - a.id);

    const total = all.length;
    const paginated = all.slice(offset, offset + limit);

    const enriched = await Promise.all(
      paginated.map(async (tx: any) => {
        const user = await db.orm.public.User.where({ id: tx.userId })
          .select('id', 'name', 'email')
          .first();
        return {
          ...tx,
          user: user || { id: tx.userId, name: 'Unknown', email: '' },
        };
      })
    );

    return {
      transactions: enriched,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async getRevenueMetrics(): Promise<{
    totalRevenueCents: number;
    succeededCount: number;
    failedCount: number;
    refundedCount: number;
    failedPaymentRate: number;
  }> {
    const all = (await db.orm.public.PaymentTransaction.all()) as any[];

    let totalRevenueCents = 0;
    let succeededCount = 0;
    let failedCount = 0;
    let refundedCount = 0;

    for (const tx of all) {
      if (tx.status === 'SUCCEEDED') {
        totalRevenueCents += tx.amountCents;
        succeededCount++;
      } else if (tx.status === 'FAILED') {
        failedCount++;
      } else if (tx.status === 'REFUNDED') {
        refundedCount++;
      }
    }

    const totalAttempts = succeededCount + failedCount;
    const failedPaymentRate = totalAttempts > 0 ? (failedCount / totalAttempts) * 100 : 0;

    return {
      totalRevenueCents,
      succeededCount,
      failedCount,
      refundedCount,
      failedPaymentRate: Math.round(failedPaymentRate * 10) / 10,
    };
  },
};
