import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PublicInvoicePage from "../pages/PublicInvoicePage";
import PublicInvoicePaymentPage from "../pages/PublicInvoicePaymentPage";
import type { PublicInvoiceResponse } from "../../../utils/types";

const getPublicInvoice = vi.fn();
const notifyPublicInvoicePayment = vi.fn();
const printInvoice = vi.fn();
const downloadInvoicePdf = vi.fn();

vi.mock("../../../components/seo/SEO", () => ({
  default: () => null,
}));

vi.mock("../../../lib/api/services", () => ({
  getPublicInvoice: (...args: unknown[]) => getPublicInvoice(...args),
  notifyPublicInvoicePayment: (...args: unknown[]) => notifyPublicInvoicePayment(...args),
}));

vi.mock("../utils/invoicePdf", () => ({
  downloadInvoicePdf: (...args: unknown[]) => downloadInvoicePdf(...args),
  printInvoice: (...args: unknown[]) => printInvoice(...args),
}));

const invoiceDetail = (overrides: Partial<PublicInvoiceResponse> = {}): PublicInvoiceResponse => ({
  ok: true,
  invoice: {
    id: "invoice-1",
    invoice_number: "SFA-2026-0005",
    status: "sent",
    client_name: "Cam Client",
    client_email: "cam@example.com",
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
    payment_instructions_snapshot: "THEN\n\nSend receipt proof after sending payment.",
    etransfer_destination_snapshot: "payments@shootforarts.example",
    business_contact_email_snapshot: null,
    business_contact_phone_snapshot: null,
  },
  lineItems: [{
    id: "line-1",
    invoice_id: "invoice-1",
    item_type: "service_tier",
    name: "Portraits - Tier 1 Solo Shoot",
    description: "8 edited photos",
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
      status: "due",
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
  ...overrides,
});

const renderInvoiceRoutes = (initialPath = "/invoice/token") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/invoice/:token" element={<PublicInvoicePage />} />
        <Route path="/invoice/:token/pay" element={<PublicInvoicePaymentPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Public invoice experience", () => {
  beforeEach(() => {
    getPublicInvoice.mockReset();
    notifyPublicInvoicePayment.mockReset();
    printInvoice.mockReset();
    downloadInvoicePdf.mockReset();
    getPublicInvoice.mockResolvedValue(invoiceDetail());
    notifyPublicInvoicePayment.mockResolvedValue({ ok: true });
  });

  it("renders /invoice/:token as an invoice view without the payment notification form", async () => {
    const { container } = renderInvoiceRoutes();

    expect(await screen.findByRole("heading", { name: "Invoice SFA-2026-0005" })).toBeInTheDocument();
    expect(screen.getByText("Portraits - Tier 1 Solo Shoot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download invoice pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pay now/i })).toHaveAttribute("href", "/invoice/token/pay");
    expect(screen.queryByRole("button", { name: /notify shoot for arts/i })).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("lg:grid-cols-[1fr_360px]");
  });

  it("keeps paid invoices publicly viewable without a Pay Now action", async () => {
    getPublicInvoice.mockResolvedValue(invoiceDetail({
      invoice: {
        ...invoiceDetail().invoice,
        status: "paid",
        amount_paid_cents: 16950,
        amount_due_cents: 0,
      },
      schedules: invoiceDetail().schedules.map((schedule) => ({
        ...schedule,
        status: "paid",
        amount_paid_cents: schedule.amount_cents,
        remaining_amount_cents: 0,
      })),
    }));

    renderInvoiceRoutes();

    expect(await screen.findByRole("heading", { name: "Invoice SFA-2026-0005" })).toBeInTheDocument();
    expect(screen.getByText("Portraits - Tier 1 Solo Shoot")).toBeInTheDocument();
    expect(screen.getByText("This invoice is not currently payable.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pay now/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
  });

  it("renders the snapshotted business billing address only when enabled", async () => {
    getPublicInvoice.mockResolvedValue(invoiceDetail({
      invoice: {
        ...invoiceDetail().invoice,
        show_business_billing_address: true,
        business_billing_address_snapshot: "Shoot For Arts Studio\nToronto, ON",
      },
    }));

    const { unmount } = renderInvoiceRoutes();

    await screen.findByRole("heading", { name: "Invoice SFA-2026-0005" });
    expect(screen.getByText((_, element) => element?.textContent === "Shoot For Arts Studio\nToronto, ON")).toBeInTheDocument();
    unmount();

    getPublicInvoice.mockResolvedValue(invoiceDetail({
      invoice: {
        ...invoiceDetail().invoice,
        show_business_billing_address: false,
        business_billing_address_snapshot: "Shoot For Arts Studio\nToronto, ON",
      },
    }));

    renderInvoiceRoutes();

    expect(await screen.findByRole("heading", { name: "Invoice SFA-2026-0005" })).toBeInTheDocument();
    expect(screen.queryByText("Shoot For Arts Studio")).not.toBeInTheDocument();
  });

  it("keeps item, quantity, price, and amount in distinct responsive columns", async () => {
    const { container } = renderInvoiceRoutes();

    expect(await screen.findByText("8 edited photos")).toBeInTheDocument();
    expect(container.querySelectorAll(".invoice-item-grid").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Price").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Amount").length).toBeGreaterThan(0);
  });

  it("downloads the invoice PDF from the public invoice page", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes();

    await user.click(await screen.findByRole("button", { name: /download invoice pdf/i }));

    expect(downloadInvoicePdf).toHaveBeenCalledWith(expect.objectContaining({
      invoice: expect.objectContaining({ invoice_number: "SFA-2026-0005" }),
    }));
  });

  it("navigates from Pay Now to /invoice/:token/pay", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes();

    await user.click(await screen.findByRole("link", { name: /pay now/i }));

    expect(await screen.findByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    await waitFor(() => expect(getPublicInvoice).toHaveBeenCalledWith("token"));
  });

  it("keeps the first unpaid payment selected and toggles the second payment into the total", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pay ca\$84.75/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /2 of 2/i }));
    expect(screen.getByRole("button", { name: /pay ca\$169.50/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /2 of 2/i }));
    expect(screen.getByRole("button", { name: /pay ca\$84.75/i })).toBeInTheDocument();
  });

  it("carries both selected payments into the method step", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /2 of 2/i }));
    await user.click(screen.getByRole("button", { name: /pay ca\$169.50/i }));

    expect(await screen.findByRole("heading", { name: /how would you like to pay/i })).toBeInTheDocument();
    expect(screen.getByText("Payment amount: CA$169.50")).toBeInTheDocument();
    expect(screen.queryByText("1 of 2, 2 of 2")).not.toBeInTheDocument();
  });

  it("returns to payment amount selection from the edit pencil without reloading", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /2 of 2/i }));
    await user.click(screen.getByRole("button", { name: /pay ca\$169.50/i }));
    await user.click(await screen.findByRole("button", { name: /edit payment amount/i }));

    expect(screen.getByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    expect(getPublicInvoice).toHaveBeenCalledTimes(1);
  });

  it("resets to only the first unpaid payment when its card is clicked", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /2 of 2/i }));
    expect(screen.getByRole("button", { name: /pay ca\$169.50/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /1 of 2/i }));
    await user.click(screen.getByRole("button", { name: /pay ca\$84.75/i }));

    expect(await screen.findByRole("heading", { name: /how would you like to pay/i })).toBeInTheDocument();
    expect(screen.getByText("Payment amount: CA$84.75")).toBeInTheDocument();
    expect(screen.queryByText("1 of 2")).not.toBeInTheDocument();
  });

  it("renders custom Interac e-Transfer instructions without generated duplicate copy", async () => {
    const user = userEvent.setup();
    renderInvoiceRoutes("/invoice/token/pay");

    await user.click(await screen.findByRole("button", { name: /pay ca\$84.75/i }));
    await user.click(screen.getByRole("button", { name: /interac e-transfer/i }));

    expect(await screen.findByText(/send receipt proof after sending payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/send your e-transfer to payments@shootforarts\.example/i)).not.toBeInTheDocument();
  });

  it("submits Notify Shoot For Arts for the selected schedule and shows confirmation", async () => {
    const user = userEvent.setup();
    getPublicInvoice
      .mockResolvedValueOnce(invoiceDetail())
      .mockResolvedValueOnce(invoiceDetail({
        invoice: {
          ...invoiceDetail().invoice,
          status: "payment_sent",
        },
        schedules: invoiceDetail().schedules.map((schedule) => ({
          ...schedule,
          status: "awaiting_verification",
        })),
      }));
    renderInvoiceRoutes("/invoice/token/pay");

    await user.click(await screen.findByRole("button", { name: /pay ca\$84.75/i }));
    await user.click(screen.getByRole("button", { name: /interac e-transfer/i }));
    await user.click(screen.getByRole("button", { name: /notify shoot for arts/i }));

    await waitFor(() => expect(notifyPublicInvoicePayment).toHaveBeenCalledTimes(1));
    expect(notifyPublicInvoicePayment).toHaveBeenCalledWith(expect.objectContaining({
      token: "token",
      scheduleId: "schedule-1",
      clientName: "Cam Client",
      proof: null,
    }));
    expect(await screen.findByRole("heading", { name: /payment notification sent/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /this invoice cannot be paid/i })).not.toBeInTheDocument();
  });

  it("shows an error and stays on the notify form when payment notification fails", async () => {
    const user = userEvent.setup();
    notifyPublicInvoicePayment.mockRejectedValueOnce(new Error("Could not notify Shoot For Arts."));
    renderInvoiceRoutes("/invoice/token/pay");

    await user.click(await screen.findByRole("button", { name: /pay ca\$84.75/i }));
    await user.click(screen.getByRole("button", { name: /interac e-transfer/i }));
    await user.click(screen.getByRole("button", { name: /notify shoot for arts/i }));

    await waitFor(() => expect(notifyPublicInvoicePayment).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Could not notify Shoot For Arts.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notify shoot for arts/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /payment notification sent/i })).not.toBeInTheDocument();
  });

  it("does not offer already-paid schedules in the payment chooser", async () => {
    getPublicInvoice.mockResolvedValue(invoiceDetail({
      schedules: [
        {
          id: "schedule-1",
          invoice_id: "invoice-1",
          label: "Deposit",
          due_date: "2026-08-19",
          amount_cents: 8475,
          amount_paid_cents: 8475,
          remaining_amount_cents: 0,
          status: "paid",
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
    }));

    const user = userEvent.setup();
    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /how would you like to pay/i })).toBeInTheDocument();
    expect(screen.getByText("Payment amount: CA$84.75")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit payment amount/i }));

    expect(await screen.findByRole("heading", { name: /choose your payment amount/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /1 of 2/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 of 2/i })).toBeInTheDocument();
  });

  it("blocks void and fully paid invoices from the pay flow", async () => {
    getPublicInvoice.mockResolvedValueOnce(invoiceDetail({
      invoice: {
        ...invoiceDetail().invoice,
        status: "void",
      },
      schedules: [],
    }));

    const { unmount } = renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /this invoice cannot be paid/i })).toBeInTheDocument();
    expect(screen.getByText(/cancelled and is no longer payable/i)).toBeInTheDocument();
    unmount();

    getPublicInvoice.mockResolvedValueOnce(invoiceDetail({
      invoice: {
        ...invoiceDetail().invoice,
        status: "paid",
        amount_paid_cents: 16950,
        amount_due_cents: 0,
      },
      schedules: [{
        ...invoiceDetail().schedules[0],
        status: "paid",
        amount_paid_cents: 8475,
        remaining_amount_cents: 0,
      }],
    }));

    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("heading", { name: /this invoice cannot be paid/i })).toBeInTheDocument();
    expect(screen.getByText(/already paid or is awaiting payment verification/i)).toBeInTheDocument();
  });

  it("shows back-to-invoice navigation on the pay route", async () => {
    renderInvoiceRoutes("/invoice/token/pay");

    expect(await screen.findByRole("link", { name: /invoice sfa-2026-0005/i })).toHaveAttribute("href", "/invoice/token");
  });
});
