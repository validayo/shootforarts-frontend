declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Array<unknown>;
  }
}

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;
type PopupName = "newsletter" | "fun_jokes";
type NewsletterSource = "footer" | "popup";
type HomeCtaSource = "featured_sessions" | "booking_cta";
type CaptchaIssueType = "expired" | "error";

const isBrowser = typeof window !== "undefined";

const sanitizeParams = (params: AnalyticsParams = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null));

const sendEvent = (eventName: string, params: AnalyticsParams = {}) => {
  if (!isBrowser || !window.gtag) return;
  window.gtag("event", eventName, sanitizeParams(params));
};

export const trackPageView = (url: string, title?: string) => {
  sendEvent("page_view", {
    page_path: url,
    page_title: title || (typeof document !== "undefined" ? document.title : undefined),
    page_location: isBrowser ? window.location.href : undefined,
  });
};

export const trackGalleryView = (category: string) => {
  sendEvent("gallery_view", {
    category,
  });
};

export const trackGalleryLightboxOpen = (details: { category: string; index: number; photoId?: string }) => {
  sendEvent("gallery_lightbox_open", {
    category: details.category,
    image_index: details.index,
    photo_id: details.photoId,
  });
};

export const trackPhotoUpload = (title: string) => {
  sendEvent("photo_upload", {
    file_name: title,
  });
};

export const trackContactSubmit = (details?: { service?: string; serviceTier?: string }) => {
  const payload = {
    service: details?.service,
    service_tier: details?.serviceTier,
  };
  sendEvent("contact_submit", payload);
  sendEvent("generate_lead", {
    ...payload,
    lead_source: "contact_form",
  });
};

export const trackContactFormStarted = (service?: string) => {
  sendEvent("contact_form_started", {
    service: service || "unknown",
  });
};

export const trackContactFormError = (message?: string) => {
  sendEvent("contact_form_error", {
    error_message: message?.slice(0, 120),
  });
};

export const trackPopupShown = (popupName: PopupName) => {
  sendEvent("popup_shown", {
    popup_name: popupName,
  });
};

export const trackPopupClosed = (popupName: PopupName, reason = "dismissed") => {
  sendEvent("popup_closed", {
    popup_name: popupName,
    reason,
  });
};

export const trackJokeInteraction = (label: string) => {
  sendEvent("joke_interaction", {
    action: label,
  });
};

export const trackNewsletterSubscribeSuccess = (source: NewsletterSource) => {
  const payload = {
    source,
  };
  sendEvent("newsletter_subscribe_success", payload);
  sendEvent("sign_up", {
    method: `newsletter_${source}`,
  });
};

export const trackNewsletterSubscribeError = (source: NewsletterSource, message?: string) => {
  sendEvent("newsletter_subscribe_error", {
    source,
    error_message: message?.slice(0, 120),
  });
};

export const trackOutboundClick = (destination: string, context: string) => {
  const payload = {
    destination,
    context,
  };
  sendEvent("outbound_click", payload);
  sendEvent("click", {
    link_url: destination,
    outbound: true,
    link_context: context,
  });
};

export const trackServiceBookNow = (service: string) => {
  sendEvent("service_book_now", {
    service,
  });
  sendEvent("select_promotion", {
    creative_name: service,
    creative_slot: "services_page",
  });
};

export const trackHomeCtaClick = (
  source: HomeCtaSource,
  details?: { label?: string; destination?: string; service?: string }
) => {
  const payload = {
    source,
    label: details?.label,
    destination: details?.destination,
    service: details?.service,
  };

  sendEvent("home_cta_click", payload);
  sendEvent("click", {
    link_context: source,
    link_text: details?.label,
    link_url: details?.destination,
  });
};

export const trackServicesBottomCtaClick = (destination: string) => {
  sendEvent("services_cta_click", {
    placement: "bottom_cta",
    label: "Get in Touch",
    destination,
  });

  sendEvent("click", {
    link_context: "services_bottom_cta",
    link_text: "Get in Touch",
    link_url: destination,
  });
};

export const trackPageNotFound = (path: string) => {
  sendEvent("page_not_found", {
    page_path: path,
  });
};

export const trackAdminCaptchaFriction = (issueType: CaptchaIssueType, message?: string) => {
  sendEvent("admin_captcha_friction", {
    issue_type: issueType,
    context: "admin_login",
    message: message?.slice(0, 120),
  });
};
