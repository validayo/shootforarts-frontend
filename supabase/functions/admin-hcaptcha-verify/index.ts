import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestBuckets = new Map<string, number[]>();

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
};

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const current = requestBuckets.get(ip) || [];
  const recent = current.filter((timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestBuckets.set(ip, recent);
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
