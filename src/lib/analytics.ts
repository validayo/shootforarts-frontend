// src/lib/analytics.ts

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Send a basic page view (used by RouteChangeTracker)
export const trackPageView = (url: string) => {
  if (window.gtag) {
    window.gtag("event", "page_view", {
      page_path: url,
    });
  }
};

// Track when someone views a gallery
export const trackGalleryView = (category: string) => {
  if (window.gtag) {
    window.gtag("event", "gallery_view", {
      event_category: "Gallery",
      event_label: category,
    });
  }
};

// Track when an admin uploads a photo
export const trackPhotoUpload = (title: string) => {
  if (window.gtag) {
    window.gtag("event", "photo_upload", {
      event_category: "Admin",
      event_label: title,
    });
  }
};

// Track when someone submits the contact form
export const trackContactSubmit = () => {
  if (window.gtag) {
    window.gtag("event", "contact_submit", {
      event_category: "Contact",
    });
  }
};

// Newsletter popup interactions
export const trackPopupShown = () => {
  if (window.gtag) {
    window.gtag("event", "popup_shown", {
      event_category: "Newsletter Popup",
    });
  }
};

export const trackPopupClosed = () => {
  if (window.gtag) {
    window.gtag("event", "popup_closed_before_joke_end", {
      event_category: "Newsletter Popup",
    });
  }
};

export const trackJokeInteraction = (label: string) => {
  if (window.gtag) {
    window.gtag("event", "joke_interaction", {
      event_category: "Newsletter Popup",
      event_label: label,
    });
  }
};
