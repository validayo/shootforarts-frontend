import type { AdminInvoiceDetailResponse, PublicInvoiceResponse } from "../../../utils/types";
import { formatInvoiceDate, formatInvoiceMoney } from "./publicInvoiceDisplay";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const descriptionHtml = (value: string) => {
  const parts = value
    .split(/\s+\|\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return escapeHtml(value);

  return parts.map((part) => `&bull; ${escapeHtml(part)}`).join("<br />");
};

const addressHtml = (value: string) => escapeHtml(value).replace(/\n/g, "<br />");

const senderContactHtml = (invoice: AdminInvoiceDetailResponse["invoice"] | PublicInvoiceResponse["invoice"]) =>
  [
    invoice.show_business_billing_address && invoice.business_billing_address_snapshot ? addressHtml(invoice.business_billing_address_snapshot) : "",
    invoice.business_contact_email_snapshot ? escapeHtml(invoice.business_contact_email_snapshot) : "",
    invoice.business_contact_phone_snapshot ? escapeHtml(invoice.business_contact_phone_snapshot) : "",
  ]
    .filter(Boolean)
    .join("<br />");

const senderContactText = (invoice: AdminInvoiceDetailResponse["invoice"] | PublicInvoiceResponse["invoice"]) =>
  [
    invoice.show_business_billing_address && invoice.business_billing_address_snapshot ? invoice.business_billing_address_snapshot.replace(/\n/g, ", ") : "",
    invoice.business_contact_email_snapshot ?? "",
    invoice.business_contact_phone_snapshot ?? "",
  ]
    .filter(Boolean)
    .join(", ");

export function buildPrintableInvoiceHtml(detail: AdminInvoiceDetailResponse | PublicInvoiceResponse): string {
  const invoice = detail.invoice;
  const rows = detail.lineItems
    .map(
      (item) => `
      <tr>
        <td class="item">${escapeHtml(item.name)}${item.description ? `<br /><span>${descriptionHtml(item.description)}</span>` : ""}</td>
        <td>${item.quantity}</td>
        <td>${formatInvoiceMoney(item.unit_price_cents, invoice.currency)}</td>
        <td>${formatInvoiceMoney(item.line_total_cents ?? item.quantity * item.unit_price_cents, invoice.currency)}${invoice.tax_enabled ? "" : `<br /><span>No tax</span>`}</td>
      </tr>
    `,
    )
    .join("");
  const schedules = detail.schedules
    .map(
      (schedule, index) => `
      <tr>
        <td>${index + 1} of ${detail.schedules.length}</td>
        <td>${formatInvoiceMoney(schedule.amount_cents, invoice.currency)}</td>
        <td>${escapeHtml(formatInvoiceDate(schedule.due_date))}</td>
      </tr>
    `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
    <style>
      @page { size: letter; margin: .65in; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111827; font-family: Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.45; }
      main { max-width: 720px; margin: 0 auto; padding-top: 10px; }
      .top { display: grid; grid-template-columns: 1fr 220px; gap: 48px; align-items: start; }
      .brand { font-size: 18px; font-weight: 400; letter-spacing: .01em; text-transform: uppercase; }
      h1 { margin: 4px 0 0; color: #8f959b; font-size: 18px; font-weight: 400; letter-spacing: .02em; text-transform: uppercase; }
      h2 { margin: 58px 0 22px; font-size: 14px; font-weight: 400; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; color: #9aa1a8; }
      .meta span:nth-child(even) { color: #111827; text-align: right; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 88px; margin: 42px 0 48px; }
      .label { margin-bottom: 14px; color: #9aa1a8; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th { border-bottom: 1px solid #dde1e5; color: #9aa1a8; font-weight: 400; padding: 0 0 12px; text-align: left; }
      td { border-bottom: 1px solid #e5e8eb; padding: 15px 0; vertical-align: top; }
      th:nth-child(2), td:nth-child(2) { text-align: center; width: 10%; }
      th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4) { text-align: right; width: 16%; }
      .item { width: 58%; padding-right: 26px; }
      .item span, td span { display: block; margin-top: 6px; color: #111827; font-size: 10px; line-height: 1.45; }
      .totals { margin: 24px 0 0 auto; width: 280px; }
      .totals div { display: flex; justify-content: space-between; padding: 14px 0; }
      .totals div + div { border-top: 1px solid #e5e8eb; }
      .totals span:first-child { color: #9aa1a8; }
      .schedule th:nth-child(1), .schedule td:nth-child(1) { width: 25%; text-align: left; }
      .schedule th:nth-child(2), .schedule td:nth-child(2) { width: 25%; text-align: left; }
      .schedule th:nth-child(3), .schedule td:nth-child(3) { width: 50%; text-align: left; }
    </style>
  </head>
  <body>
    <main>
      <section class="top">
        <div>
          <div class="brand">Shoot For Arts</div>
          <h1>Invoice</h1>
        </div>
        <div class="meta">
          <span>Invoice number</span><span>${escapeHtml(invoice.invoice_number)}</span>
          <span>Invoice date</span><span>${escapeHtml(formatInvoiceDate(invoice.issue_date))}</span>
        </div>
      </section>
      <section class="parties">
        <div><div class="label">From</div>Shoot For Arts${senderContactHtml(invoice) ? `<br />${senderContactHtml(invoice)}` : ""}</div>
        <div><div class="label">To</div>${escapeHtml(invoice.client_name)}${invoice.client_address ? `<br />${addressHtml(invoice.client_address)}` : ""}${invoice.client_email ? `<br /><br />${escapeHtml(invoice.client_email)}` : ""}</div>
      </section>
      <table><thead><tr><th class="item">Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <section class="totals">
        ${invoice.tax_enabled ? `<div><span>Subtotal</span><span>${formatInvoiceMoney(invoice.subtotal_cents, invoice.currency)}</span></div><div><span>${escapeHtml(invoice.tax_label ?? "Tax")}</span><span>${formatInvoiceMoney(invoice.tax_cents, invoice.currency)}</span></div>` : ""}
        <div><span>Total</span><span>${formatInvoiceMoney(invoice.total_cents, invoice.currency)}</span></div>
        <div><span>Amount Due</span><span>${formatInvoiceMoney(invoice.amount_due_cents, invoice.currency)}</span></div>
      </section>
      <h2>Payment Schedule</h2>
      <table class="schedule"><thead><tr><th>Payment</th><th>Amount</th><th>Due</th></tr></thead><tbody>${schedules}</tbody></table>
    </main>
  </body>
</html>`;
}

const pdfEscape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const sanitizeFilenamePart = (value: string) =>
  value
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

function buildSimpleInvoicePdf(detail: AdminInvoiceDetailResponse | PublicInvoiceResponse): Blob {
  const invoice = detail.invoice;
  const lines = [
    "SHOOT FOR ARTS",
    "INVOICE",
    "",
    `Invoice number: ${invoice.invoice_number}`,
    `Invoice date: ${formatInvoiceDate(invoice.issue_date)}`,
    "",
    `From: Shoot For Arts${senderContactText(invoice) ? `, ${senderContactText(invoice)}` : ""}`,
    `To: ${invoice.client_name}${invoice.client_address ? `, ${invoice.client_address.replace(/\n/g, ", ")}` : ""}${invoice.client_email ? `, ${invoice.client_email}` : ""}`,
    "",
    "Items",
    ...detail.lineItems.flatMap((item) => [
      `${item.name} | Qty ${item.quantity} | ${formatInvoiceMoney(item.unit_price_cents, invoice.currency)} | ${formatInvoiceMoney(item.line_total_cents ?? item.quantity * item.unit_price_cents, invoice.currency)}`,
      item.description ? `  ${item.description}` : "",
    ]),
    "",
    invoice.tax_enabled ? `Subtotal: ${formatInvoiceMoney(invoice.subtotal_cents, invoice.currency)}` : "",
    invoice.tax_enabled ? `${invoice.tax_label ?? "Tax"}: ${formatInvoiceMoney(invoice.tax_cents, invoice.currency)}` : "",
    `Total: ${formatInvoiceMoney(invoice.total_cents, invoice.currency)}`,
    `Amount Due: ${formatInvoiceMoney(invoice.amount_due_cents, invoice.currency)}`,
    "",
    "Payment Schedule",
    ...detail.schedules.map(
      (schedule, index) =>
        `${index + 1} of ${detail.schedules.length} | ${formatInvoiceMoney(schedule.amount_cents, invoice.currency)} | ${formatInvoiceDate(schedule.due_date)}`,
    ),
  ].filter(Boolean);

  const escapedLines = lines
    .map((line, index) => `BT /F1 ${index < 2 ? 18 : 10} Tf 72 ${740 - index * 18} Td (${pdfEscape(line).slice(0, 105)}) Tj ET`)
    .join("\n");
  const stream = `${escapedLines}\n`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function invoicePdfFilename(detail: AdminInvoiceDetailResponse | PublicInvoiceResponse): string {
  return `Shoot-For-Arts-Invoice-${sanitizeFilenamePart(detail.invoice.invoice_number)}.pdf`;
}

export function downloadInvoicePdf(detail: AdminInvoiceDetailResponse | PublicInvoiceResponse): void {
  const blob = buildSimpleInvoicePdf(detail);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = invoicePdfFilename(detail);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function printInvoice(detail: AdminInvoiceDetailResponse | PublicInvoiceResponse): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("Unable to start invoice printing in this browser.");
  }

  frameDocument.open();
  frameDocument.write(buildPrintableInvoiceHtml(detail));
  frameDocument.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 250);
  };

  frameWindow.onafterprint = cleanup;
  frameWindow.focus();
  frameWindow.print();
  window.setTimeout(() => iframe.remove(), 60_000);
}
