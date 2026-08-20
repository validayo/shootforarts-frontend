import type { InvoicePaymentTermsMode, InvoiceWritePayload } from "../../../../utils/types";
import type { DraftCatalogLineItem } from "./catalogLineItems";

export type InvoiceDraftState = {
  selectedContactId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  taxEnabled: boolean;
  taxLabel: string;
  taxRatePercent: string;
  notes: string;
  showBusinessBillingAddress: boolean;
  items: DraftCatalogLineItem[];
  paymentTermsMode: InvoicePaymentTermsMode;
  depositPercent: string;
  depositDueDate: string;
  balanceDueDate: string;
};

export type DraftPaymentSchedule = {
  label: string;
  amountCents: number;
  dueDate: string | null;
};

export type InvoiceDraftTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  amountDueCents: number;
  schedules: DraftPaymentSchedule[];
};

const today = () => new Date().toISOString().slice(0, 10);

export const centsToMoney = (value: number) => String(((value || 0) / 100).toFixed(2));

export const moneyToCents = (value: string) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
};

export function calculateLineTotalCents(item: Pick<DraftCatalogLineItem, "quantity" | "unitPriceCents">): number {
  const quantity = Number(item.quantity);
  const unitPriceCents = Math.round(Number(item.unitPriceCents));
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPriceCents) || unitPriceCents < 0) return 0;
  return Math.round(quantity * unitPriceCents);
}

export function buildDraftPaymentSchedules(input: {
  totalCents: number;
  paymentTermsMode: InvoicePaymentTermsMode;
  depositPercent: string;
  dueDate: string;
  depositDueDate: string;
  balanceDueDate: string;
}): DraftPaymentSchedule[] {
  const totalCents = Math.max(0, Math.round(input.totalCents));
  if (input.paymentTermsMode !== "deposit_balance") {
    return [{ label: "Full payment", amountCents: totalCents, dueDate: input.dueDate || null }];
  }

  const parsedPercent = Number(input.depositPercent || 50);
  const depositPercent = Number.isFinite(parsedPercent) ? Math.min(99, Math.max(1, parsedPercent)) : 50;
  const depositCents = Math.round(totalCents * depositPercent / 100);

  return [
    { label: "Deposit", amountCents: depositCents, dueDate: input.depositDueDate || null },
    { label: "Remaining balance", amountCents: totalCents - depositCents, dueDate: input.balanceDueDate || input.dueDate || null },
  ];
}

export function calculateInvoiceDraftTotals(state: Pick<
  InvoiceDraftState,
  "items" | "taxEnabled" | "taxRatePercent" | "paymentTermsMode" | "depositPercent" | "dueDate" | "depositDueDate" | "balanceDueDate"
>): InvoiceDraftTotals {
  const subtotalCents = state.items
    .filter((item) => item.name.trim())
    .reduce((sum, item) => sum + calculateLineTotalCents(item), 0);
  const parsedTaxRate = Number(state.taxRatePercent || 0);
  const taxRatePercent = Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0;
  const taxCents = state.taxEnabled ? Math.round(subtotalCents * taxRatePercent / 100) : 0;
  const totalCents = subtotalCents + taxCents;

  return {
    subtotalCents,
    taxCents,
    totalCents,
    amountDueCents: totalCents,
    schedules: buildDraftPaymentSchedules({
      totalCents,
      paymentTermsMode: state.paymentTermsMode,
      depositPercent: state.depositPercent,
      dueDate: state.dueDate,
      depositDueDate: state.depositDueDate,
      balanceDueDate: state.balanceDueDate,
    }),
  };
}

export function invoicePayload(state: InvoiceDraftState): InvoiceWritePayload {
  return {
    contactSubmissionId: state.selectedContactId || null,
    clientName: state.clientName,
    clientEmail: state.clientEmail || null,
    clientPhone: state.clientPhone || null,
    clientAddress: state.clientAddress || null,
    issueDate: state.issueDate,
    dueDate: state.dueDate || null,
    taxEnabled: state.taxEnabled,
    taxLabel: state.taxLabel || null,
    taxRatePercent: state.taxEnabled ? Number(state.taxRatePercent || 0) : null,
    notes: state.notes || null,
    showBusinessBillingAddress: state.showBusinessBillingAddress,
    lineItems: state.items
      .filter((item) => item.name.trim())
      .map((item) => ({
        sourceServiceCatalogTierId: item.sourceServiceCatalogTierId ?? null,
        sourceServiceCatalogAddonId: item.sourceServiceCatalogAddonId ?? null,
        itemType: item.itemType,
        name: item.name,
        description: item.description || null,
        pricingMode: item.pricingMode,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        minimumHours: item.minimumHours ?? null,
      })),
    paymentTerms: {
      mode: state.paymentTermsMode,
      depositPercent: Number(state.depositPercent || 50),
      dueDate: state.dueDate || null,
      depositDueDate: state.depositDueDate || today(),
      balanceDueDate: state.balanceDueDate || state.dueDate || null,
    },
  };
}
