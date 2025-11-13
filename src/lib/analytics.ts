// src/lib/analytics.ts

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const isBrowser = typeof window !== "undefined";

// Send a basic page view (used by RouteChangeTracker)
export const trackPageView = (url: string, title?: string) => {
  const pageTitle = title || (typeof document !== "undefined" ? document.title : undefined);
  const payload: Record<string, string | undefined> = {
    page_path: url,
    page_title: pageTitle,
    page_location: isBrowser ? window.location.href : undefined,
  };

  // Push to dataLayer first so events aren't lost if gtag isn't ready yet
  if (isBrowser) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "page_view", ...payload });
  }

  if (isBrowser && window.gtag) {
    window.gtag("event", "page_view", payload);
  } else if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[GA] gtag not found at call time; event queued in dataLayer:", payload);
  }
};

// Track when someone views a gallery
export const trackGalleryView = (category: string) => {
  if (isBrowser && window.gtag) {
    window.gtag("event", "gallery_view", {
      event_category: "Gallery",
      event_label: category,
    });
  }
};

// Track when an admin uploads a photo
export const trackPhotoUpload = (title: string) => {
  if (isBrowser && window.gtag) {
    window.gtag("event", "photo_upload", {
      event_category: "Admin",
      event_label: title,
    });
  }
};

// Track when someone submits the contact form
export const trackContactSubmit = () => {
  if (isBrowser && window.gtag) {
    window.gtag("event", "contact_submit", {
      event_category: "Contact",
    });
  }
};

// Newsletter popup interactions
export const trackPopupShown = () => {
  if (isBrowser && window.gtag) {
    window.gtag("event", "popup_shown", {
      event_category: "Newsletter Popup",
    });
  }
};

export const trackPopupClosed = () => {
  if (isBrowser && window.gtag) {
    window.gtag("event", "popup_closed_before_joke_end", {
      event_category: "Newsletter Popup",
    });
  }
};

export const trackJokeInteraction = (label: string) => {
  if (isBrowser && window.gtag) {
    window.gtag("event", "joke_interaction", {
      event_category: "Newsletter Popup",
      event_label: label,
    });
  }
};
