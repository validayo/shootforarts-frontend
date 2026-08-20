import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Pencil } from "lucide-react";

import SEO from "../../../components/seo/SEO";
import { PRIVATE_INVOICE_ROBOTS } from "../../../config/routes";
import { getPublicInvoice, notifyPublicInvoicePayment } from "../../../lib/api/services";
import type { InvoicePaymentSchedule, PublicInvoiceResponse } from "../../../utils/types";
import {
  canPayInvoice,
  formatInvoiceDate,
  formatInvoiceMoney,
  getPayableSchedules,
  getScheduleDisplayName,
} from "../utils/publicInvoiceDisplay";

type PaymentStep = "amount" | "method" | "instructions" | "confirmation";

const getInitialStep = (schedules: InvoicePaymentSchedule[]): PaymentStep => (schedules.length > 1 ? "amount" : "method");
const PRIVATE_PAYMENT_SEO = {
  title: "Private Invoice Payment | Shoot For Arts",
  description: "Private Shoot For Arts invoice payment page.",
};
const createIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `invoice-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const sumRemainingCents = (schedules: InvoicePaymentSchedule[]) =>
  schedules.reduce((sum, schedule) => sum + schedule.remaining_amount_cents, 0);

const afterFrame = (callback: () => void) => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }
  window.setTimeout(callback, 0);
};

const scrollToPaymentStep = (target: HTMLElement) => {
  const top = window.scrollY + target.getBoundingClientRect().top - 150;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
};

const compressProofImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    if (typeof Image === "undefined" || typeof URL.createObjectURL !== "function") {
      resolve(file);
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);

      const maxDimension = 1000;
      const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(file);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
          resolve(compressed.size < file.size ? compressed : file);
        },
        "image/jpeg",
        0.45,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Payment proof image could not be prepared."));
    };
    image.src = url;
  });

const PublicInvoicePaymentPage: React.FC = () => {
  const { token = "" } = useParams();
  const [detail, setDetail] = useState<PublicInvoiceResponse | null>(null);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [step, setStep] = useState<PaymentStep>("method");
  const [clientName, setClientName] = useState("");
  const [message, setMessage] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const stepAnchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);
    getPublicInvoice(token)
      .then((response) => {
        const payableSchedules = getPayableSchedules(response);

        setDetail(response);
        setClientName(response.invoice.client_name);
        setSelectedScheduleIds(payableSchedules[0] ? [payableSchedules[0].id] : []);
        setStep(getInitialStep(payableSchedules));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const payableSchedules = useMemo(() => (detail ? getPayableSchedules(detail) : []), [detail]);
  const requiredSchedule = payableSchedules[0] ?? null;
  const selectedScheduleIdSet = useMemo(() => new Set(selectedScheduleIds), [selectedScheduleIds]);
  const selectedSchedules = useMemo(() => {
    const selected = payableSchedules.filter((schedule) => selectedScheduleIdSet.has(schedule.id));
    return selected.length > 0 ? selected : payableSchedules.slice(0, 1);
  }, [payableSchedules, selectedScheduleIdSet]);
  const selectedAmountCents = sumRemainingCents(selectedSchedules);

  useEffect(() => {
    if (loading || step === "amount" || step === "confirmation") return;
    const target = stepAnchorRef.current;
    if (!target) return;

    afterFrame(() => {
      try {
        scrollToPaymentStep(target);
      } catch {
        if (typeof target.scrollIntoView === "function") {
          target.scrollIntoView({ block: "start" });
        }
      }
    });
  }, [loading, step]);

  const toggleSchedule = (scheduleId: string) => {
    if (scheduleId === requiredSchedule?.id) {
      setSelectedScheduleIds([scheduleId]);
      return;
    }

    setSelectedScheduleIds((current) =>
      current.includes(scheduleId)
        ? current.filter((id) => id !== scheduleId)
        : [...current, scheduleId],
    );
  };

  const editPaymentAmount = () => {
    setStep("amount");
    afterFrame(() => {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        // Some test browsers expose scrollTo but do not implement it.
      }
    });
  };

  const notifyPayment = async () => {
    if (selectedSchedules.length === 0 || !detail) return;

    setSubmitError(null);
    const compressedProof = proof ? await compressProofImage(proof) : null;
    await Promise.all(selectedSchedules.map((schedule) =>
      notifyPublicInvoicePayment({
        token,
        scheduleId: schedule.id,
        idempotencyKey: `${idempotencyKey}:${schedule.id}`,
        clientName,
        message,
        proof: compressedProof,
      }),
    ));

    setStep("confirmation");
    setIdempotencyKey(createIdempotencyKey());
    const refreshed = await getPublicInvoice(token);
    setDetail(refreshed);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8edea] text-slate-700">
        <SEO {...PRIVATE_PAYMENT_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />
        Loading invoice payment...
      </main>
    );
  }

  if (loadError || !detail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#e8edea] px-4">
        <SEO {...PRIVATE_PAYMENT_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />
        <section className="max-w-md rounded-[2rem] border border-white/70 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Shoot For Arts</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Invoice unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{loadError ?? "This invoice link could not be opened."}</p>
        </section>
      </main>
    );
  }

  const { invoice } = detail;
  const invoicePath = `/invoice/${encodeURIComponent(token)}`;
  const canPay = canPayInvoice(detail);

  if (step !== "confirmation" && (!canPay || selectedSchedules.length === 0)) {
    return (
      <main className="min-h-screen bg-[#e8edea] px-5 py-8 text-slate-950">
        <SEO {...PRIVATE_PAYMENT_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />
        <Link to={invoicePath} className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-slate-950">
          &larr; Invoice {invoice.invoice_number}
        </Link>
        <section className="mx-auto mt-24 max-w-lg rounded-none border border-white/80 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <h1 className="text-3xl font-semibold tracking-tight">This invoice cannot be paid</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {invoice.status === "void"
              ? "This invoice was cancelled and is no longer payable."
              : "This invoice is already paid or is awaiting payment verification."}
          </p>
          <Link to={invoicePath} className="mt-8 inline-flex w-full items-center justify-center bg-[#8aa19a] px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#748c85]">
            Back to invoice
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#e8edea] px-5 py-8 text-slate-950">
      <SEO {...PRIVATE_PAYMENT_SEO} robots={PRIVATE_INVOICE_ROBOTS} privatePage />
      <Link to={invoicePath} className="fixed left-5 top-6 z-20 inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-slate-950">
        &larr; Invoice {invoice.invoice_number}
      </Link>

      <div className="mx-auto mt-20 max-w-xl">
        {step !== "amount" && step !== "confirmation" && (
          <section className="min-h-[360px] pt-8 md:min-h-[480px]">
            <h2 className="text-2xl font-semibold tracking-tight">Payment amount</h2>
            <button
              type="button"
              onClick={editPaymentAmount}
              className="mt-5 inline-flex items-center gap-2 text-2xl font-medium text-slate-950 transition hover:text-[#748c85]"
              aria-label="Edit payment amount"
            >
              {formatInvoiceMoney(selectedAmountCents, invoice.currency)}
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        )}

        {step === "amount" && (
          <section>
            <h1 className="text-3xl font-semibold tracking-tight">Choose your payment amount</h1>
            <p className="mt-4 text-sm text-slate-600">Your invoice is split into {payableSchedules.length} unpaid payments.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {payableSchedules.map((schedule) => {
                const scheduleIndex = detail.schedules.findIndex((item) => item.id === schedule.id);
                const selected = selectedScheduleIdSet.has(schedule.id);

                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => toggleSchedule(schedule.id)}
                    aria-pressed={selected}
                    className={`relative min-h-40 border bg-white p-6 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition ${selected ? "border-[#8aa19a] ring-2 ring-[#8aa19a]/30" : "border-white/80 hover:border-[#8aa19a]/60"}`}
                  >
                    {selected && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-[#8aa19a]" />}
                    <p className="text-sm font-semibold">{getScheduleDisplayName(schedule, scheduleIndex, detail.schedules.length)}</p>
                    <p className="mt-5 text-2xl font-semibold">{formatInvoiceMoney(schedule.remaining_amount_cents, invoice.currency)}</p>
                    <p className="mt-4 text-sm text-slate-500">Due {formatInvoiceDate(schedule.due_date)}</p>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setStep("method")}
              className="mt-8 inline-flex w-full items-center justify-center bg-[#8aa19a] px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#748c85]"
            >
              Pay {formatInvoiceMoney(selectedAmountCents, invoice.currency)}
            </button>
          </section>
        )}

        {step === "method" && (
          <section ref={stepAnchorRef} className="pb-[520px] md:pb-[760px]">
            <h1 className="text-3xl font-semibold tracking-tight">How would you like to pay?</h1>
            <div className="mt-8 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold">Payment amount: {formatInvoiceMoney(selectedAmountCents, invoice.currency)}</p>
            </div>
            <div className="mt-5 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <button
                type="button"
                onClick={() => setStep("instructions")}
                className="flex w-full items-center gap-3 border border-slate-200 bg-white p-5 text-left transition hover:border-[#8aa19a]"
              >
                <span className="h-4 w-4 rounded-full border border-slate-950" aria-hidden="true" />
                <span className="text-sm font-semibold">Interac e-Transfer</span>
              </button>
            </div>
          </section>
        )}

        {step === "instructions" && (
          <section ref={stepAnchorRef} className="pb-[240px] md:pb-[320px]">
            <h1 className="text-3xl font-semibold tracking-tight">How would you like to pay?</h1>
            <div className="mt-8 space-y-5 bg-white p-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold">Payment amount: {formatInvoiceMoney(selectedAmountCents, invoice.currency)}</p>
              <div className="border border-slate-200 p-5">
                <p className="text-sm font-semibold">Interac e-Transfer</p>
                <div className="mt-8">
                  <h2 className="text-sm font-semibold">Payment instructions</h2>
                  <div className="mt-4 space-y-4 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                    {invoice.payment_instructions_snapshot ? (
                      <p className="whitespace-pre-line">{invoice.payment_instructions_snapshot}</p>
                    ) : invoice.etransfer_destination_snapshot ? (
                      <p>Send your e-transfer to {invoice.etransfer_destination_snapshot}.</p>
                    ) : (
                      <p>Payment destination has not been configured for this invoice yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <h2 className="text-sm font-semibold">Notify Shoot For Arts</h2>
                  <p className="mt-2 text-sm text-slate-600">Let Shoot For Arts know that your payment is on the way.</p>
                  <div className="mt-5 space-y-3">
                    <input className="w-full border border-slate-200 bg-white px-4 py-3 text-sm" value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Your name" />
                    <textarea rows={Math.max(3, message.split("\n").length)} className="w-full resize-none border border-slate-200 bg-white px-4 py-3 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Enter your message (optional)" />
                    <div className="border border-slate-200 bg-white px-4 py-3 text-sm">
                      <input id="payment-proof-upload" aria-label="Upload payment proof" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProof(event.target.files?.[0] ?? null)} />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="truncate text-slate-500">{proof ? proof.name : "No proof selected"}</span>
                        <label htmlFor="payment-proof-upload" className="cursor-pointer border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-[#8aa19a] hover:text-slate-950">
                          Upload proof
                        </label>
                      </div>
                    </div>
                    {proof && <p className="text-xs text-slate-500">Proof image will be compressed before upload.</p>}
                    {submitError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{submitError}</p>}
                    <button
                      type="button"
                      onClick={() => void notifyPayment().catch((err) => setSubmitError(err instanceof Error ? err.message : String(err)))}
                      className="inline-flex w-full items-center justify-center bg-[#8aa19a] px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#748c85]"
                    >
                      Notify Shoot For Arts
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === "confirmation" && (
          <section className="bg-white p-8 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#8aa19a]" />
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Payment notification sent</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Thank you. Shoot For Arts will verify the e-transfer and update your invoice once confirmed.
            </p>
            <Link to={invoicePath} className="mt-8 inline-flex w-full items-center justify-center bg-[#8aa19a] px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#748c85]">
              Back to invoice
            </Link>
          </section>
        )}
      </div>
    </main>
  );
};

export default PublicInvoicePaymentPage;
