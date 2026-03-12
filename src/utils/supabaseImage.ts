type SupabaseTransformOptions = {
  width?: number;
  quality?: number;
  format?: string;
};

const SUPABASE_PUBLIC_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";

export const toSupabasePublicObjectUrl = (sourceUrl: string): string => {
  if (!sourceUrl) return sourceUrl;

  try {
    const parsed = new URL(sourceUrl);
    const pathname = parsed.pathname;

    if (pathname.includes(SUPABASE_PUBLIC_PATH)) return sourceUrl;
    if (!pathname.includes(SUPABASE_RENDER_PATH)) return sourceUrl;

    const objectPath = pathname.split(SUPABASE_RENDER_PATH)[1] ?? "";
    if (!objectPath) return sourceUrl;

    const normalized = new URL(`${parsed.origin}${SUPABASE_PUBLIC_PATH}${objectPath}`);
    const params = new URLSearchParams(parsed.search);
    params.delete("width");
    params.delete("height");
    params.delete("quality");
    params.delete("format");
    params.delete("resize");
    normalized.search = params.toString();
    return normalized.toString();
  } catch {
    return sourceUrl;
  }
};

export const toSupabaseRenderImageUrl = (sourceUrl: string, options: SupabaseTransformOptions = {}): string => {
  if (!sourceUrl) return sourceUrl;

  try {
    const parsed = new URL(sourceUrl);
    const pathname = parsed.pathname;

    let objectPath = "";
    if (pathname.includes(SUPABASE_RENDER_PATH)) {
      objectPath = pathname.split(SUPABASE_RENDER_PATH)[1] ?? "";
    } else if (pathname.includes(SUPABASE_PUBLIC_PATH)) {
      objectPath = pathname.split(SUPABASE_PUBLIC_PATH)[1] ?? "";
    } else {
      return sourceUrl;
    }

    if (!objectPath) return sourceUrl;

    const transformed = new URL(`${parsed.origin}${SUPABASE_RENDER_PATH}${objectPath}`);
    const params = new URLSearchParams(parsed.search);

    if (typeof options.width === "number") params.set("width", String(options.width));
    if (typeof options.quality === "number") params.set("quality", String(options.quality));
    if (options.format) params.set("format", options.format);

    transformed.search = params.toString();
    return transformed.toString();
  } catch {
    return sourceUrl;
  }
};
