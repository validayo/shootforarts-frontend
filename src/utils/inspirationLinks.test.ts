import { describe, expect, it } from "vitest";
import { parseInspirationLinks, serializeInspirationLinks } from "./inspirationLinks";

describe("inspirationLinks utilities", () => {
  it("normalizes and deduplicates valid links across separators", () => {
    const raw = "pinterest.com/board, https://instagram.com/look;\nwww.tiktok.com/@creator\npinterest.com/board";
    const parsed = parseInspirationLinks(raw);

    expect(parsed.validUrls).toEqual([
      "https://pinterest.com/board",
      "https://instagram.com/look",
      "https://www.tiktok.com/@creator",
    ]);
    expect(parsed.invalidEntries).toEqual([]);
  });

  it("returns invalid entries without blocking valid links", () => {
    const parsed = parseInspirationLinks("mood board, https://example.com/look");

    expect(parsed.validUrls).toEqual(["https://example.com/look"]);
    expect(parsed.invalidEntries).toEqual(["mood board"]);
  });

  it("serializes only validated links for storage", () => {
    expect(serializeInspirationLinks("www.example.com/a;not_a_link")).toBe("https://www.example.com/a");
  });
});
