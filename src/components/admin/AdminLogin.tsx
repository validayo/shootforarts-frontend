import React, { useState } from "react";
import { motion } from "framer-motion";
import type { SignInWithPasswordCredentials } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { logAdminAction, logAdminError } from "../../lib/observability/logger";
import { ROUTES } from "../../config/routes";
import HCaptchaWidget from "../ui/HCaptchaWidget";
import { trackAdminCaptchaFriction } from "../../lib/analytics/events";
import {
  clearAdminLoginFailures,
  getAdminLoginLockRemainingMs,
  lockoutSeconds,
  recordAdminLoginFailure,
} from "../../lib/security/adminLoginProtection";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "e1aedece-66b6-42ee-a9da-9e447d849c68";
const RAW_VERIFY_URL = (import.meta.env.VITE_ADMIN_HCAPTCHA_VERIFY_URL || "").trim();
const getSupabaseProjectRef = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return "";
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.host.split(".")[0] || "";
  } catch {
    return "";
  }
};

const normalizeVerifyUrl = (rawValue?: string): string => {
  const raw = (rawValue || "").trim();
  if (!raw) return "";

  const projectRef = getSupabaseProjectRef();
  const replaced =
    raw.includes("<project-ref>") && projectRef
      ? raw.replace("<project-ref>", projectRef)
      : raw;

  try {
    const parsed = new URL(replaced);
    return parsed.toString();
  } catch {
    return "";
  }
};

const getDerivedVerifyUrl = (): string => {
  const projectRef = getSupabaseProjectRef();
  if (!projectRef) return "";
  return `https://${projectRef}.functions.supabase.co/admin-hcaptcha-verify`;
};

const ENV_HCAPTCHA_VERIFY_URL = normalizeVerifyUrl(RAW_VERIFY_URL);
const DERIVED_HCAPTCHA_VERIFY_URL = normalizeVerifyUrl(getDerivedVerifyUrl());
const HCAPTCHA_VERIFY_URL_CANDIDATES = Array.from(
  new Set([ENV_HCAPTCHA_VERIFY_URL, DERIVED_HCAPTCHA_VERIFY_URL].filter(Boolean))
);

const ENFORCE_SERVER_VERIFY =
  (import.meta.env.VITE_ADMIN_HCAPTCHA_ENFORCE_SERVER_VERIFY ?? "false") === "true";
const SHOULD_USE_CUSTOM_VERIFY = ENFORCE_SERVER_VERIFY;

const verifyCaptchaToken = async (token: string): Promise<void> => {
  if (!SHOULD_USE_CUSTOM_VERIFY) return;
  if (HCAPTCHA_VERIFY_URL_CANDIDATES.length === 0) {
    throw new Error("Captcha verification is enabled, but no valid verification URL is configured.");
  }

  let lastError: Error | null = null;

  for (const verifyUrl of HCAPTCHA_VERIFY_URL_CANDIDATES) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "admin_login" }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          lastError = new Error(`Captcha verification endpoint not found (${verifyUrl}).`);
          continue;
        }
        lastError = new Error(`Captcha verification failed (${response.status}).`);
        continue;
      }

      const payload = (await response.json()) as { success?: boolean };
      if (!payload.success) {
        throw new Error("Captcha challenge verification was not successful.");
      }

      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new Error("Captcha verification timed out. Please try again.");
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error("Captcha verification request failed.");
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (lastError) throw lastError;
  throw new Error("Captcha verification request failed.");
};

const AdminLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaError, setCaptchaError] = useState<string>("");
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCaptchaError("");

    const lockRemainingMs = getAdminLoginLockRemainingMs();
    if (lockRemainingMs > 0) {
      setError(`Too many attempts. Please wait ${lockoutSeconds(lockRemainingMs)}s and try again.`);
      return;
    }

    if (!captchaToken) {
      setCaptchaError("Please complete the captcha challenge before logging in.");
      return;
    }

    setLoading(true);

    try {
      await verifyCaptchaToken(captchaToken);

      const signInPayload: SignInWithPasswordCredentials = {
        email: credentials.email,
        password: credentials.password,
      };

      // hCaptcha tokens are single-use. If custom server verification is enabled,
      // avoid sending the same token again to Supabase Auth.
      if (!SHOULD_USE_CUSTOM_VERIFY) {
        signInPayload.options = { captchaToken };
      }

      const { error } = await supabase.auth.signInWithPassword(signInPayload);

      if (error) throw error;

      clearAdminLoginFailures();
      logAdminAction("auth.login_success", { email: credentials.email });
      const fromState = location.state as { from?: { pathname?: string } } | null;
      const nextPath = fromState?.from?.pathname || ROUTES.admin.dashboard;
      navigate(nextPath, { replace: true });
    } catch (err) {
      const lockMs = recordAdminLoginFailure();
      if (err instanceof Error) {
        console.error("Login error:", err.message);
        logAdminError("auth.login_failed", { email: credentials.email, message: err.message });
        const lockMessage = lockMs > 0 ? ` Too many failures. Locked for ${lockoutSeconds(lockMs)}s.` : "";
        setError(`${err.message}${lockMessage}`);
      } else {
        logAdminError("auth.login_failed", { email: credentials.email, message: "Unknown login failure" });
        const lockMessage = lockMs > 0 ? ` Too many failures. Locked for ${lockoutSeconds(lockMs)}s.` : "";
        setError(`Invalid email or password. Please try again.${lockMessage}`);
      }
      setCaptchaToken("");
      setCaptchaRenderKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="container-custom py-20 mt-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-serif mb-8 text-center">Admin Login</h2>

        {error && <div className="bg-red-50 text-red-800 p-4 mb-6 text-center">{error}</div>}
        {captchaError && <div className="bg-amber-50 text-amber-800 p-4 mb-6 text-center">{captchaError}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-primary mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              className="w-full border border-accent p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-primary mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className="w-full border border-accent p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <HCaptchaWidget
              key={captchaRenderKey}
              siteKey={HCAPTCHA_SITE_KEY}
              onVerify={(token) => {
                setCaptchaToken(token);
                setCaptchaError("");
              }}
              onExpire={() => {
                setCaptchaToken("");
                setCaptchaError("Captcha expired. Please complete it again.");
                trackAdminCaptchaFriction("expired");
              }}
              onError={(message) => {
                setCaptchaToken("");
                setCaptchaError(message);
                trackAdminCaptchaFriction("error", message);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full border border-primary px-6 py-3 text-primary hover:bg-primary hover:text-secondary transition-colors duration-300"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="loader mr-2"></span> Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default AdminLogin;
