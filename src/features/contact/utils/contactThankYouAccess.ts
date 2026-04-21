const CONTACT_THANK_YOU_ACCESS_KEY = "sfa_contact_thank_you_access";
const CONTACT_THANK_YOU_ACCESS_WINDOW_MS = 30 * 60 * 1000;

export const grantContactThankYouAccess = (): void => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CONTACT_THANK_YOU_ACCESS_KEY, String(Date.now()));
};

export const hasValidContactThankYouAccess = (): boolean => {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem(CONTACT_THANK_YOU_ACCESS_KEY);
  if (!raw) return false;

  const timestamp = Number(raw);
  const valid = Number.isFinite(timestamp) && Date.now() - timestamp < CONTACT_THANK_YOU_ACCESS_WINDOW_MS;

  if (!valid) {
    window.sessionStorage.removeItem(CONTACT_THANK_YOU_ACCESS_KEY);
  }

  return valid;
};
