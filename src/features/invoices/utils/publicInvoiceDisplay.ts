import type { InvoicePaymentSchedule, PublicInvoiceResponse } from "../../../utils/types";

export const PUBLIC_INVOICE_HERO_IMAGE = "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/banner.jpg";

export const formatInvoiceMoney = (value: number, currency = "CAD") => {
  const amount = (value || 0) / 100;

  if (currency === "CAD") {
    return `CA$${amount.toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount);
};

export const formatInvoiceDate = (value: string | null) => {
  if (!value) return "To be confirmed";

  const [year, month, day] = value.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const statusLabel = (value: string) => {
  if (value === "awaiting_verification") return "Awaiting confirmation";
  if (value === "payment_sent") return "Payment sent";

  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getScheduleDisplayName = (_schedule: InvoicePaymentSchedule, index: number, total: number) => `${index + 1} of ${total}`;

export const isScheduleSelectableForPayment = (schedule: InvoicePaymentSchedule) =>
  schedule.remaining_amount_cents > 0 && schedule.status !== "paid" && schedule.status !== "awaiting_verification";

export const getPayableSchedules = (detail: PublicInvoiceResponse) => {
  if (detail.invoice.status === "void" || detail.invoice.status === "paid" || detail.invoice.amount_due_cents <= 0) {
    return [];
  }

  return detail.schedules.filter(isScheduleSelectableForPayment);
};

export const canPayInvoice = (detail: PublicInvoiceResponse) => getPayableSchedules(detail).length > 0;

export const getScheduleBadgeClass = (status: InvoicePaymentSchedule["status"]) => {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "awaiting_verification":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "past_due":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "due":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-100";
  }
};

export const getInvoiceStatusBadgeClass = (status: PublicInvoiceResponse["invoice"]["status"]) => {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "void":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "past_due":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "payment_sent":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-100";
  }
};
