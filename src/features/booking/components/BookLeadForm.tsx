import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  trackBookFormBlocked,
  trackBookLandingCtaClick,
  trackContactFormError,
  trackContactFormStarted,
  trackContactSubmit,
  trackOutboundClick,
} from "../../../lib/analytics/events";
import { submitContact } from "../../../lib/api/services";
import {
  cooldownSeconds,
  getCooldownRemainingMs,
  isHoneypotTriggered,
  isMinFillTimeReached,
  markSubmissionNow,
} from "../../../lib/security/formProtection";
import { ROUTES } from "../../../config/routes";
import { grantContactThankYouAccess } from "../../contact/utils/contactThankYouAccess";

const CONTACT_MIN_FILL_MS = 2500;
const CONTACT_COOLDOWN_MS = 45000;
const CONTACT_COOLDOWN_KEY = "sfa_contact_last_submit";

const leadServices = [
  { label: "Portraits", value: "Base Photoshoot" },
  { label: "Graduations", value: "Grad Photoshoots" },
  { label: "Events", value: "Event Photography" },
  { label: "Creative shoot", value: "Creative Photoshoot" },
];

type BookLeadFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  occasion: string;
};

const createInitialFormData = (): BookLeadFormData => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  service: "Base Photoshoot",
  date: "",
  occasion: "",
});

const BookLeadForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BookLeadFormData>(createInitialFormData);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const formStartedAtRef = useRef<number>(Date.now());

  const trackStartIfNeeded = (service?: string) => {
    if (hasTrackedStart) return;
    trackContactFormStarted(service || formData.service);
    setHasTrackedStart(true);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const serviceForEvent = name === "service" ? value : formData.service;
    trackStartIfNeeded(serviceForEvent);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(createInitialFormData());
    setHasTrackedStart(false);
    setWebsite("");
    formStartedAtRef.current = Date.now();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    trackBookLandingCtaClick("form_submit", { label: "Check Availability & Lock Your Date" });

    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      trackBookFormBlocked("validation_failed");
      return;
    }

    if (isHoneypotTriggered(website)) {
      grantContactThankYouAccess();
      navigate(ROUTES.public.contactThankYou, { replace: true });
      return;
    }

    if (!isMinFillTimeReached(formStartedAtRef.current, CONTACT_MIN_FILL_MS)) {
      trackBookFormBlocked("min_fill_time");
      setError("Please wait a few seconds before submitting.");
      return;
    }

    const remainingMs = getCooldownRemainingMs(CONTACT_COOLDOWN_KEY, CONTACT_COOLDOWN_MS);
    if (remainingMs > 0) {
      trackBookFormBlocked("cooldown");
      setError(`Please wait ${cooldownSeconds(remainingMs)}s before sending another request.`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await submitContact({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        service: formData.service,
        service_tier: "",
        occasion: formData.occasion,
        pinterestInspo: "",
        add_ons: [],
        date: formData.date,
        time: "",
        location: "Toronto",
        referralSource: "",
        questions: "",
        extra_questions: {
          landingPage: "/book",
          landingIntent: "ads_lead_capture",
        },
      });

      markSubmissionNow(CONTACT_COOLDOWN_KEY);
      trackContactSubmit({
        service: formData.service,
        source: "book_landing_form",
      });
      grantContactThankYouAccess();
      resetForm();
      navigate(ROUTES.public.contactThankYou, { replace: true });
    } catch (submitError) {
      console.error("Book landing submission error:", submitError);
      const message = submitError instanceof Error ? submitError.message : "Unknown form error";
      trackContactFormError(message);
      setError("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      id="book-form"
      className="rounded-[2rem] border border-primary/15 bg-white/95 p-6 shadow-[0_20px_60px_rgba(60,43,24,0.12)] backdrop-blur"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">Spots for April are almost full</p>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent-dark">1-Minute Inquiry</p>
        <h2 className="mt-2 text-2xl font-serif text-primary">Check Availability &amp; Lock Your Date</h2>
        <p className="mt-2 text-sm leading-relaxed text-accent-dark">
          Share a few details and get pricing clarity, availability, and next steps within 24 hours.
        </p>
        <p className="mt-2 text-sm font-medium text-primary">Only a small deposit needed to secure your shoot.</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        onInvalidCapture={(event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
            trackBookFormBlocked("validation_failed");
            return;
          }

          trackBookFormBlocked(target.validity.valueMissing ? "required_field_missing" : "validation_failed", {
            field: target.name || target.id || undefined,
          });
        }}
        className="space-y-4"
        aria-busy={isSubmitting}
      >
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="book-first-name" className="mb-2 block text-sm font-medium text-primary">
              First name
            </label>
            <input
              id="book-first-name"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              autoComplete="given-name"
              placeholder="First name"
              className="input-field min-h-12"
            />
          </div>

          <div>
            <label htmlFor="book-last-name" className="mb-2 block text-sm font-medium text-primary">
              Last name
            </label>
            <input
              id="book-last-name"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              autoComplete="family-name"
              placeholder="Last name"
              className="input-field min-h-12"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="book-email" className="mb-2 block text-sm font-medium text-primary">
              Email
            </label>
            <input
              id="book-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input-field min-h-12"
            />
          </div>

          <div>
            <label htmlFor="book-phone" className="mb-2 block text-sm font-medium text-primary">
              Phone
            </label>
            <input
              id="book-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="(647) 123-4567"
              className="input-field min-h-12"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
          <div>
            <label htmlFor="book-service" className="mb-2 block text-sm font-medium text-primary">
              What are you booking?
            </label>
            <select id="book-service" name="service" value={formData.service} onChange={handleChange} className="input-field min-h-12">
              {leadServices.map((service) => (
                <option key={service.value} value={service.value}>
                  {service.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="book-date" className="mb-2 block text-sm font-medium text-primary">
              Preferred date
            </label>
            <input id="book-date" type="date" name="date" value={formData.date} onChange={handleChange} className="input-field min-h-12" />
          </div>
        </div>

        <div>
          <label htmlFor="book-occasion" className="mb-2 block text-sm font-medium text-primary">
            Tell me what you need
          </label>
          <textarea
            id="book-occasion"
            name="occasion"
            value={formData.occasion}
            onChange={handleChange}
            required
            placeholder="Portraits, graduation photos, or event coverage. Share your date, location, and what you're looking for."
            className="input-field min-h-32"
          />
        </div>

        <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-accent-dark">
          Prefer a faster answer? Call or text{" "}
          <a
            href="tel:+16472502790"
            onClick={() => trackOutboundClick("tel:+16472502790", "book_form")}
            className="font-medium text-primary underline underline-offset-4"
          >
            +1 647-250-2790
          </a>
          .
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-secondary transition-colors duration-300 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Check Availability & Lock Your Date"}
        </button>
      </form>
    </motion.div>
  );
};

export default BookLeadForm;
