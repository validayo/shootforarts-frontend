import { Photo, ContactFormData, Contact } from "../utils";
import type { AdminSubscriber } from "../utils/adminHelpers";
import { supabase } from "./supabaseClient";

// Supabase Edge Functions base URL
export const BASE = "https://obhiuvlfopgtbgjuznok.functions.supabase.co";

// Contact form submit
export async function submitContact(payload: ContactFormData) {
  const r = await fetch(`${BASE}/contact-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Newsletter subscribe
export async function subscribe(email: string) {
  const r = await fetch(`${BASE}/newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Gallery fetch (with optional transforms)
export async function getGallery(
  category: string = "ALL",
  opts: { width?: number; quality?: number; format?: string } = { width: 1200, quality: 80, format: "webp" }
): Promise<Photo[]> {
  const params = new URLSearchParams({ category });
  if (opts) {
    if (opts.width) params.set("width", String(opts.width));
    if (opts.quality) params.set("quality", String(opts.quality));
    if (opts.format) params.set("format", opts.format);
  }
  const r = await fetch(`${BASE}/gallery?${params.toString()}`);
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  // Expecting { success, count, photos }
  return Array.isArray(data?.photos) ? data.photos : [];
}

// Upload photos (FormData with repeated files)
export async function uploadPhotos(category: string, files: File[] | FileList) {
  const fd = new FormData();
  fd.append("category", category);
  const arr: File[] = Array.isArray(files) ? (files as File[]) : Array.from(files as FileList);
  for (const f of arr) fd.append("files", f, f.name);
  const r = await fetch(`${BASE}/upload-photos`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
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
