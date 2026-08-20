import { describe, expect, it } from "vitest";

import {
  addCatalogItemWithoutDuplicate,
  buildCatalogTierOptions,
  catalogTierToDraftItem,
  formatCatalogTierPrice,
  getCatalogTierUnitPriceCents,
  type DraftCatalogLineItem,
} from "../utils/catalogLineItems";
import type { ServiceCatalogService, ServiceCatalogTier } from "../../../../utils/types";

const services: ServiceCatalogService[] = [
  {
    id: "service-portraits",
    slug: "base-photoshoot",
    display_name: "Portraits",
    description: null,
    visibility: "public",
    booking_eligible: true,
    sort_order: 1,
  },
  {
    id: "service-events",
    slug: "event-photography",
    display_name: "Events",
    description: null,
    visibility: "public",
    booking_eligible: true,
    sort_order: 2,
  },
  {
    id: "service-custom",
    slug: "custom-creative",
    display_name: "Custom Creative",
    description: null,
    visibility: "internal",
    booking_eligible: false,
    sort_order: 3,
  },
];

const fixedTier: ServiceCatalogTier = {
  id: "tier-portrait",
  service_id: "service-portraits",
  slug: "tier-1-solo",
  display_name: "Tier 1 Solo Shoot",
  pricing_mode: "fixed",
  fixed_amount_cents: 15000,
  hourly_rate_cents: null,
  minimum_hours: null,
  duration_minutes: 60,
  deliverables_json: ["10 edited photos"],
  description: "Solo portrait session",
  visibility: "public",
  booking_eligible: true,
  sort_order: 1,
};

const hourlyTier: ServiceCatalogTier = {
  id: "tier-event",
  service_id: "service-events",
  slug: "tier-1",
  display_name: "Tier 1",
  pricing_mode: "hourly",
  fixed_amount_cents: null,
  hourly_rate_cents: 12500,
  minimum_hours: 2,
  duration_minutes: null,
  deliverables_json: ["Edited event gallery"],
  description: "Event coverage",
  visibility: "public",
  booking_eligible: true,
  sort_order: 1,
};

const customQuoteTier: ServiceCatalogTier = {
  id: "tier-custom",
  service_id: "service-custom",
  slug: "quote",
  display_name: "Quote",
  pricing_mode: "custom_quote",
  price_label: "Custom quote required",
  fixed_amount_cents: null,
  hourly_rate_cents: null,
  minimum_hours: null,
  duration_minutes: null,
  deliverables_json: ["Scope review"],
  description: "Manual review for custom scope",
  visibility: "internal",
  booking_eligible: false,
  sort_order: 1,
};

const emptyItem: DraftCatalogLineItem = {
  itemType: "custom",
  name: "",
  description: "",
  pricingMode: "fixed",
  quantity: 1,
  unitPriceCents: 0,
  minimumHours: null,
};

describe("invoice catalog line item helpers", () => {
  it("formats catalog picker labels with service, tier, and price", () => {
    expect(buildCatalogTierOptions(services, [fixedTier, hourlyTier]).map((option) => option.label)).toEqual([
      "Portraits — Tier 1 Solo Shoot — $150",
      "Events — Tier 1 — $125/hr",
    ]);
  });

  it("maps fixed and hourly catalog prices into unit cents", () => {
    expect(getCatalogTierUnitPriceCents(fixedTier)).toBe(15000);
    expect(getCatalogTierUnitPriceCents(hourlyTier)).toBe(12500);
    expect(formatCatalogTierPrice(hourlyTier)).toBe("$125/hr");
    expect(formatCatalogTierPrice(customQuoteTier)).toBe("Custom quote required");
  });

  it("snapshots service, tier, description, pricing mode, price, and minimum hours", () => {
    const item = catalogTierToDraftItem(hourlyTier, services[1]);

    expect(item).toMatchObject({
      sourceServiceCatalogTierId: "tier-event",
      itemType: "service_tier",
      name: "Events — Tier 1",
      description: "Event coverage | Edited event gallery",
      pricingMode: "hourly",
      quantity: 2,
      unitPriceCents: 12500,
      minimumHours: 2,
    });
  });

  it("replaces the initial empty placeholder and prevents duplicate catalog items", () => {
    const item = catalogTierToDraftItem(fixedTier, services[0]);
    const first = addCatalogItemWithoutDuplicate([emptyItem], item, emptyItem);
    const second = addCatalogItemWithoutDuplicate(first.items, item, emptyItem);

    expect(first.items).toHaveLength(1);
    expect(first.items[0].name).toBe("Portraits — Tier 1 Solo Shoot");
    expect(first.added).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(second.duplicate).toBe(true);
  });
});
