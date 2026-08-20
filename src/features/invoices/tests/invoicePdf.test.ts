import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPrintableInvoiceHtml, downloadInvoicePdf, invoicePdfFilename } from "../utils/invoicePdf";
import type { AdminInvoiceDetailResponse } from "../../../utils/types";

const detail: AdminInvoiceDetailResponse = {
  invoice: {
    id: "invoice-1",
    invoice_number: "SFA-2026-0005",
    status: "sent",
    client_name: "Ayo Client",
    client_email: "client@example.com",
    issue_date: "2026-08-19",
    due_date: "2026-09-02",
    currency: "CAD",
    subtotal_cents: 15000,
    tax_enabled: true,
    tax_label: "HST",
    tax_rate_percent: 13,
    tax_cents: 1950,
    total_cents: 16950,
    amount_paid_cents: 0,
    amount_due_cents: 16950,
    notes: "Thanks for booking.",
    show_business_billing_address: false,
    business_billing_address_snapshot: null,
    business_contact_email_snapshot: "billing@example.test",
    business_contact_phone_snapshot: "555-0100",
  },
  lineItems: [{
    id: "line-1",
    invoice_id: "invoice-1",
    item_type: "service_tier",
    name: "Base Photoshoot - Tier 1 Solo Shoot",
    description: "Portrait session",
    pricing_mode: "fixed",
    quantity: 1,
    unit_price_cents: 15000,
    line_total_cents: 15000,
    sort_order: 0,
  }],
  schedules: [
    {
      id: "schedule-1",
      invoice_id: "invoice-1",
      label: "Deposit",
      due_date: "2026-08-19",
      amount_cents: 8475,
      amount_paid_cents: 0,
      remaining_amount_cents: 8475,
      status: "upcoming",
      sort_order: 0,
    },
    {
      id: "schedule-2",
      invoice_id: "invoice-1",
      label: "Remaining balance",
      due_date: "2026-09-02",
      amount_cents: 8475,
      amount_paid_cents: 0,
      remaining_amount_cents: 8475,
      status: "upcoming",
      sort_order: 1,
    },
  ],
  notifications: [],
};

const readBlobText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read blob."));
    reader.readAsText(blob);
  });

describe("invoice PDF/print document", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("contains the current invoice client, items, totals, and payment schedule", () => {
    const html = buildPrintableInvoiceHtml(detail);

    expect(html).toContain("SFA-2026-0005");
    expect(html).toContain("Ayo Client");
    expect(html).toContain("Base Photoshoot - Tier 1 Solo Shoot");
    expect(html).toContain("CA$150.00");
    expect(html).toContain("CA$19.50");
    expect(html).toContain("CA$169.50");
    expect(html).toContain("1 of 2");
    expect(html).toContain("2 of 2");
    expect(html).toContain("billing@example.test");
    expect(html).toContain("555-0100");
    expect(html).not.toContain("Status");
    expect(html).not.toContain("Payment Instructions");
    expect(html).not.toContain("Thanks for booking.");
  });

  it("prints and exports the snapshotted business billing address when enabled", async () => {
    const withAddress: AdminInvoiceDetailResponse = {
      ...detail,
      invoice: {
        ...detail.invoice,
        show_business_billing_address: true,
        business_billing_address_snapshot: "Shoot For Arts Studio\nToronto, ON",
      },
    };

    const html = buildPrintableInvoiceHtml(withAddress);

    expect(html).toContain("Shoot For Arts Studio");
    expect(html).toContain("Toronto, ON");

    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:invoice");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadInvoicePdf(withAddress);

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    await expect(readBlobText(blob)).resolves.toContain("Shoot For Arts Studio, Toronto, ON");
  });

  it("does not render the business billing address when the invoice snapshot is disabled", () => {
    const html = buildPrintableInvoiceHtml({
      ...detail,
      invoice: {
        ...detail.invoice,
        show_business_billing_address: false,
        business_billing_address_snapshot: "Shoot For Arts Studio\nToronto, ON",
      },
    });

    expect(html).not.toContain("Shoot For Arts Studio");
    expect(html).not.toContain("Toronto, ON");
  });

  it("uses human-readable dates in the print template", () => {
    const html = buildPrintableInvoiceHtml(detail);

    expect(html).toContain("August 19, 2026");
    expect(html).toContain("September 2, 2026");
  });

  it("downloads a PDF file using the invoice number filename", () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:invoice");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadInvoicePdf(detail);

    expect(invoicePdfFilename(detail)).toBe("Shoot-For-Arts-Invoice-SFA-2026-0005.pdf");
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download='Shoot-For-Arts-Invoice-SFA-2026-0005.pdf']")).not.toBeInTheDocument();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
  });
});
