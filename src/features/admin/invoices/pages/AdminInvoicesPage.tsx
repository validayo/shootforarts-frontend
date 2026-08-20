import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Download, Plus, Printer, Send, Settings, Trash2 } from "lucide-react";

import { useAppFeedback } from "../../../../components/ui/appFeedbackContext";
import AdminShellLayout from "../../shared/components/AdminShellLayout";
import { ROUTES } from "../../../../config/routes";
import { supabase } from "../../../../lib/supabase";
import {
  confirmAdminInvoicePayment,
  createAdminInvoice,
  deleteAdminInvoice,
  getAdminInvoiceDetail,
  getAdminServiceCatalog,
  getContactSubmissions,
  getInvoiceSettings,
  listAdminInvoices,
  saveAdminInvoice,
  saveInvoiceSettings,
  sendAdminInvoice,
  voidAdminInvoice,
} from "../../../../lib/api/services";
import { logAdminAction, logAdminError } from "../../../../lib/observability/logger";
import type {
  AdminInvoiceDetailResponse,
  Contact,
  InvoiceLineItem,
  InvoicePaymentTermsMode,
  InvoiceSettings,
  InvoiceStatus,
  ServiceCatalogAddon,
  ServiceCatalogService,
  ServiceCatalogTier,
} from "../../../../utils/types";
import { downloadInvoicePdf, printInvoice } from "../../../invoices/utils/invoicePdf";
import {
  addCatalogItemWithoutDuplicate,
  buildCatalogTierOptions,
  catalogTierToDraftItem,
  formatCatalogTierPrice,
  type CatalogTierOption,
  type DraftCatalogLineItem,
} from "../utils/catalogLineItems";
import { buildInquiryPrefillItems } from "../utils/inquiryPrefill";
import {
  calculateInvoiceDraftTotals,
  centsToMoney,
  invoicePayload,
  moneyToCents,
} from "../utils/invoiceDraft";

type DraftItem = DraftCatalogLineItem;

const emptyItem: DraftItem = {
  itemType: "custom",
  name: "",
  description: "",
  pricingMode: "fixed",
  quantity: 1,
  unitPriceCents: 0,
  minimumHours: null,
};

const statusOptions: Array<InvoiceStatus | "all"> = ["all", "draft", "sent", "payment_sent", "partially_paid", "paid", "past_due", "void"];
const DEFAULT_PAYMENT_TERMS_MODE: InvoicePaymentTermsMode = "deposit_balance";
const currencyOptions = ["CAD", "USD"];
const inputClass = "min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const primaryButtonClass = "inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = "inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const subtleButtonClass = "inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const destructiveButtonClass = "inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/10";
const iconButtonClass = "inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

type CompactPickerOption = {
  value: string;
  label: string;
  description?: string;
  meta?: string;
};

type CompactPickerProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  value: string;
  options: CompactPickerOption[];
  onSelect: (value: string) => void;
};

