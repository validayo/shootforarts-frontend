import type { InvoicePricingMode, ServiceCatalogAddon, ServiceCatalogService, ServiceCatalogTier } from "../../../../utils/types";

export type DraftCatalogLineItem = {
  sourceServiceCatalogTierId?: string | null;
  sourceServiceCatalogAddonId?: string | null;
  itemType: "service_tier" | "addon" | "custom";
  name: string;
  description: string;
  pricingMode: InvoicePricingMode;
  quantity: number;
  unitPriceCents: number;
  minimumHours?: number | null;
};

export type CatalogTierOption = {
  service: ServiceCatalogService;
  tier: ServiceCatalogTier;
  label: string;
};

const formatCents = (value: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((value || 0) / 100);

export function getCatalogTierUnitPriceCents(tier: ServiceCatalogTier): number {
  if (tier.pricing_mode === "hourly") return tier.hourly_rate_cents ?? 0;
  return tier.fixed_amount_cents ?? 0;
}

export function getCatalogAddonUnitPriceCents(addon: ServiceCatalogAddon): number {
  if (addon.pricing_mode === "hourly") return addon.hourly_rate_cents ?? 0;
  return addon.fixed_amount_cents ?? 0;
}

export function formatCatalogTierPrice(tier: ServiceCatalogTier, currency = "CAD"): string {
  if (tier.pricing_mode === "custom_quote" || tier.pricing_mode === "variable") {
    return tier.price_label ?? "Custom quote";
  }

  const price = formatCents(getCatalogTierUnitPriceCents(tier), currency);
  return tier.pricing_mode === "hourly" ? `${price}/hr` : price;
}

export function buildCatalogTierOptions(
  services: ServiceCatalogService[],
  tiers: ServiceCatalogTier[],
  currency = "CAD",
): CatalogTierOption[] {
  const servicesById = new Map(services.map((service) => [service.id, service]));
  return tiers
    .map((tier) => {
      const service = servicesById.get(tier.service_id);
      if (!service) return null;
      return {
        service,
        tier,
        label: `${service.display_name} — ${tier.display_name} — ${formatCatalogTierPrice(tier, currency)}`,
      };
    })
    .filter((option): option is CatalogTierOption => option !== null);
}

export function catalogTierToDraftItem(
  tier: ServiceCatalogTier,
  service: ServiceCatalogService,
): DraftCatalogLineItem {
  const deliverables = Array.isArray(tier.deliverables_json) ? tier.deliverables_json : [];
  const description = [tier.description, ...deliverables].filter(Boolean).join(" | ");
  const minimumHours = tier.minimum_hours == null ? null : Number(tier.minimum_hours);

  return {
    sourceServiceCatalogTierId: tier.id,
    itemType: "service_tier",
    name: `${service.display_name} — ${tier.display_name}`,
    description,
    pricingMode: tier.pricing_mode,
    quantity: tier.pricing_mode === "hourly" ? minimumHours ?? 1 : 1,
    unitPriceCents: getCatalogTierUnitPriceCents(tier),
    minimumHours,
  };
}

export function catalogAddonToDraftItem(addon: ServiceCatalogAddon): DraftCatalogLineItem {
  return {
    sourceServiceCatalogAddonId: addon.id,
    itemType: "addon",
    name: addon.display_name,
    description: addon.description ?? "",
    pricingMode: addon.pricing_mode,
    quantity: addon.pricing_mode === "hourly" ? 1 : 1,
    unitPriceCents: getCatalogAddonUnitPriceCents(addon),
    minimumHours: null,
  };
}

export function addCatalogItemWithoutDuplicate<T extends DraftCatalogLineItem>(
  currentItems: T[],
  nextItem: T,
  emptyItem: T,
): { items: T[]; added: boolean; duplicate: boolean } {
  if (
    nextItem.sourceServiceCatalogTierId &&
    currentItems.some((item) => item.sourceServiceCatalogTierId === nextItem.sourceServiceCatalogTierId)
  ) {
    return { items: currentItems, added: false, duplicate: true };
  }
  if (
    nextItem.sourceServiceCatalogAddonId &&
    currentItems.some((item) => item.sourceServiceCatalogAddonId === nextItem.sourceServiceCatalogAddonId)
  ) {
    return { items: currentItems, added: false, duplicate: true };
  }

  const onlyEmptyPlaceholder =
    currentItems.length === 1 &&
    currentItems[0].itemType === "custom" &&
    !currentItems[0].name.trim() &&
    currentItems[0].unitPriceCents === emptyItem.unitPriceCents;

  return {
    items: onlyEmptyPlaceholder ? [nextItem] : [...currentItems, nextItem],
    added: true,
    duplicate: false,
  };
}
