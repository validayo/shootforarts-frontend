import { describe, expect, it } from "vitest";
import { toSupabasePublicObjectUrl, toSupabaseRenderImageUrl } from "./supabaseImage";

describe("toSupabaseRenderImageUrl", () => {
  it("converts public storage URLs to render URLs with transform params", () => {
    const source =
      "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/Portraits/example.webp";

    const transformed = toSupabaseRenderImageUrl(source, { width: 480, quality: 70, format: "webp" });
    const parsed = new URL(transformed);

    expect(parsed.pathname).toBe("/storage/v1/render/image/public/images/Portraits/example.webp");
    expect(parsed.searchParams.get("width")).toBe("480");
    expect(parsed.searchParams.get("quality")).toBe("70");
    expect(parsed.searchParams.get("format")).toBe("webp");
  });

  it("keeps non-Supabase URLs unchanged", () => {
    const source = "https://example.com/path/to/image.webp";
    expect(toSupabaseRenderImageUrl(source, { width: 480 })).toBe(source);
  });

  it("preserves existing query params while overriding requested transforms", () => {
    const source =
      "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/render/image/public/images/Portraits/example.webp?token=abc&width=200";

    const transformed = toSupabaseRenderImageUrl(source, { width: 1200, quality: 85 });
    const parsed = new URL(transformed);

    expect(parsed.searchParams.get("token")).toBe("abc");
    expect(parsed.searchParams.get("width")).toBe("1200");
    expect(parsed.searchParams.get("quality")).toBe("85");
  });
});

describe("toSupabasePublicObjectUrl", () => {
  it("converts render URLs back to object/public URLs and strips transform params", () => {
    const source =
      "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/render/image/public/images/Portraits/example.webp?token=abc&width=480&quality=70&format=webp";

    const normalized = toSupabasePublicObjectUrl(source);
    const parsed = new URL(normalized);

    expect(parsed.pathname).toBe("/storage/v1/object/public/images/Portraits/example.webp");
    expect(parsed.searchParams.get("token")).toBe("abc");
    expect(parsed.searchParams.get("width")).toBeNull();
    expect(parsed.searchParams.get("quality")).toBeNull();
    expect(parsed.searchParams.get("format")).toBeNull();
  });

  it("keeps object/public URLs unchanged", () => {
    const source =
      "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/Portraits/example.webp";
    expect(toSupabasePublicObjectUrl(source)).toBe(source);
  });
});