const CompactMobilePicker: React.FC<CompactPickerProps> = ({
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  value,
  options,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => [option.label, option.description, option.meta].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery))
    : options;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const choose = (nextValue: string) => {
    onSelect(nextValue);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        ref={triggerRef}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${selected ? "text-gray-900" : "text-gray-500"}`}>
            {selected?.label ?? placeholder}
          </span>
          {selected?.description && <span className="mt-0.5 block truncate text-xs text-gray-500">{selected.description}</span>}
        </span>
        <span className="shrink-0 text-gray-400" aria-hidden="true">Select</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-gray-900/20 p-3 sm:items-center sm:justify-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex max-h-[78dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <h4 className="min-w-0 truncate text-sm font-semibold text-gray-900">{label}</h4>
              <button type="button" className={subtleButtonClass} onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="border-b border-gray-100 p-3">
              <input
                className={inputClass}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`${label} search`}
                ref={searchInputRef}
              />
            </div>
            <div className="overflow-y-auto p-2" role="listbox" aria-label={label}>
              {filteredOptions.length === 0 && <p className="px-3 py-4 text-sm text-gray-500">{emptyMessage}</p>}
              {filteredOptions.map((option) => (
                <button
                  key={option.value || "__empty"}
                  type="button"
                  className={`min-h-12 w-full min-w-0 rounded-xl px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${
                    option.value === value ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"
                  }`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-label={[option.label, option.description, option.meta].filter(Boolean).join(", ")}
                  onClick={() => choose(option.value)}
                >
                  <span className="block min-w-0 break-words font-medium">{option.label}</span>
                  {option.description && <span className={`mt-0.5 block min-w-0 break-all text-xs ${option.value === value ? "text-white/75" : "text-gray-500"}`}>{option.description}</span>}
                  {option.meta && <span className={`mt-0.5 block min-w-0 break-words text-xs ${option.value === value ? "text-white/75" : "text-gray-500"}`}>{option.meta}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type CatalogPackagePickerProps = {
  groups: Array<{
    service: ServiceCatalogService;
    options: CatalogTierOption[];
  }>;
  currency: string;
  onSelect: (tierId: string) => void;
};

const CatalogPackagePicker: React.FC<CatalogPackagePickerProps> = ({ groups, currency, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      options: normalizedQuery
        ? group.options.filter((option) => [group.service.display_name, option.tier.display_name, option.label, option.tier.description, ...(option.tier.deliverables_json ?? [])].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery))
        : group.options,
    }))
    .filter((group) => group.options.length > 0);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const choose = (tierId: string) => {
    onSelect(tierId);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        aria-label="Add catalog package"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        ref={triggerRef}
      >
        <span className="min-w-0 flex-1 truncate font-medium text-gray-500">Add catalog package...</span>
        <span className="shrink-0 text-gray-400" aria-hidden="true">Select</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-gray-900/20 p-3 sm:items-center sm:justify-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex max-h-[82dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Add catalog package"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <h4 className="min-w-0 truncate text-sm font-semibold text-gray-900">Add catalog package</h4>
              <button type="button" className={subtleButtonClass} onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="border-b border-gray-100 p-3">
              <input
                className={inputClass}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search packages"
                aria-label="Catalog package search"
                ref={searchInputRef}
              />
            </div>
            <div className="min-w-0 overflow-y-auto p-3" role="listbox" aria-label="Catalog packages">
              {filteredGroups.length === 0 && <p className="px-2 py-4 text-sm text-gray-500">No catalog packages found.</p>}
              <div className="space-y-4">
                {filteredGroups.map((group) => (
                  <section key={group.service.id} className="min-w-0">
                    <h5 className="mb-2 min-w-0 truncate text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{group.service.display_name}</h5>
                    <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                      {group.options.map((option) => (
                        <button
                          key={option.tier.id}
                          type="button"
                          className="min-h-20 min-w-0 rounded-xl border border-gray-200 bg-white p-3 text-left text-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                          role="option"
                          aria-selected="false"
                          aria-label={`${option.service.display_name}, ${option.tier.display_name}, ${formatCatalogTierPrice(option.tier, currency)}`}
                          onClick={() => choose(option.tier.id)}
                        >
                          <span className="block min-w-0 break-words font-semibold text-gray-900">{option.tier.display_name}</span>
                          <span className="mt-1 block min-w-0 break-words text-xs text-gray-500">{option.service.display_name}</span>
                          <span className="mt-2 block text-sm font-semibold text-gray-900">{formatCatalogTierPrice(option.tier, currency)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const formatCents = (value: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format((value || 0) / 100);

const mergeSelectedInvoice = (
  invoices: AdminInvoiceDetailResponse["invoice"][],
  selectedInvoice: AdminInvoiceDetailResponse["invoice"],
) => [selectedInvoice, ...invoices.filter((invoice) => invoice.id !== selectedInvoice.id)];

const localPreviewUrl = (publicUrl?: string | null): string | null => {
  if (!publicUrl || typeof window === "undefined") return null;
  try {
    const parsed = new URL(publicUrl);
    return `${window.location.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
};

const AdminInvoicesPage: React.FC = () => {
  const { showToast, confirm } = useAppFeedback();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [invoices, setInvoices] = useState<AdminInvoiceDetailResponse["invoice"][]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [services, setServices] = useState<ServiceCatalogService[]>([]);
  const [tiers, setTiers] = useState<ServiceCatalogTier[]>([]);
  const [addons, setAddons] = useState<ServiceCatalogAddon[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [detail, setDetail] = useState<AdminInvoiceDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(14));
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxLabel, setTaxLabel] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [notes, setNotes] = useState("");
  const [showBusinessBillingAddress, setShowBusinessBillingAddress] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }]);
  const [paymentTermsMode, setPaymentTermsMode] = useState<InvoicePaymentTermsMode>(DEFAULT_PAYMENT_TERMS_MODE);
  const [depositPercent, setDepositPercent] = useState("50");
  const [depositDueDate, setDepositDueDate] = useState(today());
  const [balanceDueDate, setBalanceDueDate] = useState(inDays(14));
  const [inquiryReference, setInquiryReference] = useState<string | null>(null);
  const [inquiryReview, setInquiryReview] = useState<string | null>(null);
  const [prefilledTierId, setPrefilledTierId] = useState<string | null>(null);
  const [sendCopyToSelf, setSendCopyToSelf] = useState(false);

  useEffect(() => {
    if (notice) showToast(notice, { type: "success" });
  }, [notice, showToast]);

  useEffect(() => {
    if (error) showToast(error, { type: "error" });
  }, [error, showToast]);

  const reload = useCallback(async (applyDraftDefaults = false) => {
    const [invoiceResponse, contactsResponse, catalogResponse, settingsResponse] = await Promise.all([
      listAdminInvoices(status),
      getContactSubmissions(),
      getAdminServiceCatalog(),
      getInvoiceSettings(),
    ]);
    setInvoices(invoiceResponse.invoices);
    setContacts(contactsResponse);
    setServices(catalogResponse.services);
    setTiers(catalogResponse.tiers);
    setAddons(catalogResponse.addons ?? []);
    setSettings(settingsResponse.settings);
    if (applyDraftDefaults) {
      setTaxEnabled(settingsResponse.settings.tax_enabled_default);
      setTaxLabel(settingsResponse.settings.tax_label ?? "");
      setTaxRatePercent(settingsResponse.settings.tax_rate_percent == null ? "" : String(settingsResponse.settings.tax_rate_percent));
      setPaymentTermsMode(DEFAULT_PAYMENT_TERMS_MODE);
      setDepositPercent(String(settingsResponse.settings.default_deposit_percent ?? 50));
    }
  }, [status]);

  const refreshInvoiceList = async (selectedInvoice?: AdminInvoiceDetailResponse["invoice"]) => {
    const invoiceResponse = await listAdminInvoices(status);
    setInvoices(selectedInvoice ? mergeSelectedInvoice(invoiceResponse.invoices, selectedInvoice) : invoiceResponse.invoices);
  };

  useEffect(() => {
    setLoading(true);
    reload(true)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [reload]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logAdminAction("auth.logout");
      window.location.href = ROUTES.admin.login;
    } catch (err) {
      logAdminError("auth.logout_failed", { message: String(err) });
    }
  };

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = contacts.find((item) => item.id === contactId);
    setInquiryReference(null);
    setInquiryReview(null);
    setPrefilledTierId(null);
    if (!contact) return;
    setClientName(`${contact.firstName} ${contact.lastName}`.trim());
    setClientEmail(contact.email);
    setClientPhone(contact.phone ?? "");
    const prefill = buildInquiryPrefillItems({
      contact,
      services,
      tiers,
      addons,
      emptyItem: { ...emptyItem },
    });
    setInquiryReference(prefill.referenceLabel);
    setInquiryReview(prefill.needsReview);
    setPrefilledTierId(prefill.matchedTierId);
    setItems(prefill.items);
  };
  const canEditDraft = !detail || detail.invoice.status === "draft";

  const loadInvoice = useCallback(async (invoiceId: string) => {
    setError(null);
    const next = await getAdminInvoiceDetail(invoiceId);
    setDetail(next);
    setSelectedContactId(next.invoice.contact_submission_id ?? "");
    setClientName(next.invoice.client_name);
    setClientEmail(next.invoice.client_email ?? "");
    setClientPhone(next.invoice.client_phone ?? "");
    setClientAddress(next.invoice.client_address ?? "");
    setIssueDate(next.invoice.issue_date);
    setDueDate(next.invoice.due_date ?? "");
    setTaxEnabled(next.invoice.tax_enabled);
    setTaxLabel(next.invoice.tax_label ?? "");
    setTaxRatePercent(next.invoice.tax_rate_percent == null ? "" : String(next.invoice.tax_rate_percent));
    setNotes(next.invoice.notes ?? "");
    setShowBusinessBillingAddress(next.invoice.show_business_billing_address === true);
    setItems(next.lineItems.map((item: InvoiceLineItem) => ({
      sourceServiceCatalogTierId: item.source_service_catalog_tier_id,
      sourceServiceCatalogAddonId: item.source_service_catalog_addon_id,
      itemType: item.item_type === "service_tier" ? "service_tier" : item.item_type === "addon" ? "addon" : "custom",
      name: item.name,
      description: item.description ?? "",
      pricingMode: item.pricing_mode,
      quantity: Number(item.quantity),
      unitPriceCents: Number(item.unit_price_cents),
      minimumHours: item.minimum_hours ?? null,
    })));
    if (next.schedules.length > 1) {
      const deposit = next.schedules[0];
      setPaymentTermsMode("deposit_balance");
      setDepositPercent(next.invoice.total_cents > 0 ? String(Math.round(Number(deposit.amount_cents) / Number(next.invoice.total_cents) * 100)) : "50");
      setDepositDueDate(deposit.due_date ?? today());
      setBalanceDueDate(next.schedules[1]?.due_date ?? next.invoice.due_date ?? inDays(14));
    } else {
      setPaymentTermsMode("full");
      setDepositDueDate(today());
      setBalanceDueDate(next.invoice.due_date ?? inDays(14));
    }
  }, []);

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId")?.trim();
    if (!invoiceId || detail?.invoice.id === invoiceId) return;

    void loadInvoice(invoiceId).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [detail?.invoice.id, loadInvoice, searchParams]);

  const resetDraft = () => {
    setDetail(null);
    setSelectedContactId("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    const nextIssueDate = today();
    const nextDueDate = inDays(14);
    setIssueDate(nextIssueDate);
    setDueDate(nextDueDate);
    setTaxEnabled(settings?.tax_enabled_default ?? false);
    setTaxLabel(settings?.tax_label ?? "");
    setTaxRatePercent(settings?.tax_rate_percent == null ? "" : String(settings.tax_rate_percent));
    setNotes("");
    setShowBusinessBillingAddress(false);
    setItems([{ ...emptyItem }]);
    setPaymentTermsMode(DEFAULT_PAYMENT_TERMS_MODE);
    setDepositPercent(String(settings?.default_deposit_percent ?? 50));
    setDepositDueDate(nextIssueDate);
    setBalanceDueDate(nextDueDate);
    setInquiryReference(null);
    setInquiryReview(null);
    setPrefilledTierId(null);
  };

  const saveDraft = async (successNotice = "Invoice saved.") => {
    setError(null);
    setNotice(null);
    try {
      const payload = invoicePayload({
        selectedContactId,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        issueDate,
        dueDate: invoiceDueDate,
        taxEnabled,
        taxLabel,
        taxRatePercent,
        notes,
        showBusinessBillingAddress,
        items,
        paymentTermsMode,
        depositPercent,
        depositDueDate,
        balanceDueDate,
      });
      const next = detail?.invoice.id
        ? await saveAdminInvoice({ ...payload, invoiceId: detail.invoice.id })
        : await createAdminInvoice(payload);
      setDetail(next);
      setInvoices((current) => mergeSelectedInvoice(current, next.invoice));
      setNotice(successNotice);
      await refreshInvoiceList(next.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const catalogOptions = buildCatalogTierOptions(services, tiers, settings?.default_currency ?? "CAD");
  const catalogOptionsByService = services.map((service) => ({
    service,
    options: catalogOptions.filter((option) => option.service.id === service.id),
  })).filter((group) => group.options.length > 0);
  const invoiceDueDate = paymentTermsMode === "deposit_balance" ? balanceDueDate : dueDate;
  const draftTotals = calculateInvoiceDraftTotals({
    items,
    taxEnabled,
    taxRatePercent,
    paymentTermsMode,
    depositPercent,
    dueDate: invoiceDueDate,
    depositDueDate,
    balanceDueDate,
  });
  const invoiceCurrency = detail?.invoice.currency ?? settings?.default_currency ?? "CAD";
  const statusPickerOptions = statusOptions.map((option) => ({
    value: option,
    label: option === "all" ? "All invoices" : option.replace(/_/g, " "),
  }));
  const currencyPickerOptions = currencyOptions.map((currency) => ({ value: currency, label: currency }));
  const paymentTermsOptions = [
    { value: "full", label: "Full payment" },
    { value: "deposit_balance", label: "Deposit + balance" },
  ];
  const invoicePickerOptions = invoices.map((invoice) => ({
    value: invoice.id,
    label: `${invoice.invoice_number} - ${invoice.client_name}`,
    description: `${formatCents(invoice.amount_due_cents, invoice.currency)} due - ${invoice.status.replace(/_/g, " ")}`,
  }));
  const contactPickerOptions = [
    {
      value: "",
      label: "Manual client",
      description: "Enter invoice details manually",
    },
    ...contacts.map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`.trim() || contact.email,
      description: contact.email,
      meta: [contact.service, contact.service_tier].filter(Boolean).join(" - ") || undefined,
    })),
  ];
  const previewUrl = localPreviewUrl(detail?.publicUrl);
  const showLocalPreview = previewUrl && detail?.publicUrl && previewUrl !== detail.publicUrl;
  const startPrint = () => {
    if (!detail) return;
    try {
      printInvoice(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteInvoice = async (invoice: AdminInvoiceDetailResponse["invoice"]) => {
    const confirmed = await confirm({
      title: `Delete ${invoice.invoice_number}?`,
      description: "This permanently removes the invoice from admin and client access. This cannot be undone.",
      confirmLabel: "Delete invoice",
      destructive: true,
    });
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    try {
      await deleteAdminInvoice(invoice.id);
      if (detail?.invoice.id === invoice.id) resetDraft();
      await refreshInvoiceList();
      setNotice(`Invoice ${invoice.invoice_number} deleted.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message === "Failed to fetch" ? "Invoice delete function is not reachable yet. Deploy admin-invoices-delete, then try again." : message);
    }
  };

  const sendInvoiceEmail = async () => {
    if (!detail) return;
    setError(null);
    setNotice(null);
    try {
      const next = await sendAdminInvoice(detail.invoice.id, { sendCopyToSelf });
      setDetail(next);
      await reload();
      setNotice(sendCopyToSelf ? "Invoice email sent with admin copy." : "Invoice email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const voidInvoice = async () => {
    if (!detail) return;
    const confirmed = await confirm({
      title: `Void ${detail.invoice.invoice_number}?`,
      description: "This cancels the invoice but keeps its historical record. The invoice number will not be reused.",
      confirmLabel: "Void invoice",
      destructive: true,
    });
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    try {
      const next = await voidAdminInvoice(detail.invoice.id, "Voided by admin");
      setDetail(next);
      await reload();
      setNotice(`Invoice ${next.invoice.invoice_number} voided.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const confirmPayment = async (notificationId: string) => {
    const confirmed = await confirm({
      title: "Confirm payment received?",
      description: "Only confirm this after the e-transfer has arrived. This updates the invoice payment status.",
      confirmLabel: "Confirm payment",
    });
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    try {
      const next = await confirmAdminInvoicePayment({ notificationId });
      setDetail(next);
      await reload();
      setNotice("Payment marked as received.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const addCatalogTier = (tierId: string) => {
    const option = catalogOptions.find((item) => item.tier.id === tierId);
    if (!option) return;

    const nextItem = catalogTierToDraftItem(option.tier, option.service);
    if (prefilledTierId && prefilledTierId !== nextItem.sourceServiceCatalogTierId) {
      setItems((current) => current.map((item) => item.sourceServiceCatalogTierId === prefilledTierId ? nextItem : item));
      setPrefilledTierId(nextItem.sourceServiceCatalogTierId ?? null);
      setInquiryReview(null);
      setNotice(null);
      return;
    }
    if (items.some((item) => item.sourceServiceCatalogTierId === nextItem.sourceServiceCatalogTierId)) {
      setNotice(`${nextItem.name} is already on this invoice.`);
      return;
    }

    setItems((current) => addCatalogItemWithoutDuplicate(current, nextItem, emptyItem).items);
    setNotice(null);
  };

  const handleMobileInvoiceSelect = (invoiceId: string) => {
    if (!invoiceId) return;
    void loadInvoice(invoiceId).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };

  const saveCurrentSettings = async () => {
    if (!settings) return;
    setError(null);
    setNotice(null);
    try {
      const next = await saveInvoiceSettings({
        invoicePrefix: settings.invoice_prefix,
        defaultCurrency: settings.default_currency,
        taxEnabledDefault: settings.tax_enabled_default,
        taxLabel: settings.tax_label,
        taxRatePercent: settings.tax_rate_percent,
        invoiceNumberStart: settings.invoice_number_start,
        nextInvoiceNumber: settings.next_invoice_number,
        defaultDepositPercent: settings.default_deposit_percent,
        defaultPaymentTerms: settings.default_payment_terms,
        paymentInstructions: settings.payment_instructions,
        etransferDestination: settings.etransfer_destination,
        paymentNotificationChannel: settings.payment_notification_channel,
        businessBillingAddress: settings.business_billing_address,
        businessContactEmail: settings.business_contact_email,
        businessContactPhone: settings.business_contact_phone,
      });
      setSettings(next.settings);
      setSettingsOpen(false);
      if (detail?.invoice.status === "draft") {
        await saveDraft("Invoice settings saved and current draft updated.");
        return;
      }
      setNotice(detail ? "Invoice settings saved. Resend this invoice to refresh its client snapshot." : "Invoice settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <AdminShellLayout title="Invoices" subtitle="Create, send, and confirm Interac e-Transfer invoice payments." activeNav="invoices" onLogout={handleLogout}>
      <div className="min-w-0 space-y-5 overflow-x-hidden">
        {loading && <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Loading invoices...</div>}

        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Invoice Settings</h3>
              <p className="mt-1 text-sm text-gray-600">Sending is blocked until e-transfer destination and payment instructions are configured.</p>
            </div>
            <button className={`${secondaryButtonClass} w-full sm:w-auto`} onClick={() => setSettingsOpen((value) => !value)}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </button>
          </div>
          {settingsOpen && settings && (
            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
              <input className={inputClass} value={settings.invoice_prefix} onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })} placeholder="Invoice prefix" />
              <CompactMobilePicker
                label="Default currency"
                placeholder="Default currency"
                searchPlaceholder="Search currencies"
                emptyMessage="No currencies found."
                value={settings.default_currency}
                options={currencyPickerOptions}
                onSelect={(value) => setSettings({ ...settings, default_currency: value })}
              />
              <input className={inputClass} type="number" value={settings.next_invoice_number ?? ""} onChange={(e) => setSettings({ ...settings, next_invoice_number: e.target.value ? Number(e.target.value) : null })} placeholder="Next invoice number" />
              <input className={inputClass} value={settings.payment_notification_channel} onChange={(e) => setSettings({ ...settings, payment_notification_channel: e.target.value })} placeholder="Payment notification channel" />
              <input className={inputClass} value={settings.business_contact_email ?? ""} onChange={(e) => setSettings({ ...settings, business_contact_email: e.target.value })} placeholder="Invoice contact email" />
              <input className={inputClass} value={settings.business_contact_phone ?? ""} onChange={(e) => setSettings({ ...settings, business_contact_phone: e.target.value })} placeholder="Invoice contact phone" />
              <input className={`${inputClass} md:col-span-2`} value={settings.etransfer_destination ?? ""} onChange={(e) => setSettings({ ...settings, etransfer_destination: e.target.value })} placeholder="E-transfer destination" />
              <textarea rows={Math.max(4, (settings.payment_instructions ?? "").split("\n").length)} className={`${inputClass} resize-none md:col-span-2`} value={settings.payment_instructions ?? ""} onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })} placeholder="Payment instructions" />
              <textarea rows={Math.max(4, (settings.business_billing_address ?? "").split("\n").length)} className={`${inputClass} resize-none md:col-span-2`} value={settings.business_billing_address ?? ""} onChange={(e) => setSettings({ ...settings, business_billing_address: e.target.value })} placeholder="Your billing address for invoices" />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={settings.tax_enabled_default} onChange={(e) => setSettings({ ...settings, tax_enabled_default: e.target.checked })} />
                Tax on by default
              </label>
              <button className={`${primaryButtonClass} md:col-start-2`} onClick={saveCurrentSettings}>Save settings</button>
            </div>
          )}
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(260px,380px)_minmax(0,1fr)]">
          <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5 xl:hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {detail ? `${detail.invoice.invoice_number} selected` : "Choose an invoice or start a new draft."}
                </p>
              </div>
              <button className={`${primaryButtonClass} w-full sm:w-auto`} onClick={resetDraft}>
                <Plus className="mr-2 h-4 w-4" /> New
              </button>
            </div>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <CompactMobilePicker
                label="Filter invoices by status"
                placeholder="All invoices"
                searchPlaceholder="Search statuses"
                emptyMessage="No statuses found."
                value={status}
                options={statusPickerOptions}
                onSelect={(value) => setStatus(value as InvoiceStatus | "all")}
              />
              <CompactMobilePicker
                label="Select invoice"
                placeholder="Select invoice..."
                searchPlaceholder="Search invoices"
                emptyMessage="No invoices found."
                value={detail?.invoice.id ?? ""}
                options={invoicePickerOptions}
                onSelect={handleMobileInvoiceSelect}
              />
            </div>
          </section>

          <section className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 xl:block xl:max-h-[calc(100dvh-13rem)] xl:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
              <button className={primaryButtonClass} onClick={resetDraft}>
                <Plus className="mr-2 h-4 w-4" /> New
              </button>
            </div>
            <div className="mb-4">
              <CompactMobilePicker
                label="Filter invoice list by status"
                placeholder="All invoices"
                searchPlaceholder="Search statuses"
                emptyMessage="No statuses found."
                value={status}
                options={statusPickerOptions}
                onSelect={(value) => setStatus(value as InvoiceStatus | "all")}
              />
            </div>
            <div className="min-w-0 space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className={`min-w-0 rounded-xl border p-3 hover:bg-gray-50 ${detail?.invoice.id === invoice.id ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => void loadInvoice(invoice.id)}>
                      <span className="block truncate font-semibold text-gray-900">{invoice.invoice_number}</span>
                      <span className="mt-1 block truncate text-sm text-gray-600">{invoice.client_name}</span>
                      <span className="mt-1 block text-sm font-medium text-gray-900">{formatCents(invoice.amount_due_cents, invoice.currency)} due</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-gray-500">{invoice.status.replace(/_/g, " ")}</span>
                      <button className="rounded-full p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700" onClick={() => void deleteInvoice(invoice)} aria-label={`Delete invoice ${invoice.invoice_number}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{detail ? detail.invoice.invoice_number : "New invoice"}</h3>
                <p className="text-sm text-gray-600">Draft, preview, send, and confirm payments from here.</p>
              </div>
              {detail && (
                <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:grid-flow-col lg:grid-cols-none">
                  {detail.publicUrl && (
                  <button className={secondaryButtonClass} onClick={() => void navigator.clipboard.writeText(detail.publicUrl ?? "").then(() => setNotice("Production client link copied."))}>
                    <Copy className="mr-2 h-4 w-4" /> Copy client link
                  </button>
                  )}
                  {showLocalPreview && (
                    <button className={secondaryButtonClass} onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                      Preview locally
                    </button>
                  )}
                  <button className={iconButtonClass} onClick={startPrint} aria-label="Print invoice">
                    <Printer className="mr-2 h-4 w-4" /> Print
                  </button>
                  <button className={iconButtonClass} onClick={() => downloadInvoicePdf(detail)} aria-label="Download invoice PDF">
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </button>
                </div>
              )}
            </div>

            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <CompactMobilePicker
                label="Client or inquiry"
                placeholder="Manual client"
                searchPlaceholder="Search clients"
                emptyMessage="No clients found."
                value={selectedContactId}
                options={contactPickerOptions}
                onSelect={selectContact}
              />
              <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
              <input className={inputClass} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Client email" />
              <input className={inputClass} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Client phone" />
              <textarea rows={Math.max(3, clientAddress.split("\n").length)} className={`${inputClass} resize-none md:col-span-2`} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Client address" />
              <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                <input type="checkbox" checked={showBusinessBillingAddress} onChange={(e) => setShowBusinessBillingAddress(e.target.checked)} />
                Show my billing address on this invoice
              </label>
            </div>
            {(inquiryReference || inquiryReview) && (
              <div className="mt-3 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                {inquiryReference && <span className="break-words">Inquiry: {inquiryReference}</span>}
                {inquiryReview && <span className={`break-words ${inquiryReference ? "ml-2 text-amber-700" : "text-amber-700"}`}>{inquiryReview}</span>}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-gray-900">Line items</h4>
                <button className={subtleButtonClass} onClick={() => setItems((current) => [...current, { ...emptyItem }])}>Add custom item</button>
              </div>
              <CatalogPackagePicker groups={catalogOptionsByService} currency={invoiceCurrency} onSelect={addCatalogTier} />
              {items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="relative grid min-w-0 gap-2 rounded-xl border border-gray-200 p-3 pr-14 pt-12 sm:grid-cols-[minmax(0,1fr)_88px_112px] sm:pt-3">
                  <input className={inputClass} value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder="Item name" />
                  <input className={inputClass} type="number" step="0.25" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} placeholder={item.pricingMode === "hourly" ? "Hours" : "Qty"} aria-label={item.pricingMode === "hourly" ? "Billable hours" : "Quantity"} />
                  <input className={inputClass} value={centsToMoney(item.unitPriceCents)} onChange={(e) => updateItem(index, { unitPriceCents: moneyToCents(e.target.value) })} placeholder="Price" />
                  <button className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/10" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove line item ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                  <textarea rows={Math.max(2, item.description.split("\n").length)} className={`${inputClass} resize-none sm:col-span-3`} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} placeholder="Description / deliverables" />
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
                Apply tax
              </label>
              <input className={inputClass} value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} placeholder="Tax label" />
              <input className={inputClass} value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} placeholder="Tax %" />
              <CompactMobilePicker
                label="Payment terms"
                placeholder="Payment terms"
                searchPlaceholder="Search payment terms"
                emptyMessage="No payment terms found."
                value={paymentTermsMode}
                options={paymentTermsOptions}
                onSelect={(value) => setPaymentTermsMode(value as InvoicePaymentTermsMode)}
              />
              {paymentTermsMode === "full" && (
                <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Payment due date" />
              )}
              {paymentTermsMode === "deposit_balance" && (
                <>
                  <input className={inputClass} value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} placeholder="Deposit %" />
                  <input className={inputClass} type="date" value={depositDueDate} onChange={(e) => setDepositDueDate(e.target.value)} aria-label="Deposit due date" />
                  <input className={inputClass} type="date" value={balanceDueDate} onChange={(e) => setBalanceDueDate(e.target.value)} aria-label="Remaining balance due date" />
                </>
              )}
              <textarea rows={Math.max(2, notes.split("\n").length)} className={`${inputClass} resize-none md:col-span-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal/client invoice notes" />
            </div>

            <div className="mt-5 min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <div className="grid min-w-0 grid-cols-2 gap-2 text-sm xl:grid-cols-4" aria-label="Invoice totals summary">
                <span className="min-w-0 rounded-lg bg-white/70 px-3 py-2">Subtotal <strong className="mt-1 block break-words">{formatCents(draftTotals.subtotalCents, invoiceCurrency)}</strong></span>
                <span className="min-w-0 rounded-lg bg-white/70 px-3 py-2">Tax <strong className="mt-1 block break-words">{formatCents(draftTotals.taxCents, invoiceCurrency)}</strong></span>
                <span className="min-w-0 rounded-lg bg-white px-3 py-2">Total <strong className="mt-1 block break-words text-gray-950">{formatCents(draftTotals.totalCents, invoiceCurrency)}</strong></span>
                <span className="min-w-0 rounded-lg bg-white px-3 py-2">Due <strong className="mt-1 block break-words text-gray-950">{formatCents(draftTotals.amountDueCents, invoiceCurrency)}</strong></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                {draftTotals.schedules.map((schedule) => (
                  <span key={schedule.label} className="min-w-0 rounded-full bg-white px-3 py-1">
                    {schedule.label}: {formatCents(schedule.amountCents, invoiceCurrency)}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button disabled={!canEditDraft} className={`${primaryButtonClass} w-full sm:w-auto`} onClick={() => void saveDraft()}>Save draft</button>
              {detail && detail.invoice.status !== "void" && (
                <div className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 sm:w-auto sm:flex-row sm:items-center">
                  <label className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={sendCopyToSelf} onChange={(event) => setSendCopyToSelf(event.target.checked)} />
                    <span className="min-w-0 break-words">Send a copy to myself</span>
                  </label>
                  <button className={secondaryButtonClass} onClick={() => void sendInvoiceEmail()}>
                    <Send className="mr-2 h-4 w-4" /> Send / resend
                  </button>
                </div>
              )}
              {detail && detail.invoice.status !== "paid" && detail.invoice.status !== "void" && <button className={`${destructiveButtonClass} w-full sm:w-auto`} onClick={() => void voidInvoice()}>Void</button>}
            </div>

            {detail?.notifications?.some((notification) => notification.verification_status === "pending") && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="font-semibold text-amber-900">Awaiting confirmation</h4>
                <div className="mt-3 space-y-2">
                  {detail.notifications.filter((notification) => notification.verification_status === "pending").map((notification) => (
                    <div key={notification.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm">
                      <span className="min-w-0 break-words">{notification.client_name ?? detail.invoice.client_name} reported payment {notification.client_reference ? `(${notification.client_reference})` : ""}</span>
                      <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20" onClick={() => void confirmPayment(notification.id)}>Confirm payment</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShellLayout>
  );
};

export default AdminInvoicesPage;
