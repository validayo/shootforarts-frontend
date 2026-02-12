import { Photo, ContactFormData, Contact } from "../utils";
import type { AdminSubscriber } from "../utils/adminHelpers";
import { supabase } from "./supabaseClient";
import { getAccessToken } from "./auth";

// Supabase Edge Functions base URL
export const BASE = "https://obhiuvlfopgtbgjuznok.functions.supabase.co";
// Dedicated upload backend (Render)
const DEFAULT_RENDER_BASE = "https://shootforarts-backend.onrender.com";
export const UPLOAD_BASE = (import.meta.env.VITE_UPLOAD_BASE as string | undefined) || DEFAULT_RENDER_BASE;
const uploadEndpoint = `${UPLOAD_BASE.replace(/\/$/, "")}/upload-photos`;
const photoSelectCols = "id, url, category, uploaded_at, is_top, top_rank, season_tag, season_rank";

export type SeasonTag = "winter" | "spring" | "summer" | "fall";

function normalizeCategoryFilter(category?: string) {
  if (!category) return null;
  const trimmed = category.trim();
  if (!trimmed || trimmed.toUpperCase() === "ALL") return null;
  return trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
}

async function parseJsonOrText<T = unknown>(response: Response): Promise<T> {
  const bodyText = await response.text();
  if (!bodyText) return {} as T;
  try {
    return JSON.parse(bodyText) as T;
  } catch {
    return { message: bodyText } as T;
  }
}

function getStorageObjectFromPublicUrl(photoUrl?: string | null): { bucket: string; objectPath: string } | null {
  if (!photoUrl) return null;
  try {
    const parsed = new URL(photoUrl);
    const segments = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
    const objectIndex = segments.findIndex((segment) => segment === "object");
    if (objectIndex === -1) return null;

    const mode = segments[objectIndex + 1];
    const validModes = new Set(["public", "sign", "authenticated"]);
    if (!mode || !validModes.has(mode)) return null;

    const bucket = segments[objectIndex + 2];
    const objectPath = segments.slice(objectIndex + 3).join("/");
    if (!bucket || !objectPath) return null;
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

// Contact form submit
export async function submitContact(payload: ContactFormData) {
  const r = await fetch(`${BASE}/contact-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonOrText(r);
}

// Newsletter subscribe
export async function subscribe(email: string) {
  const r = await fetch(`${BASE}/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonOrText(r);
}

// Gallery fetch (with optional transforms)
export async function getGallery(
  category: string = "ALL",
  opts: { width?: number; quality?: number; format?: string } = { width: 1200, quality: 80, format: "webp" },
  extra?: { season?: string; include_top?: boolean; include_season?: boolean; top_limit?: number }
): Promise<Photo[]> {
  const params = new URLSearchParams({ category });
  if (opts) {
    if (opts.width) params.set("width", String(opts.width));
    if (opts.quality) params.set("quality", String(opts.quality));
    if (opts.format) params.set("format", opts.format);
  }
  if (extra) {
    if (extra.season) params.set("season", extra.season);
    if (typeof extra.include_top === "boolean") params.set("include_top", String(extra.include_top));
    if (typeof extra.include_season === "boolean") params.set("include_season", String(extra.include_season));
    if (typeof extra.top_limit === "number" && Number.isFinite(extra.top_limit)) {
      params.set("top_limit", String(extra.top_limit));
    }
  }
  const r = await fetch(`${BASE}/gallery?${params.toString()}`);
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  // Expecting { success, count, photos }
  return Array.isArray(data?.photos) ? data.photos : [];
}

// Upload photos (FormData with repeated files)
export async function uploadPhotos(category: string, files: File[] | FileList) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.append("category", category);
  const arr: File[] = Array.isArray(files) ? (files as File[]) : Array.from(files as FileList);
  for (const f of arr) fd.append("files", f, f.name);

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const r = await fetch(uploadEndpoint, { method: "POST", body: fd, headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getTopPhotos(category?: string): Promise<Photo[]> {
  const normalized = normalizeCategoryFilter(category);
  let query = supabase
    .from("photos")
    .select(photoSelectCols)
    .eq("is_top", true)
    .order("top_rank", { ascending: true, nullsFirst: false })
    .order("uploaded_at", { ascending: false });

  if (normalized) query = query.eq("category", normalized);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSeasonPhotos(season: string, category?: string): Promise<Photo[]> {
  const normalized = normalizeCategoryFilter(category);
  const seasonValue = season.trim().toLowerCase();
  let query = supabase
    .from("photos")
    .select(photoSelectCols)
    .eq("season_tag", seasonValue)
    .eq("is_top", false)
    .order("season_rank", { ascending: true, nullsFirst: false })
    .order("uploaded_at", { ascending: false });

  if (normalized) query = query.eq("category", normalized);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAllPhotos(category?: string): Promise<Photo[]> {
  const normalized = normalizeCategoryFilter(category);
  let query = supabase.from("photos").select(photoSelectCols).order("uploaded_at", { ascending: false });

  if (normalized) query = query.eq("category", normalized);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function setTop(id: string, value: boolean): Promise<void> {
  const updates: Pick<Photo, "is_top" | "top_rank"> = {
    is_top: value,
    top_rank: null,
  };
  const { error } = await supabase.from("photos").update(updates).eq("id", id);
  if (error) throw error;
}

export async function setSeasonTag(id: string, season: SeasonTag | null): Promise<void> {
  const updates: Pick<Photo, "season_tag" | "season_rank"> = {
    season_tag: season,
    season_rank: null,
  };
  const { error } = await supabase.from("photos").update(updates).eq("id", id);
  if (error) throw error;
}

export async function saveTopOrder(updates: Array<{ id: string; top_rank: number }>): Promise<void> {
  const writes = updates.map(({ id, top_rank }) => supabase.from("photos").update({ top_rank }).eq("id", id));
  const results = await Promise.all(writes);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;
}

export async function saveSeasonOrder(updates: Array<{ id: string; season_rank: number }>): Promise<void> {
  const writes = updates.map(({ id, season_rank }) => supabase.from("photos").update({ season_rank }).eq("id", id));
  const results = await Promise.all(writes);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;
}

export async function deletePhoto(photoOrId: Pick<Photo, "id" | "url"> | string): Promise<void> {
  const id = typeof photoOrId === "string" ? photoOrId : photoOrId.id;

  let photoUrl = typeof photoOrId === "string" ? undefined : photoOrId.url;
  if (!photoUrl) {
    const { data, error } = await supabase.from("photos").select("url").eq("id", id).maybeSingle();
    if (error) throw error;
    photoUrl = data?.url ?? undefined;
  }

  const storageTarget = getStorageObjectFromPublicUrl(photoUrl);
  if (storageTarget) {
    const { error: storageError } = await supabase.storage.from(storageTarget.bucket).remove([storageTarget.objectPath]);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw error;
}

export async function getContactSubmissions(): Promise<Contact[]> {
  const { data, error } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNewsletterSubscribers(): Promise<AdminSubscriber[]> {
  const { data, error } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
