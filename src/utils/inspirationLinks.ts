export type ParsedInspirationLinks = {
  validUrls: string[];
  invalidEntries: string[];
};

const ENTRY_SPLIT_REGEX = /[\n,;]+/;
const DOMAIN_LIKE_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i;

const normalizeCandidate = (entry: string) => {
  const trimmed = entry.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed) || DOMAIN_LIKE_REGEX.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

export const parseInspirationLinks = (raw?: string | null): ParsedInspirationLinks => {
  if (!raw || !raw.trim()) {
    return { validUrls: [], invalidEntries: [] };
  }

  const tokens = raw
    .split(ENTRY_SPLIT_REGEX)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const valid = new Set<string>();
  const invalid: string[] = [];

  tokens.forEach((token) => {
    const candidate = normalizeCandidate(token);
    if (!candidate) return;

    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        invalid.push(token);
        return;
      }
      valid.add(parsed.toString());
    } catch {
      invalid.push(token);
    }
  });

  return {
    validUrls: Array.from(valid),
    invalidEntries: invalid,
  };
};

export const serializeInspirationLinks = (raw?: string | null) => parseInspirationLinks(raw).validUrls.join(", ");
