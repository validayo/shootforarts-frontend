import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AppFeedbackProvider } from "../../../../components/ui/AppFeedback";
import AdminInvoicesPage from "../pages/AdminInvoicesPage";

const confirmAdminInvoicePayment = vi.fn();
const createAdminInvoice = vi.fn();
const deleteAdminInvoice = vi.fn();
const getAdminInvoiceDetail = vi.fn();
const getAdminServiceCatalog = vi.fn();
const getContactSubmissions = vi.fn();
const getInvoiceSettings = vi.fn();
const listAdminInvoices = vi.fn();
const saveAdminInvoice = vi.fn();
const saveInvoiceSettings = vi.fn();
const sendAdminInvoice = vi.fn();
const voidAdminInvoice = vi.fn();

vi.mock("../../shared/components/AdminShellLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../../lib/api/services", () => ({
  confirmAdminInvoicePayment: (...args: unknown[]) => confirmAdminInvoicePayment(...args),
  createAdminInvoice: (...args: unknown[]) => createAdminInvoice(...args),
  deleteAdminInvoice: (...args: unknown[]) => deleteAdminInvoice(...args),
  getAdminInvoiceDetail: (...args: unknown[]) => getAdminInvoiceDetail(...args),
  getAdminServiceCatalog: (...args: unknown[]) => getAdminServiceCatalog(...args),
  getContactSubmissions: (...args: unknown[]) => getContactSubmissions(...args),
  getInvoiceSettings: (...args: unknown[]) => getInvoiceSettings(...args),
  listAdminInvoices: (...args: unknown[]) => listAdminInvoices(...args),
  saveAdminInvoice: (...args: unknown[]) => saveAdminInvoice(...args),
  saveInvoiceSettings: (...args: unknown[]) => saveInvoiceSettings(...args),
  sendAdminInvoice: (...args: unknown[]) => sendAdminInvoice(...args),
  voidAdminInvoice: (...args: unknown[]) => voidAdminInvoice(...args),
}));

vi.mock("../../../../lib/observability/logger", () => ({
  logAdminAction: vi.fn(),
  logAdminError: vi.fn(),
}));

vi.mock("../../../../lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

vi.mock("../../../invoices/utils/invoicePdf", () => ({
  downloadInvoicePdf: vi.fn(),
  printInvoice: vi.fn(),
}));

const settings = {
  id: "default",
  invoice_prefix: "SFA",
  default_currency: "CAD",
  tax_enabled_default: false,
  tax_label: "HST",
  tax_rate_percent: 13,
  invoice_number_start: null,
  next_invoice_number: 1,
  default_deposit_percent: 50,
  default_payment_terms: "full",
  payment_instructions: null,
  etransfer_destination: null,
  payment_notification_channel: "invoice-payments",
  business_billing_address: null,
  business_contact_email: null,
  business_contact_phone: null,
};

const promService = {
  id: "service-prom",
  slug: "prom-hoco",
  display_name: "Prom / HOCO",
  description: null,
  visibility: "public",
  booking_eligible: true,
  sort_order: 1,
};

const promTierOne = {
  id: "tier-prom-1",
  service_id: "service-prom",
  slug: "tier-1",
  display_name: "Tier 1",
  pricing_mode: "fixed",
  price_label: "$110",
  fixed_amount_cents: 11000,
  hourly_rate_cents: null,
  minimum_hours: null,
  duration_minutes: 45,
  deliverables_json: ["15-20 edited photos"],
  description: "Solo prom or homecoming coverage.",
  visibility: "public",
  booking_eligible: true,
  sort_order: 1,
};

const promTierTwo = {
  ...promTierOne,
  id: "tier-prom-2",
  slug: "tier-2",
  display_name: "Tier 2",
  price_label: "$150",
  fixed_amount_cents: 15000,
  duration_minutes: 90,
  deliverables_json: ["25-30 edited photos"],
  description: "Solo plus small group prom or homecoming coverage.",
  sort_order: 2,
};

const promContact = {
  id: "contact-prom",
  firstName: "Cam",
  lastName: "Client",
  email: "cam@example.com",
  phone: "6475550102",
  service: "Prom / HOCO",
  service_tier: "Tier 1",
  occasion: "Prom portraits",
  date: "2026-09-02",
  time: "5:00 PM",
  add_ons: [],
  extra_questions: {},
};

const createdDetail = {
  ok: true,
  invoice: {
    id: "invoice-1",
    invoice_number: "SFA-2026-0001",
    status: "draft",
    contact_submission_id: null,
    client_name: "Ayo Client",
    client_email: "client@example.com",
    client_phone: null,
    client_address: null,
    issue_date: "2026-08-19",
    due_date: "2026-09-02",
    currency: "CAD",
    subtotal_cents: 15000,
    tax_enabled: false,
    tax_label: null,
    tax_rate_percent: null,
    tax_cents: 0,
    total_cents: 15000,
    amount_paid_cents: 0,
    amount_due_cents: 15000,
    notes: null,
    show_business_billing_address: false,
    business_billing_address_snapshot: null,
    business_contact_email_snapshot: null,
    business_contact_phone_snapshot: null,
  },
  lineItems: [],
  schedules: [{
    id: "schedule-1",
    invoice_id: "invoice-1",
    label: "Full payment",
    due_date: "2026-09-02",
    amount_cents: 15000,
    amount_paid_cents: 0,
    remaining_amount_cents: 15000,
    status: "upcoming",
    sort_order: 0,
  }],
  notifications: [],
  payments: [],
  events: [],
  publicUrl: "https://shootforarts.com/invoice/token",
};

const renderPage = (initialPath = "/sfaadmin/invoices") => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <AppFeedbackProvider>
      <AdminInvoicesPage />
    </AppFeedbackProvider>
  </MemoryRouter>,
);

