import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { subscribe as subscribeNewsletter } from "../../lib/api/services";
import { trackNewsletterSubscribeError, trackNewsletterSubscribeSuccess } from "../../lib/analytics/events";
import { cooldownSeconds, getCooldownRemainingMs, isHoneypotTriggered, isMinFillTimeReached, markSubmissionNow } from "../../lib/security/formProtection";

const NEWSLETTER_MIN_FILL_MS = 1200;
const NEWSLETTER_COOLDOWN_MS = 30000;
const NEWSLETTER_COOLDOWN_KEY = "sfa_newsletter_footer_last_submit";

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");
  const formStartedAtRef = useRef<number>(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isHoneypotTriggered(website)) {
      setShowSuccess(true);
      return;
    }

    if (!isMinFillTimeReached(formStartedAtRef.current, NEWSLETTER_MIN_FILL_MS)) {
      setError("Please wait a second before submitting.");
      return;
    }

    const remainingMs = getCooldownRemainingMs(NEWSLETTER_COOLDOWN_KEY, NEWSLETTER_COOLDOWN_MS);
    if (remainingMs > 0) {
      setError(`Please wait ${cooldownSeconds(remainingMs)}s before trying again.`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await subscribeNewsletter(email);
      markSubmissionNow(NEWSLETTER_COOLDOWN_KEY);
      trackNewsletterSubscribeSuccess("footer");

      setShowSuccess(true);
      setEmail("");
      setWebsite("");
      formStartedAtRef.current = Date.now();

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error subscribing:", error);
      const message = error instanceof Error ? error.message : "Unknown subscribe error";
      trackNewsletterSubscribeError("footer", message);
      setError("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div className="bg-white border-y border-accent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status" aria-live="polite">
        <div className="container-custom py-8 text-center">
          <h3 className="text-xl font-serif mb-2">Thank you for subscribing!</h3>
          <p>You'll receive our updates soon.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="bg-white border-y border-accent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="container-custom py-8">
        <form onSubmit={handleSubmit} className="flex items-center justify-center gap-4 flex-wrap" aria-busy={isSubmitting}>
          <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="newsletter-website">Website</label>
            <input
              id="newsletter-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <p className="text-sm font-serif">Subscribe for updates and special offers</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-64 px-3 py-1 border border-accent focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-white px-4 py-1 text-sm hover:bg-accent-dark transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Subscribe"}
            </button>
          </div>

          {error && <p className="text-sm text-red-600" role="alert" aria-live="assertive">{error}</p>}
        </form>
      </div>
    </motion.div>
  );
};

export default Newsletter;
