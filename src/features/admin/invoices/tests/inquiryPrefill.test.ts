import { describe, expect, it } from "vitest";

import { buildInquiryPrefillItems } from "../utils/inquiryPrefill";
import type { Contact, ServiceCatalogAddon, ServiceCatalogService, ServiceCatalogTier } from "../../../../utils/types";
import type { DraftCatalogLineItem } from "../utils/catalogLineItems";

const emptyItem: DraftCatalogLineItem = {
  itemType: "custom",
  name: "",
  description: "",
  pricingMode: "fixed",
  quantity: 1,
  unitPriceCents: 0,
  minimumHours: null,
};

const services: ServiceCatalogService[] = [{
  id: "service-prom",
  slug: "prom-hoco",
  display_name: "Prom / HOCO",
  description: null,
  visibility: "public",
  booking_eligible: true,
  sort_order: 1,
}];

const tiers: ServiceCatalogTier[] = [{
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
}];

const addons: ServiceCatalogAddon[] = [{
  id: "addon-rush",
  service_id: null,
  slug: "rush-delivery-48hr",
  display_name: "Rush Delivery (48hr turnaround)",
  pricing_mode: "fixed",
  price_label: "$50",
  fixed_amount_cents: 5000,
  hourly_rate_cents: null,
  description: "48-hour turnaround.",
  visibility: "public",
  sort_order: 1,
}];

const contact = (overrides: Partial<Contact> = {}): Contact => ({
  id: "contact-1",
  firstName: "Cam",
  lastName: "Client",
  email: "cam@example.com",
  phone: "6475550102",
  service: "Prom / HOCO",
  service_tier: "Tier 1",
  occasion: "Prom portraits",
  date: "2026-09-02",
  add_ons: [],
  ...overrides,
});

describe("invoice inquiry prefill", () => {
  it("maps an inquiry service and tier to the authoritative catalog item", () => {
    const result = buildInquiryPrefillItems({ contact: contact(), services, tiers, addons, emptyItem });

    expect(result.referenceLabel).toBe("Prom / HOCO · Tier 1");
    expect(result.needsReview).toBeNull();
    expect(result.matchedTierId).toBe("tier-prom-1");
    expect(result.items[0]).toMatchObject({
      sourceServiceCatalogTierId: "tier-prom-1",
      name: "Prom / HOCO — Tier 1",
      description: "Solo prom or homecoming coverage. | 15-20 edited photos",
      unitPriceCents: 11000,
    });
  });

  it("prefills matching add-ons without mutating the inquiry", () => {
    const source = contact({ add_ons: ["Rush Delivery (48hr turnaround)"] });
    const result = buildInquiryPrefillItems({ contact: source, services, tiers, addons, emptyItem });

    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({
      sourceServiceCatalogAddonId: "addon-rush",
      itemType: "addon",
      unitPriceCents: 5000,
    });
    expect(source.add_ons).toEqual(["Rush Delivery (48hr turnaround)"]);
  });

  it("does not guess when a historical tier is unmatched", () => {
    const result = buildInquiryPrefillItems({
      contact: contact({ service_tier: "Old custom package" }),
      services,
      tiers,
      addons,
      emptyItem,
    });

    expect(result.items).toEqual([emptyItem]);
    expect(result.matchedTierId).toBeNull();
    expect(result.needsReview).toBe("Tier needs review: inquiry tier does not match one current catalog tier.");
  });
});
