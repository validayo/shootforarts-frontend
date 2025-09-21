import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "https://deno.land/x/imagemagick_deno@0.0.28/mod.ts";

await initializeImageMagick(); // init WASM once

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role (server-only)
);

Deno.serve(async (req) => {
  try {
    const { id, path } = await req.json();
    const bucket = "images";

    // 1) Download original
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(path);
    if (dlErr || !file) throw dlErr;
    const input = new Uint8Array(await file.arrayBuffer());

    // helper: resize to width, encode jpeg
    const resize = async (bytes: Uint8Array, width: number) => {
      let out = new Uint8Array();
      await ImageMagick.read(bytes, (image) => {
        image.resize(width, 0); // keep aspect ratio
        image.write(MagickFormat.Jpeg, (data) => (out = data));
      });
      return out;
    };

    // 2) Generate sizes
    const thumb = await resize(input, 400);
    const medium = await resize(input, 800);
    const large = await resize(input, 1600);

    // 3) Upload resized files
    const base = path.replace(/^portfolio\//, "portfolio/resized/");
    const uploads: Record<string, string> = {};

    const put = async (suffix: string, bytes: Uint8Array) => {
      const newPath = `${base}-${suffix}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(bucket).upload(newPath, bytes, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(newPath);
      return data.publicUrl;
    };

    uploads.thumb = await put("thumb", thumb);
    uploads.medium = await put("medium", medium);
    uploads.large = await put("large", large);

    // 4) Update DB row
    const { error: updErr } = await supabase
      .from("photos")
      .update({
        url_thumb: uploads.thumb,
        url_medium: uploads.medium,
        url_large: uploads.large,
      })
      .eq("id", id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true, uploads }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error("process-image error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500 });
  }
});
