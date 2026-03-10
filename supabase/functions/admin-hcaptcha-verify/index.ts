import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_PRUNE_INTERVAL_MS = 30 * 1000;
const RATE_LIMIT_MAX_BUCKETS = 5000;
const requestBuckets = new Map<string, { timestamps: number[]; lastSeen: number }>();
let lastPruneAt = 0;

const sanitizeIp = (raw: string | null): string | null => {
  if (!raw) return null;
  let candidate = raw.trim();
  if (!candidate || candidate.toLowerCase() === "unknown") return null;

  // Normalize common proxy formats: "[ipv6]:port" or "ipv4:port".
  if (candidate.startsWith("[")) {
    const closing = candidate.indexOf("]");
    if (closing > 1) candidate = candidate.slice(1, closing);
  } else {
    const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    if (ipv4WithPort) candidate = ipv4WithPort[1];
  }

  // Strip IPv6 zone identifiers like "fe80::1%lo0".
  candidate = candidate.split("%")[0];

  return /^[0-9a-fA-F:.]+$/.test(candidate) ? candidate : null;
};

const getClientIp = (request: Request): string => {
  // Prefer proxy-provided single IP headers first.
  const trustedDirectHeaders = ["x-real-ip", "cf-connecting-ip", "fly-client-ip", "x-client-ip"];
  for (const headerName of trustedDirectHeaders) {
    const ip = sanitizeIp(request.headers.get(headerName));
    if (ip) return ip;
  }

  // If forwarded chain exists, use the last hop added by the trusted gateway.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const chain = forwardedFor.split(",").map((entry) => sanitizeIp(entry)).filter((entry): entry is string => Boolean(entry));
    if (chain.length > 0) return chain[chain.length - 1];
  }

  return "unknown";
};

const pruneRateLimitBuckets = (now: number) => {
  if (now - lastPruneAt < RATE_LIMIT_PRUNE_INTERVAL_MS && requestBuckets.size <= RATE_LIMIT_MAX_BUCKETS) {
    return;
  }

  lastPruneAt = now;

  for (const [ip, bucket] of requestBuckets.entries()) {
    const recent = bucket.timestamps.filter((timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      requestBuckets.delete(ip);
      continue;
    }
    requestBuckets.set(ip, { timestamps: recent, lastSeen: recent[recent.length - 1] });
  }

  if (requestBuckets.size <= RATE_LIMIT_MAX_BUCKETS) return;

  const byOldest = [...requestBuckets.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  const removeCount = requestBuckets.size - RATE_LIMIT_MAX_BUCKETS;
  for (let i = 0; i < removeCount; i += 1) {
    requestBuckets.delete(byOldest[i][0]);
  }
};

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  pruneRateLimitBuckets(now);

  const current = requestBuckets.get(ip) ?? { timestamps: [], lastSeen: now };
  const recent = current.timestamps.filter((timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestBuckets.set(ip, { timestamps: recent, lastSeen: now });
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ success: false, error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("HCAPTCHA_SECRET");
  if (!secret) {
    return new Response(JSON.stringify({ success: false, error: "Missing HCAPTCHA_SECRET" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let token = "";
  try {
    const payload = (await request.json()) as { token?: string };
    token = payload.token || "";
  } catch {
    // no-op; handled below
  }

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (clientIp && clientIp !== "unknown") {
    body.set("remoteip", clientIp);
  }

  const verifyResponse = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!verifyResponse.ok) {
    return new Response(JSON.stringify({ success: false, error: "Verification provider unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = (await verifyResponse.json()) as {
    success?: boolean;
    challenge_ts?: string;
    hostname?: string;
    "error-codes"?: string[];
  };

  return new Response(
    JSON.stringify({
      success: Boolean(result.success),
      challenge_ts: result.challenge_ts || null,
      hostname: result.hostname || null,
      errors: result["error-codes"] || [],
    }),
    {
      status: result.success ? 200 : 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
