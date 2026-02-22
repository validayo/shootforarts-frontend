import * as Sentry from "@sentry/react";

let sentryInitialized = false;

export const initSentry = () => {
  if (sentryInitialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  const enableDev = import.meta.env.VITE_SENTRY_ENABLE_DEV === "true";

  Sentry.init({
    dsn,
    enabled: import.meta.env.DEV ? enableDev : true,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || (import.meta.env.DEV ? "development" : "production"),
    tracesSampleRate: 0.1,
  });

  sentryInitialized = true;
};
