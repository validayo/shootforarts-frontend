import { describe, expect, it } from "vitest";

import {
  calculateInvoiceDraftTotals,
  invoicePayload,
  type InvoiceDraftState,
} from "../utils/invoiceDraft";

const baseState = (overrides: Partial<InvoiceDraftState> = {}): InvoiceDraftState => ({
  selectedContactId: "",
  clientName: "Ayo Client",
  clientEmail: "client@example.com",
  clientPhone: "",
  clientAddress: "",
  issueDate: "2026-08-19",
  dueDate: "2026-09-02",
  taxEnabled: false,
  taxLabel: "HST",
  taxRatePercent: "",
  notes: "",
  showBusinessBillingAddress: false,
  items: [
    {
      itemType: "service_tier",
      name: "Base Photoshoot - Tier 1 Solo Shoot",
      description: "Portrait session",
      pricingMode: "fixed",
      quantity: 1,
      unitPriceCents: 15000,
      minimumHours: null,
    },
  ],
  paymentTermsMode: "full",
  depositPercent: "50",
  depositDueDate: "2026-08-19",
  balanceDueDate: "2026-09-02",
  ...overrides,
});

describe("invoice draft calculation and payload mapping", () => {
  it("calculates a $150 fixed-price item without tax", () => {
    expect(calculateInvoiceDraftTotals(baseState())).toMatchObject({
      subtotalCents: 15000,
      taxCents: 0,
      totalCents: 15000,
      amountDueCents: 15000,
      schedules: [{ label: "Full payment", amountCents: 15000 }],
    });
  });

  it("calculates a $150 fixed-price item with 13% tax", () => {
    expect(calculateInvoiceDraftTotals(baseState({ taxEnabled: true, taxRatePercent: "13" }))).toMatchObject({
      subtotalCents: 15000,
      taxCents: 1950,
      totalCents: 16950,
      amountDueCents: 16950,
    });
  });

  it("calculates a $250 fixed-price item", () => {
    expect(calculateInvoiceDraftTotals(baseState({
      items: [{
        itemType: "service_tier",
        name: "Base Photoshoot - Tier 1 Couple/Family",
        description: "Couple or family portrait session",
        pricingMode: "fixed",
        quantity: 1,
        unitPriceCents: 25000,
        minimumHours: null,
      }],
    }))).toMatchObject({
      subtotalCents: 25000,
      totalCents: 25000,
    });
  });

  it("calculates hourly pricing from hours and unit cents", () => {
    expect(calculateInvoiceDraftTotals(baseState({
      items: [{
        itemType: "service_tier",
        name: "Event Photography - Tier 1",
        description: "Hourly event photography coverage",
        pricingMode: "hourly",
        quantity: 2,
        unitPriceCents: 12500,
        minimumHours: 2,
      }],
    }))).toMatchObject({
      subtotalCents: 25000,
      totalCents: 25000,
    });
  });

  it("splits a 50/50 deposit schedule and preserves odd-cent totals", () => {
    const totals = calculateInvoiceDraftTotals(baseState({
      taxEnabled: true,
      taxRatePercent: "13",
      paymentTermsMode: "deposit_balance",
      depositPercent: "50",
      items: [{
        itemType: "custom",
        name: "Odd-cent edited item",
        description: "",
        pricingMode: "fixed",
        quantity: 1,
        unitPriceCents: 15001,
        minimumHours: null,
      }],
    }));

    expect(totals.totalCents).toBe(16951);
    expect(totals.schedules).toEqual([
      { label: "Deposit", amountCents: 8476, dueDate: "2026-08-19" },
      { label: "Remaining balance", amountCents: 8475, dueDate: "2026-09-02" },
    ]);
    expect(totals.schedules.reduce((sum, schedule) => sum + schedule.amountCents, 0)).toBe(totals.totalCents);
  });

  it("splits a $110 invoice into $55 deposit and $55 balance", () => {
    const totals = calculateInvoiceDraftTotals(baseState({
      paymentTermsMode: "deposit_balance",
      depositPercent: "50",
      items: [{
        itemType: "service_tier",
        name: "Prom / HOCO - Tier 1",
        description: "Solo prom or homecoming coverage.",
        pricingMode: "fixed",
        quantity: 1,
        unitPriceCents: 11000,
        minimumHours: null,
      }],
    }));

    expect(totals.totalCents).toBe(11000);
    expect(totals.schedules).toEqual([
      { label: "Deposit", amountCents: 5500, dueDate: "2026-08-19" },
      { label: "Remaining balance", amountCents: 5500, dueDate: "2026-09-02" },
    ]);
    expect(totals.schedules.reduce((sum, schedule) => sum + schedule.amountCents, 0)).toBe(totals.totalCents);
  });

  it("splits a $169.50 invoice into integer-cent payments that sum exactly", () => {
    const totals = calculateInvoiceDraftTotals(baseState({
      paymentTermsMode: "deposit_balance",
      depositPercent: "50",
      items: [{
        itemType: "custom",
        name: "Full payment with cents",
        description: "",
        pricingMode: "fixed",
        quantity: 1,
        unitPriceCents: 16950,
        minimumHours: null,
      }],
    }));

    expect(totals.schedules).toEqual([
      { label: "Deposit", amountCents: 8475, dueDate: "2026-08-19" },
      { label: "Remaining balance", amountCents: 8475, dueDate: "2026-09-02" },
    ]);
    expect(totals.schedules.every((schedule) => Number.isInteger(schedule.amountCents))).toBe(true);
    expect(totals.schedules.reduce((sum, schedule) => sum + schedule.amountCents, 0)).toBe(16950);
  });

  it("maps a custom edited price into the create payload as integer cents", () => {
    const payload = invoicePayload(baseState({
      taxEnabled: true,
      taxRatePercent: "13",
      paymentTermsMode: "deposit_balance",
      items: [{
        itemType: "custom",
        name: "Edited package price",
        description: "Manual adjustment",
        pricingMode: "fixed",
        quantity: 1,
        unitPriceCents: 17550,
        minimumHours: null,
      }],
    }));

    expect(payload.lineItems[0]).toMatchObject({
      name: "Edited package price",
      quantity: 1,
      unitPriceCents: 17550,
    });
    expect(payload.paymentTerms).toMatchObject({
      mode: "deposit_balance",
      depositPercent: 50,
    });
  });
});
