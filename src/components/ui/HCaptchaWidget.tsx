import React, { useEffect, useRef } from "react";

type HCaptchaApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | number;
  remove: (widgetId: string | number) => void;
};

declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
    __sfaHcaptchaOnLoad?: () => void;
    __sfaHcaptchaReady?: boolean;
  }
}

const SCRIPT_ID = "hcaptcha-api-script";
const HCAPTCHA_ONLOAD_CALLBACK = "__sfaHcaptchaOnLoad";
const HCAPTCHA_SCRIPT_URL = `https://js.hcaptcha.com/1/api.js?render=explicit&onload=${HCAPTCHA_ONLOAD_CALLBACK}`;

let scriptLoadPromise: Promise<void> | null = null;

const waitForHcaptchaApi = (timeoutMs = 10_000): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (window.hcaptcha && window.__sfaHcaptchaReady) {
        window.__sfaHcaptchaReady = true;
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("hCaptcha API did not become ready in time."));
        return;
      }
      window.setTimeout(check, 50);
    };

    check();
  });

const ensureScriptLoaded = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.hcaptcha && window.__sfaHcaptchaReady) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const onReady = () => {
      window.__sfaHcaptchaReady = true;
      waitForHcaptchaApi().then(resolve).catch((error) => {
        scriptLoadPromise = null;
        reject(error);
      });
    };

    window[HCAPTCHA_ONLOAD_CALLBACK] = onReady;

    const mountScript = () => {
      window.__sfaHcaptchaReady = false;
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = HCAPTCHA_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        scriptLoadPromise = null;
        reject(new Error("Failed to load hCaptcha script"));
      };
      document.head.appendChild(script);
    };

    if (existing) {
      const expectedCallbackParam = `onload=${HCAPTCHA_ONLOAD_CALLBACK}`;
      const existingUsesCallback = existing.src.includes(expectedCallbackParam);

      if (!existingUsesCallback) {
        existing.remove();
        mountScript();
        waitForHcaptchaApi().then(resolve).catch((error) => {
          scriptLoadPromise = null;
          reject(error);
        });
        return;
      }

      if (window.__sfaHcaptchaReady) {
        resolve();
        return;
      }
      existing.addEventListener(
        "error",
        () => {
          scriptLoadPromise = null;
          reject(new Error("Failed to load hCaptcha script"));
        },
        { once: true }
      );
      waitForHcaptchaApi().then(resolve).catch((error) => {
        scriptLoadPromise = null;
        reject(error);
      });
      return;
    }

    mountScript();
    waitForHcaptchaApi().then(resolve).catch((error) => {
      scriptLoadPromise = null;
      reject(error);
    });
  });

  return scriptLoadPromise;
};

interface HCaptchaWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: (message: string) => void;
}

const HCaptchaWidget: React.FC<HCaptchaWidgetProps> = ({ siteKey, onVerify, onExpire, onError }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = async () => {
      try {
        await ensureScriptLoaded();
        if (cancelled || !containerRef.current || !window.hcaptcha) return;
        if (widgetIdRef.current !== null) return;

        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current(),
          "error-callback": () => onErrorRef.current("Captcha error. Please try again."),
        });
      } catch (error) {
        if (!cancelled) {
          onErrorRef.current(error instanceof Error ? error.message : "Captcha failed to load.");
        }
      }
    };

    renderWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.hcaptcha) {
        window.hcaptcha.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
};

export default HCaptchaWidget;
