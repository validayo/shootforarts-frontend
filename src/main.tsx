import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  void import("./lib/observability/sentry")
    .then(({ initSentry }) => initSentry())
    .catch((error: unknown) => {
      // Keep app booting even if Sentry package is not installed in local env.
      console.warn("Sentry module failed to load.", error);
    });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