describe("AdminInvoicesPage", () => {
  const choosePromContact = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Client or inquiry" }));
    fireEvent.change(screen.getByLabelText("Client or inquiry search"), { target: { value: "Cam" } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Client or inquiry" })).getByRole("option", { name: /Cam Client/i }));
  };

  beforeEach(() => {
    document.body.style.overflow = "";
    confirmAdminInvoicePayment.mockReset();
    createAdminInvoice.mockReset();
    deleteAdminInvoice.mockReset();
    getAdminInvoiceDetail.mockReset();
    getAdminServiceCatalog.mockReset();
    getContactSubmissions.mockReset();
    getInvoiceSettings.mockReset();
    listAdminInvoices.mockReset();
    saveAdminInvoice.mockReset();
    saveInvoiceSettings.mockReset();
    sendAdminInvoice.mockReset();
    voidAdminInvoice.mockReset();

    listAdminInvoices.mockResolvedValue({ ok: true, invoices: [] });
    getContactSubmissions.mockResolvedValue([]);
    getAdminServiceCatalog.mockResolvedValue({ ok: true, services: [], tiers: [], addons: [] });
    getInvoiceSettings.mockResolvedValue({ ok: true, settings });
    createAdminInvoice.mockResolvedValue(createdDetail);
    deleteAdminInvoice.mockResolvedValue({ ok: true, invoiceId: "invoice-1" });
    saveAdminInvoice.mockResolvedValue(createdDetail);
    sendAdminInvoice.mockResolvedValue(createdDetail);
  });

  it("selects a newly created invoice, updates the list, shows actions, and updates on the second save", async () => {
    renderPage();

    await screen.findByText("New invoice");

    fireEvent.change(screen.getByPlaceholderText("Client name"), { target: { value: "Ayo Client" } });
    fireEvent.change(screen.getByPlaceholderText("Client email"), { target: { value: "client@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Item name"), { target: { value: "Custom portrait session" } });
    fireEvent.change(screen.getByPlaceholderText("Price"), { target: { value: "150.00" } });

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(createAdminInvoice).toHaveBeenCalledTimes(1));
    expect(createAdminInvoice).toHaveBeenCalledWith(expect.objectContaining({
      clientName: "Ayo Client",
      lineItems: [expect.objectContaining({ unitPriceCents: 15000 })],
    }));

    expect(await screen.findByRole("heading", { name: "SFA-2026-0001" })).toBeInTheDocument();
    expect(screen.getAllByText("SFA-2026-0001")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Send \/ resend/i })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/send a copy to myself/i));
    fireEvent.click(screen.getByRole("button", { name: /Send \/ resend/i }));
    await waitFor(() => expect(sendAdminInvoice).toHaveBeenCalledWith("invoice-1", { sendCopyToSelf: true }));
    expect(screen.getByRole("button", { name: /Print/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download invoice PDF/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Client name")).toHaveValue("Ayo Client");

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(saveAdminInvoice).toHaveBeenCalledTimes(1));
    expect(saveAdminInvoice).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: "invoice-1",
      lineItems: [expect.objectContaining({ unitPriceCents: 15000 })],
    }));
    expect(createAdminInvoice).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: /New/i })[0]);
    expect(screen.getByText("New invoice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send \/ resend/i })).not.toBeInTheDocument();
  });

  it("saves invoice settings from compact controls, including sender details, and reloads them when reopened", async () => {
    const savedSettings = {
      ...settings,
      default_currency: "USD",
      business_billing_address: "123 Studio St\nToronto, ON",
      business_contact_email: "contact@shootforarts.com",
      business_contact_phone: "647-555-0100",
    };
    saveInvoiceSettings.mockResolvedValue({ ok: true, settings: savedSettings });
    renderPage();

    await screen.findByText("New invoice");
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    fireEvent.click(screen.getByRole("button", { name: "Default currency" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Default currency" })).getByRole("option", { name: "USD" }));
    fireEvent.change(screen.getByPlaceholderText("Invoice contact email"), { target: { value: "contact@shootforarts.com" } });
    fireEvent.change(screen.getByPlaceholderText("Invoice contact phone"), { target: { value: "647-555-0100" } });
    fireEvent.change(screen.getByPlaceholderText("Your billing address for invoices"), { target: { value: "123 Studio St\nToronto, ON" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => expect(saveInvoiceSettings).toHaveBeenCalledWith(expect.objectContaining({
      defaultCurrency: "USD",
      businessBillingAddress: "123 Studio St\nToronto, ON",
      businessContactEmail: "contact@shootforarts.com",
      businessContactPhone: "647-555-0100",
    })));
    await waitFor(() => expect(screen.queryByPlaceholderText("Your billing address for invoices")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    expect(screen.getByPlaceholderText("Invoice contact email")).toHaveValue("contact@shootforarts.com");
    expect(screen.getByPlaceholderText("Invoice contact phone")).toHaveValue("647-555-0100");
    expect(screen.getByPlaceholderText("Your billing address for invoices")).toHaveValue("123 Studio St\nToronto, ON");
  });

  it("does not show settings success feedback when the backend save fails", async () => {
    saveInvoiceSettings.mockRejectedValue(new Error("settings save failed"));
    renderPage();

    await screen.findByText("New invoice");
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    fireEvent.change(screen.getByPlaceholderText("Invoice contact email"), { target: { value: "contact@shootforarts.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("settings save failed")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Invoice contact email")).toBeInTheDocument();
    expect(screen.queryByText("Invoice settings saved.")).not.toBeInTheDocument();
  });

  it("opens the invoice requested by an authenticated admin deep link", async () => {
    listAdminInvoices.mockResolvedValue({ ok: true, invoices: [createdDetail.invoice] });
    getAdminInvoiceDetail.mockResolvedValue(createdDetail);

    renderPage("/sfaadmin/invoices?invoiceId=invoice-1");

    await waitFor(() => expect(getAdminInvoiceDetail).toHaveBeenCalledWith("invoice-1"));
    expect(await screen.findByRole("heading", { name: "SFA-2026-0001" })).toBeInTheDocument();
    expect(confirmAdminInvoicePayment).not.toHaveBeenCalled();
  });

  it("provides a compact mobile invoice selector that opens the selected invoice", async () => {
    listAdminInvoices.mockResolvedValue({ ok: true, invoices: [createdDetail.invoice] });
    getAdminInvoiceDetail.mockResolvedValue(createdDetail);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Select invoice" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.change(screen.getByLabelText("Select invoice search"), { target: { value: "Ayo" } });
    fireEvent.click(screen.getByRole("option", { name: /SFA-2026-0001 - Ayo Client/i }));

    await waitFor(() => expect(getAdminInvoiceDetail).toHaveBeenCalledWith("invoice-1"));
    expect(await screen.findByRole("heading", { name: "SFA-2026-0001" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes selector dialogs with Escape and restores body scrolling", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Client or inquiry" }));
    expect(screen.getByRole("dialog", { name: "Client or inquiry" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Client or inquiry" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("uses the compact client picker to prefill a long inquiry without relying on native mobile select width", async () => {
    getContactSubmissions.mockResolvedValue([{
      ...promContact,
      firstName: "Camille",
      lastName: "Client With A Very Long Organization Name",
      email: "camille.client.with.a.long.email@example.com",
    }]);
    getAdminServiceCatalog.mockResolvedValue({ ok: true, services: [promService], tiers: [promTierOne], addons: [] });

    renderPage();

    await screen.findByText("New invoice");
    fireEvent.click(screen.getByRole("button", { name: "Client or inquiry" }));
    fireEvent.change(screen.getByLabelText("Client or inquiry search"), { target: { value: "Camille" } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Client or inquiry" })).getByRole("option", { name: /Camille Client With A Very Long Organization Name/i }));

    expect(screen.getByPlaceholderText("Client name")).toHaveValue("Camille Client With A Very Long Organization Name");
    expect(screen.getByPlaceholderText("Client email")).toHaveValue("camille.client.with.a.long.email@example.com");
    expect(screen.getByDisplayValue("Prom / HOCO — Tier 1")).toBeInTheDocument();
  });

  it("uses a grouped searchable catalog picker to add packages without a native dropdown", async () => {
    getAdminServiceCatalog.mockResolvedValue({ ok: true, services: [promService], tiers: [promTierOne, promTierTwo], addons: [] });

    renderPage();

    await screen.findByText("New invoice");
    fireEvent.click(screen.getByRole("button", { name: "Add catalog package" }));
    const catalogDialog = screen.getByRole("dialog", { name: "Add catalog package" });
    expect(within(catalogDialog).getAllByText("Prom / HOCO").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Catalog package search"), { target: { value: "Tier 2" } });
    fireEvent.click(within(catalogDialog).getByRole("option", { name: /Prom \/ HOCO, Tier 2, \$150/i }));

    expect(screen.getByDisplayValue("Prom / HOCO — Tier 2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("150.00")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps line-item remove controls accessible and tied to each item card", async () => {
    renderPage();

    await screen.findByText("New invoice");
    fireEvent.click(screen.getByRole("button", { name: "Add custom item" }));

    expect(screen.getByRole("button", { name: "Remove line item 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove line item 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove line item 2" }));

    expect(screen.getAllByPlaceholderText("Item name")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Remove line item 2" })).not.toBeInTheDocument();
  });

  it("refreshes the open draft invoice snapshot after settings are saved", async () => {
    listAdminInvoices.mockResolvedValue({ ok: true, invoices: [createdDetail.invoice] });
    getAdminInvoiceDetail.mockResolvedValue(createdDetail);
    saveInvoiceSettings.mockResolvedValue({
      ok: true,
      settings: { ...settings, payment_instructions: "Updated payment instructions" },
    });
    renderPage();

    fireEvent.click(await screen.findByText("SFA-2026-0001"));
    await screen.findByRole("heading", { name: "SFA-2026-0001" });
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    fireEvent.change(screen.getByPlaceholderText("Payment instructions"), { target: { value: "Updated payment instructions" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => expect(saveAdminInvoice).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: "invoice-1",
    })));
    expect(screen.getByText("Invoice settings saved and current draft updated.")).toBeInTheDocument();
  });

  it("permanently deletes a saved invoice after confirmation", async () => {
    listAdminInvoices.mockResolvedValueOnce({ ok: true, invoices: [createdDetail.invoice] }).mockResolvedValue({ ok: true, invoices: [] });
    renderPage();

    await screen.findByText("SFA-2026-0001");
    fireEvent.click(screen.getByRole("button", { name: /delete invoice sfa-2026-0001/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete invoice" }));

    await waitFor(() => expect(deleteAdminInvoice).toHaveBeenCalledWith("invoice-1"));
    expect(screen.getByText("Invoice SFA-2026-0001 deleted.")).toBeInTheDocument();
  });

  it("prefills client identity and catalog package from an existing inquiry", async () => {
    getContactSubmissions.mockResolvedValue([promContact]);
    getAdminServiceCatalog.mockResolvedValue({ ok: true, services: [promService], tiers: [promTierOne, promTierTwo], addons: [] });

    renderPage();

    await screen.findByText("New invoice");
    await choosePromContact();

    expect(screen.getByPlaceholderText("Client name")).toHaveValue("Cam Client");
    expect(screen.getByPlaceholderText("Client email")).toHaveValue("cam@example.com");
    expect(screen.getByPlaceholderText("Client phone")).toHaveValue("6475550102");
    expect(screen.getByText("Inquiry: Prom / HOCO · Tier 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Prom / HOCO — Tier 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("110.00")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Solo prom or homecoming coverage/)).toBeInTheDocument();
    expect(screen.getByText("Deposit: $55.00")).toBeInTheDocument();
    expect(screen.getByText("Remaining balance: $55.00")).toBeInTheDocument();
  });

  it("does not guess unmatched historical inquiry tiers", async () => {
    getContactSubmissions.mockResolvedValue([{ ...promContact, service_tier: "Old package" }]);
    getAdminServiceCatalog.mockResolvedValue({ ok: true, services: [promService], tiers: [promTierOne], addons: [] });

    renderPage();

    await screen.findByText("New invoice");
    await choosePromContact();

    expect(screen.getByPlaceholderText("Client name")).toHaveValue("Cam Client");
    expect(screen.getByText(/Tier needs review/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Prom / HOCO — Tier 1")).not.toBeInTheDocument();
  });

  it("lets admin change a prefilled tier without mutating the inquiry and creates deposit terms", async () => {
    getContactSubmissions.mockResolvedValue([promContact]);
    getAdminServiceCatalog.mockResolvedValue({ ok: true, services: [promService], tiers: [promTierOne, promTierTwo], addons: [] });

    renderPage();

    await screen.findByText("New invoice");
    await choosePromContact();
    fireEvent.click(screen.getByRole("button", { name: "Add catalog package" }));
    fireEvent.change(screen.getByLabelText("Catalog package search"), { target: { value: "Tier 2" } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Add catalog package" })).getByRole("option", { name: /Prom \/ HOCO, Tier 2, \$150/i }));

    expect(screen.getByDisplayValue("Prom / HOCO — Tier 2")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Prom / HOCO — Tier 1")).not.toBeInTheDocument();
    expect(promContact.service_tier).toBe("Tier 1");

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(createAdminInvoice).toHaveBeenCalledTimes(1));
    const payload = createAdminInvoice.mock.calls[0][0];
    expect(payload.contactSubmissionId).toBe("contact-prom");
    expect(payload.lineItems).toEqual([expect.objectContaining({
      sourceServiceCatalogTierId: "tier-prom-2",
      unitPriceCents: 15000,
    })]);
    expect(payload.paymentTerms).toEqual(expect.objectContaining({
      mode: "deposit_balance",
      depositPercent: 50,
      depositDueDate: expect.any(String),
      balanceDueDate: expect.any(String),
    }));
  });
});
