import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackNewsletterSubscribeError, trackNewsletterSubscribeSuccess, trackPopupClosed, trackPopupShown } from "../lib/analytics";
import { subscribe as subscribeNewsletter } from "../lib/services";
import { cooldownSeconds, getCooldownRemainingMs, isHoneypotTriggered, isMinFillTimeReached, markSubmissionNow } from "../lib/formProtection";

const SESSION_KEY = "newsletterPopupClosed";
const SUPPRESS_KEY = "newsletterPopupSuppressUntil"; // ISO date threshold
const NEWSLETTER_POPUP_MIN_FILL_MS = 1200;
const NEWSLETTER_POPUP_COOLDOWN_MS = 30000;
const NEWSLETTER_POPUP_COOLDOWN_KEY = "sfa_newsletter_popup_last_submit";

const NewsletterPopup: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number>(Date.now());

  const shouldShow = useMemo(() => {
    if (typeof window === "undefined") return false;
    const until = localStorage.getItem(SUPPRESS_KEY);
    if (until && new Date(until).getTime() > Date.now()) return false;
    return !sessionStorage.getItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    if (!shouldShow) return;
    let opened = false;
    const openOnce = () => {
      if (opened) return;
      opened = true;
      setOpen(true);
      setFormStartedAt(Date.now());
      trackPopupShown("newsletter");
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = (el.scrollTop || document.body.scrollTop) + el.clientHeight;
      const threshold = el.scrollHeight * 0.5;
      if (scrolled >= threshold) {
        clearTimeout(timer);
        openOnce();
      }
    };
    const timer = setTimeout(openOnce, 10000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [shouldShow]);

  const closePopup = (suppressDays: number = 14, reason = "dismissed") => {
    sessionStorage.setItem(SESSION_KEY, "true");
    if (suppressDays && suppressDays > 0) {
      const until = new Date(Date.now() + suppressDays * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(SUPPRESS_KEY, until);
    }
    setOpen(false);
    if (!success) trackPopupClosed("newsletter", reason);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;

    if (isHoneypotTriggered(website)) {
      setSuccess(true);
      return;
    }

    if (!isMinFillTimeReached(formStartedAt, NEWSLETTER_POPUP_MIN_FILL_MS)) {
      setError("Please wait a second before submitting.");
      return;
    }

    const remainingMs = getCooldownRemainingMs(NEWSLETTER_POPUP_COOLDOWN_KEY, NEWSLETTER_POPUP_COOLDOWN_MS);
    if (remainingMs > 0) {
      setError(`Please wait ${cooldownSeconds(remainingMs)}s before trying again.`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await subscribeNewsletter(email);
      markSubmissionNow(NEWSLETTER_POPUP_COOLDOWN_KEY);
      trackNewsletterSubscribeSuccess("popup");
      setSuccess(true);
      sessionStorage.setItem(SESSION_KEY, "true");
      setWebsite("");
      setFormStartedAt(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown subscribe error";
      trackNewsletterSubscribeError("popup", message);
      setError("Failed to subscribe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop (click to close + remember for session) */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => closePopup(14, "backdrop")} />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-3xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-white/30 bg-white/90"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Close (top-right) */}
            <button
              onClick={() => closePopup(14, "close_button")}
              aria-label="Close"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 z-10"
            >
              ×
            </button>

            <div className="relative grid md:grid-cols-12">
              {/* Visual side */}
              <div className="md:col-span-5 p-6 md:p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="h-40 md:h-60 w-full rounded-xl overflow-hidden">
                  <img
                    src="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/banner.jpg"
                    alt="Newsletter banner"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Content side */}
              <div className="md:col-span-7 p-6 md:p-8">
                <h3 className="text-2xl md:text-3xl font-serif text-gray-900">Don’t you just like Ayo's photography skills?</h3>
                <p className="mt-2 text-gray-600">Subscribe for new shoots, promos, and updates… maybe even a cookie.</p>
                <p className="mt-1 text-sm text-gray-500 italic">I promise not to overexpose your inbox.</p>

                {!success ? (
                  <>
                    <form onSubmit={handleSubscribe} className="mt-6 flex flex-col sm:flex-row gap-3">
                      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                        <label htmlFor="popup-newsletter-website">Website</label>
                        <input
                          id="popup-newsletter-website"
                          name="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email"
                        className="flex-1 border border-accent rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={submitting}
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent-dark transition disabled:opacity-50"
                      >
                        Join the List
                      </button>
                    </form>
                    {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
                    <div className="mt-2 text-sm text-gray-500">We’ll keep you updated with offers and behind-the-scenes.</div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => closePopup(14, "already_subscribed")}
                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        I’m already subscribed
                      </button>
                      <button
                        type="button"
                        onClick={() => closePopup(3, "remind_later")}
                        className="text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        Remind me later
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-6">
                    <h4 className="text-xl font-semibold">You’re in! Check your inbox soon.</h4>
                    <button onClick={() => closePopup(14, "success_close")} className="mt-4 inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Close</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewsletterPopup;



