import type { Contact, ServiceCatalogAddon, ServiceCatalogService, ServiceCatalogTier } from "../../../../utils/types";
import {
  addCatalogItemWithoutDuplicate,
  catalogAddonToDraftItem,
  catalogTierToDraftItem,
  type DraftCatalogLineItem,
} from "./catalogLineItems";

export type InquiryPrefillResult = {
  referenceLabel: string | null;
  items: DraftCatalogLineItem[];
  matchedTierId: string | null;
  needsReview: string | null;
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const slugFromLabel = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const serviceMatches = (contactService: string, service: ServiceCatalogService) => {
  const normalized = normalize(contactService);
  return normalized === normalize(service.display_name) || slugFromLabel(contactService) === service.slug;
};

const tierMatches = (contactTier: string, tier: ServiceCatalogTier) => {
  const normalized = normalize(contactTier);
  return normalized === normalize(tier.display_name) || slugFromLabel(contactTier) === tier.slug;
};

const addonMatches = (contactAddon: string, addon: ServiceCatalogAddon) => {
  const normalized = normalize(contactAddon);
  return normalized === normalize(addon.display_name) || slugFromLabel(contactAddon) === addon.slug;
};

export function buildInquiryReferenceLabel(contact: Contact): string | null {
  if (!contact.service && !contact.service_tier) return null;
  return [contact.service, contact.service_tier].filter(Boolean).join(" · ");
}

export function buildInquiryPrefillItems(input: {
  contact: Contact;
  services: ServiceCatalogService[];
  tiers: ServiceCatalogTier[];
  addons: ServiceCatalogAddon[];
  emptyItem: DraftCatalogLineItem;
}): InquiryPrefillResult {
  const { contact, services, tiers, addons, emptyItem } = input;
  const referenceLabel = buildInquiryReferenceLabel(contact);
  const service = contact.service ? services.find((candidate) => serviceMatches(contact.service, candidate)) ?? null : null;

  if (!contact.service_tier) {
    return {
      referenceLabel,
      items: [emptyItem],
      matchedTierId: null,
      needsReview: contact.service ? "Tier needs review: inquiry has no selected tier." : null,
    };
  }

  if (!service) {
    return {
      referenceLabel,
      items: [emptyItem],
      matchedTierId: null,
      needsReview: "Tier needs review: inquiry service does not match the current catalog.",
    };
  }

  const matchingTiers = tiers.filter((tier) => tier.service_id === service.id && tierMatches(contact.service_tier ?? "", tier));
  if (matchingTiers.length !== 1) {
    return {
      referenceLabel,
      items: [emptyItem],
      matchedTierId: null,
      needsReview: "Tier needs review: inquiry tier does not match one current catalog tier.",
    };
  }

  const tierItem = catalogTierToDraftItem(matchingTiers[0], service);
  const addOnItems = (contact.add_ons ?? [])
    .map((contactAddon) => {
      const matchingAddons = addons.filter((addon) => addonMatches(contactAddon, addon));
      return matchingAddons.length === 1 ? catalogAddonToDraftItem(matchingAddons[0]) : null;
    })
    .filter((item): item is DraftCatalogLineItem => item !== null);

  const withTier = addCatalogItemWithoutDuplicate([emptyItem], tierItem, emptyItem).items;
  const items = addOnItems.reduce(
    (current, addonItem) => addCatalogItemWithoutDuplicate(current, addonItem, emptyItem).items,
    withTier,
  );

  return {
    referenceLabel,
    items,
    matchedTierId: tierItem.sourceServiceCatalogTierId ?? null,
    needsReview: null,
  };
}
