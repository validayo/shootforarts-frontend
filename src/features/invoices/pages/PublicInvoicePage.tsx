import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Printer } from "lucide-react";

import SEO from "../../../components/seo/SEO";
import { PRIVATE_INVOICE_ROBOTS } from "../../../config/routes";
import { getPublicInvoice } from "../../../lib/api/services";
import type { PublicInvoiceResponse } from "../../../utils/types";
import { downloadInvoicePdf, printInvoice } from "../utils/invoicePdf";
import {
  PUBLIC_INVOICE_HERO_IMAGE,
  canPayInvoice,
  formatInvoiceDate,
  formatInvoiceMoney,
  getInvoiceStatusBadgeClass,
  getScheduleBadgeClass,
  getScheduleDisplayName,
  statusLabel,
} from "../utils/publicInvoiceDisplay";

const PRIVATE_INVOICE_SEO = {
  title: "Private Invoice | Shoot For Arts",
  description: "Private Shoot For Arts invoice page.",
};

const PublicInvoicePage: React.FC = () => {
  const { token = "" } = useParams();
  const [detail, setDetail] = useState<PublicInvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);
    getPublicInvoice(token)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const startPrint = () => {
    if (!detail) return;
    setPrintError(null);

    try {
      printInvoice(detail);
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8edea] text-slate-700">
        <SEO {...PRIVATE_INVOICE_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />
        Loading invoice...
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8edea] px-4">
        <SEO {...PRIVATE_INVOICE_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />
        <section className="max-w-md rounded-[2rem] border border-white/70 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Shoot For Arts</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Invoice unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error ?? "This invoice link could not be opened."}</p>
        </section>
      </main>
    );
  }

  const { invoice } = detail;
  const canPay = canPayInvoice(detail);
  const invoiceStatusClass = getInvoiceStatusBadgeClass(invoice.status);

  return (
    <main className="min-h-screen bg-[#e8edea] pb-20 text-slate-950">
      <SEO {...PRIVATE_INVOICE_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />

      <section className="relative min-h-[210px] overflow-hidden bg-slate-900 px-6 py-16 text-white sm:min-h-[260px]">
        <img src={PUBLIC_INVOICE_HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-slate-950/35" />
      </section>

      <div className="mx-auto -mt-28 max-w-3xl px-4 sm:px-6">
        {printError && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{printError}</div>}

        <section className="relative rounded-none border border-white/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-medium tracking-tight">Invoice {invoice.invoice_number}</h2>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ${invoiceStatusClass}`}>
                {statusLabel(invoice.status)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={startPrint}
                aria-label="Print invoice"
                className="inline-flex items-center text-slate-600 transition hover:text-slate-950"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => downloadInvoicePdf(detail)}
                aria-label="Download invoice PDF"
                className="inline-flex items-center text-slate-600 transition hover:text-slate-950"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">From</p>
              <p className="mt-3">Shoot For Arts</p>
              {invoice.show_business_billing_address && invoice.business_billing_address_snapshot && (
                <p className="mt-1 whitespace-pre-line text-slate-500">{invoice.business_billing_address_snapshot}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">To</p>
              <p className="mt-3">{invoice.client_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Issue date</p>
              <p className="mt-3">{formatInvoiceDate(invoice.issue_date)}</p>
            </div>
          </div>

          {canPay ? (
            <Link
              to={`/invoice/${encodeURIComponent(token)}/pay`}
              className="mt-10 inline-flex w-full items-center justify-center bg-[#8aa19a] px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#748c85]"
            >
              Pay now
            </Link>
          ) : (
            <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600">
              {invoice.status === "void" ? "This invoice was cancelled and is no longer payable." : "This invoice is not currently payable."}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-none border border-white/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <h2 className="text-xl font-medium">Items</h2>
          <div className="mt-8">
            <div className="invoice-item-grid hidden border-b border-slate-200 pb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:grid sm:grid-cols-[minmax(0,1fr)_64px_112px_112px] sm:gap-6">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-100">
              {detail.lineItems.map((item) => (
                <div key={item.id ?? item.name} className="invoice-item-grid grid gap-4 py-5 text-sm sm:grid-cols-[minmax(0,1fr)_64px_112px_112px] sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="mt-2 max-w-prose whitespace-pre-line break-words text-sm leading-6 text-slate-500">{item.description}</p>
                    )}
                  </div>
                  <div className="flex justify-between gap-4 sm:block sm:text-center">
                    <span className="font-semibold uppercase tracking-[0.14em] text-slate-400 sm:hidden">Qty</span>
                    <span>{item.quantity}</span>
                  </div>
                  <div className="flex justify-between gap-4 sm:block sm:text-right">
                    <span className="font-semibold uppercase tracking-[0.14em] text-slate-400 sm:hidden">Price</span>
                    <span>{formatInvoiceMoney(item.unit_price_cents, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between gap-4 sm:block sm:text-right">
                    <span className="font-semibold uppercase tracking-[0.14em] text-slate-400 sm:hidden">Amount</span>
                    <span>{formatInvoiceMoney(item.line_total_cents ?? item.quantity * item.unit_price_cents, invoice.currency)}</span>
                    {!invoice.tax_enabled && <span className="mt-1 block text-xs text-slate-500">No tax</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 ml-auto max-w-sm space-y-3 text-sm">
            {invoice.tax_enabled && (
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatInvoiceMoney(invoice.subtotal_cents, invoice.currency)}</span>
              </div>
            )}
            {invoice.tax_enabled && (
              <div className="flex justify-between">
                <span className="text-slate-500">{invoice.tax_label ?? "Tax"}</span>
                <span>{formatInvoiceMoney(invoice.tax_cents, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-4">
              <span>Total</span>
              <span>{formatInvoiceMoney(invoice.total_cents, invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-4 text-base font-medium">
              <span>Amount Due</span>
              <span>{formatInvoiceMoney(invoice.amount_due_cents, invoice.currency)}</span>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-none border border-white/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <h2 className="text-xl font-medium">Payment Schedule</h2>
          <div className="mt-8 hidden border-b border-slate-200 pb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:grid sm:grid-cols-[1fr_130px_150px_150px]">
            <span>Payment</span>
            <span>Amount</span>
            <span>Due</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {detail.schedules.map((schedule, index) => (
              <div key={schedule.id} className="grid gap-3 py-5 text-sm sm:grid-cols-[1fr_130px_150px_150px] sm:items-center">
                <div>
                  <p className="font-medium">{getScheduleDisplayName(schedule, index, detail.schedules.length)}</p>
                </div>
                <p>{formatInvoiceMoney(schedule.amount_cents, invoice.currency)}</p>
                <p className="text-slate-500">{formatInvoiceDate(schedule.due_date)}</p>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ${getScheduleBadgeClass(schedule.status)}`}
                >
                  {statusLabel(schedule.status)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PublicInvoicePage;
