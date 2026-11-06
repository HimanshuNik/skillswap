import { db } from '../../prisma/db.js';

export interface BillingInvoiceRecord {
  id: number;
  userId: number;
  subscriptionId: number | null;
  providerInvoiceId: string | null;
  invoiceNumber: string;
  amountPaidCents: number;
  currency: string;
  status: string; // PAID, OPEN, VOID, UNCOLLECTIBLE
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

export const billingInvoiceRepository = {
  async create(data: {
    userId: number;
    subscriptionId?: number | null;
    providerInvoiceId?: string | null;
    invoiceNumber: string;
    amountPaidCents: number;
    currency?: string;
    status?: string;
    invoicePdfUrl?: string | null;
    hostedInvoiceUrl?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    paidAt?: string | null;
  }): Promise<BillingInvoiceRecord> {
    const record = await db.orm.public.BillingInvoice.create({
      userId: data.userId,
      subscriptionId: data.subscriptionId ?? null,
      providerInvoiceId: data.providerInvoiceId ?? null,
      invoiceNumber: data.invoiceNumber,
      amountPaidCents: data.amountPaidCents,
      currency: data.currency || 'USD',
      status: data.status || 'PAID',
      invoicePdfUrl: data.invoicePdfUrl ?? null,
      hostedInvoiceUrl: data.hostedInvoiceUrl ?? null,
      periodStart: (data.periodStart as any) ?? null,
      periodEnd: (data.periodEnd as any) ?? null,
      paidAt: (data.paidAt as any) ?? null,
    });
    return record as unknown as BillingInvoiceRecord;
  },

  async findByUserId(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ invoices: BillingInvoiceRecord[]; total: number; totalPages: number }> {
    const offset = (Math.max(1, page) - 1) * limit;
    const all = (await db.orm.public.BillingInvoice.where({ userId }).all()) as any[];
    all.sort((a: any, b: any) => b.id - a.id);

    const total = all.length;
    const paginated = all.slice(offset, offset + limit);


    return {
      invoices: paginated as unknown as BillingInvoiceRecord[],
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async findById(id: number): Promise<BillingInvoiceRecord | null> {
    const record = await db.orm.public.BillingInvoice.where({ id }).first();
    return record ? (record as unknown as BillingInvoiceRecord) : null;
  },

  async findByProviderInvoiceId(invoiceId: string): Promise<BillingInvoiceRecord | null> {
    const record = await db.orm.public.BillingInvoice.where({ providerInvoiceId: invoiceId }).first();
    return record ? (record as unknown as BillingInvoiceRecord) : null;
  },
};
