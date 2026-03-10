import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ContactFormData,
  parseInspirationLinks,
  serializeInspirationLinks,
  serviceOptions,
  serviceTierReminders,
  referralOptions,
  addOnOptions,
} from "../../utils";
import { trackContactFormError, trackContactFormStarted, trackContactSubmit } from "../../lib/analytics/events";
import { submitContact } from "../../lib/api/services";
import { Link, useLocation } from "react-router-dom";
import {
  cooldownSeconds,
  getCooldownRemainingMs,
  isHoneypotTriggered,
  isMinFillTimeReached,
  markSubmissionNow,
} from "../../lib/security/formProtection";

const CONTACT_MIN_FILL_MS = 2500;
const CONTACT_COOLDOWN_MS = 45000;
const CONTACT_COOLDOWN_KEY = "sfa_contact_last_submit";
const TIER_NOT_SURE_OPTION = "Not sure - help me choose";

const contactMethodOptions = ["Email", "Text message", "Instagram DM"];
const bestContactTimeOptions = ["Morning", "Afternoon", "Evening", "Flexible"];
const dateFlexibilityOptions = ["Exact date only", "Flexible +/- 3 days", "Flexible within 2 weeks", "Flexible this month", "No set date yet"];

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    service: "",
    service_tier: "",
    occasion: "",
    pinterestInspo: "",
    add_ons: [],
    date: "",
    time: "",
    instagram: "",
    location: "",
    referralSource: "",
    questions: "",
    extra_questions: {},
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [website, setWebsite] = useState("");
  const formStartedAtRef = useRef<number>(Date.now());
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const svc = params.get("service");
    if (svc && serviceOptions[svc]) {
      setFormData((prev) => ({ ...prev, service: svc }));
    }
  }, [location.search]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, service_tier: "" }));
  }, [formData.service]);

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 7; hour <= 20; hour++) {
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour <= 12 ? hour : hour - 12;
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const trackStartIfNeeded = (service?: string) => {
    if (hasTrackedStart) return;
    trackContactFormStarted(service || formData.service || undefined);
    setHasTrackedStart(true);
  };

  const selectedTierReminder =
    formData.service && formData.service_tier
      ? serviceTierReminders[formData.service]?.[formData.service_tier]
      : undefined;
  const extraAnswers = formData.extra_questions ?? {};
  const parsedInspiration = useMemo(() => parseInspirationLinks(formData.pinterestInspo || ""), [formData.pinterestInspo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const serviceForEvent = name === "service" ? value : formData.service;
    trackStartIfNeeded(serviceForEvent);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    trackStartIfNeeded();
    setFormData((prev) => ({
      ...prev,
      add_ons: checked ? [...prev.add_ons, value] : prev.add_ons.filter((item) => item !== value),
    }));
  };

  const handleExtraQuestionChange = (key: string, value: string | number | boolean) => {
    trackStartIfNeeded();
    setFormData((prev) => ({
      ...prev,
      extra_questions: { ...prev.extra_questions, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isHoneypotTriggered(website)) {
      setShowSuccess(true);
      return;
    }

    if (!isMinFillTimeReached(formStartedAtRef.current, CONTACT_MIN_FILL_MS)) {
      setError("Please wait a few seconds before submitting.");
      return;
    }

    const remainingMs = getCooldownRemainingMs(CONTACT_COOLDOWN_KEY, CONTACT_COOLDOWN_MS);
    if (remainingMs > 0) {
      setError(`Please wait ${cooldownSeconds(remainingMs)}s before sending another request.`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const submissionPayload: ContactFormData = {
        ...formData,
        pinterestInspo: serializeInspirationLinks(formData.pinterestInspo),
      };

      await submitContact(submissionPayload);
      markSubmissionNow(CONTACT_COOLDOWN_KEY);

      trackContactSubmit({
        service: formData.service || undefined,
        serviceTier: formData.service_tier || undefined,
      });
      setShowSuccess(true);
      setHasTrackedStart(false);
      setWebsite("");
      formStartedAtRef.current = Date.now();

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        service: "",
        service_tier: "",
        occasion: "",
        pinterestInspo: "",
        add_ons: [],
        date: "",
        time: "",
        instagram: "",
        location: "",
        referralSource: "",
        questions: "",
        extra_questions: {},
      });
    } catch (submitError) {
      console.error("Form submission error:", submitError);
      const message = submitError instanceof Error ? submitError.message : "Unknown form error";
      trackContactFormError(message);
      setError("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div className="max-w-3xl mx-auto p-6 bg-secondary text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status" aria-live="polite">
        <h3 className="text-2xl font-serif mb-4">Thank you!</h3>
        <p className="mb-3">Your message has been sent successfully.</p>
        <p className="text-accent-dark mb-6">Expected response time: within 24 hours (Monday-Friday).</p>

        <div className="rounded-lg border border-primary/25 bg-white/70 p-4 text-left max-w-xl mx-auto">
          <p className="font-medium mb-2">What happens next:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-accent-dark">
            <li>I review your request details and preferred date.</li>
            <li>I follow up by email (or Instagram if provided).</li>
            <li>We confirm your package, then secure your date with deposit + agreement.</li>
          </ol>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              formStartedAtRef.current = Date.now();
              setShowSuccess(false);
            }}
            className="border border-primary px-6 py-2 text-primary hover:bg-primary hover:text-white transition-all"
          >
            Send Another Inquiry
          </button>
          <Link to="/services" className="border border-primary px-6 py-2 text-primary hover:bg-primary hover:text-white transition-all">
            Back to Services
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="max-w-3xl mx-auto p-6 bg-secondary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {error && <div className="mb-6 p-4 bg-red-50 text-red-800" role="alert" aria-live="assertive">{error}</div>}
      {formData.service && serviceOptions[formData.service] && (
        <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-white/60 text-gray-800">
          You're booking a {formData.service} session - adjust details below if needed.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div>
          <p className="text-sm font-medium text-primary mb-2">Name (required)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="First Name" className="input-field" />
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Last Name" className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Email (required)</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="example@example.com" className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Phone Number (required)</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="(647) 123-4567"
            className="input-field"
          />
          <p className="text-sm text-accent-dark mt-2">Used for quick scheduling updates and day-of communication.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Instagram Handle</label>
          <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@your_account" className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Session Type (required)</label>
          <select name="service" value={formData.service} onChange={handleChange} required className="input-field">
            <option value="">Select service</option>
            {Object.keys(serviceOptions).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-sm text-accent-dark mt-2">Pick a tier next to see what that package includes.</p>
        </div>

        {formData.service && (
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Select Tier</label>
            <select name="service_tier" value={formData.service_tier} onChange={handleChange} required className="input-field">
              <option value="">Select a tier</option>
              <option value={TIER_NOT_SURE_OPTION}>{TIER_NOT_SURE_OPTION}</option>
              {serviceOptions[formData.service]?.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>

            {selectedTierReminder && (
              <div className="mt-3 rounded-lg border border-primary/25 bg-white/70 p-4">
                <p className="text-sm font-medium text-primary">
                  {formData.service_tier} - {selectedTierReminder.price}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-accent-dark">
                  {selectedTierReminder.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {formData.service_tier === TIER_NOT_SURE_OPTION && (
              <div className="mt-3 rounded-lg border border-primary/25 bg-white/70 p-4 text-sm text-accent-dark">
                No problem. Share your vision below, and I will recommend the best tier for you.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Preferred Contact Method (optional)</label>
            <select
              value={String(extraAnswers.preferredContactMethod ?? "")}
              onChange={(e) => handleExtraQuestionChange("preferredContactMethod", e.target.value)}
              className="input-field"
            >
              <option value="">Select method</option>
              {contactMethodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">Best Time to Reach You (optional)</label>
            <select
              value={String(extraAnswers.bestContactTime ?? "")}
              onChange={(e) => handleExtraQuestionChange("bestContactTime", e.target.value)}
              className="input-field"
            >
              <option value="">Select time</option>
              {bestContactTimeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formData.service === "Base Photoshoot" && formData.service_tier?.includes("Couple/Family") && (
          <div>
            <label className="block text-sm font-medium text-primary mb-2">How many people will be photographed?</label>
            <input type="number" placeholder="e.g. 3" className="input-field" onChange={(e) => handleExtraQuestionChange("peopleCount", e.target.value)} />
          </div>
        )}

        {formData.service === "Event Photography" && (
          <>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Approximate guest count</label>
              <input type="number" placeholder="e.g. 150" className="input-field" onChange={(e) => handleExtraQuestionChange("guestCount", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Is parking available?</label>
              <select className="input-field" onChange={(e) => handleExtraQuestionChange("parking", e.target.value)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Tell me about your vision (required)</label>
          <p className="text-sm text-accent-dark mb-2">Tell me a little about what you're hoping for in your session</p>
          <textarea name="occasion" value={formData.occasion} onChange={handleChange} required className="input-field h-32" />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Desired Location</label>
          <p className="text-sm text-accent-dark mb-2">If you have a specific location in mind, let me know!</p>
          <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Inspiration Links (optional)</label>
          <p className="text-sm text-accent-dark mb-2">
            Paste inspiration links (Pinterest, IG, TikTok, etc.) separated by commas, semicolons, or new lines.
          </p>
          <p className="text-sm text-accent-dark mb-2">No links? Just describe the vibe you want in the vision section above.</p>
          <textarea
            name="pinterestInspo"
            value={formData.pinterestInspo}
            onChange={handleChange}
            placeholder={"https://pinterest.com/...\nhttps://instagram.com/...\nhttps://tiktok.com/..."}
            className="input-field h-28"
          />

          {parsedInspiration.validUrls.length > 0 && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-white/60 p-3">
              <p className="text-sm font-medium text-primary">Detected links ({parsedInspiration.validUrls.length})</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-accent-dark">
                {parsedInspiration.validUrls.map((url) => (
                  <li key={url} className="break-all">
                    {url}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsedInspiration.invalidEntries.length > 0 && (
            <p className="mt-3 text-sm text-amber-700">
              Some entries do not look like valid links and will be ignored: {parsedInspiration.invalidEntries.join(", ")}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-primary mb-2">Add Ons</p>
          <p className="text-sm text-accent-dark mb-2">Additional edits and options available</p>
          <div className="space-y-2">
            {addOnOptions.map((addon) => (
              <label key={addon} className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  value={addon.split(" - ")[0]}
                  onChange={handleCheckboxChange}
                  checked={formData.add_ons.includes(addon.split(" - ")[0])}
                  className="mt-1"
                />
                <span>{addon}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Preferred Date</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Preferred Time</label>
          <select name="time" value={formData.time} onChange={handleChange} className="input-field">
            <option value="">Select</option>
            {timeSlots.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Date Flexibility (optional)</label>
          <select
            value={String(extraAnswers.dateFlexibility ?? "")}
            onChange={(e) => handleExtraQuestionChange("dateFlexibility", e.target.value)}
            className="input-field"
          >
            <option value="">Select flexibility</option>
            {dateFlexibilityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">How did you hear about me?</label>
          <select name="referralSource" value={formData.referralSource} onChange={handleChange} className="input-field">
            <option value="">Select option</option>
            {referralOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-2">Questions / Comments / Concerns</label>
          <p className="text-sm text-accent-dark mb-2">Feel free to let me know any questions or accommodations you need addressed!</p>
          <textarea name="questions" value={formData.questions} onChange={handleChange} className="input-field h-32" />
        </div>

        <div className="text-center text-sm text-accent-dark pt-6">
          <p className="mb-1">Deposit required (half of the total) and a contractual agreement must be signed for all bookings.</p>
          <p>Turnaround time: 4-10 days for most photoshoots.</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
          className="border border-primary px-8 py-3 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </form>
    </motion.div>
  );
};

export default ContactForm;
