import React, { useState } from "react";
import { motion } from "framer-motion";
import { ContactFormData, serviceOptions, referralOptions } from "../utils";
import { trackContactSubmit } from "../lib/analytics";

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<
    ContactFormData & {
      service_tier?: string;
      extra_questions?: Record<string, any>;
    }
  >({
    firstName: "",
    lastName: "",
    email: "",
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

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour <= 12 ? hour : hour - 12;
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      add_ons: checked ? [...prev.add_ons, value] : prev.add_ons.filter((item) => item !== value),
    }));
  };

  const handleExtraQuestionChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      extra_questions: { ...prev.extra_questions, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contact-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to submit form");
      }

      trackContactSubmit();
      setShowSuccess(true);

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
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

      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error("Form submission error:", error);
      setError("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div className="max-w-3xl mx-auto p-6 bg-secondary text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-2xl font-serif mb-4">Thank you!</h3>
        <p>Your message has been sent successfully.</p>
      </motion.div>
    );
  }

  return (
    <motion.div className="max-w-3xl mx-auto p-6 bg-secondary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {error && <div className="mb-6 p-4 bg-red-50 text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <h3 className="text-primary mb-4">Name (required)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="First Name" className="input-field" />
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Last Name" className="input-field" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-primary mb-2">Email (required)</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="example@example.com" className="input-field" />
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-primary mb-2">Instagram Handle</label>
          <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@your_account" className="input-field" />
        </div>

        {/* Service */}
        <div>
          <label className="block text-primary mb-2">Session Type (required)</label>
          <select name="service" value={formData.service} onChange={handleChange} required className="input-field">
            <option value="">Select service</option>
            {Object.keys(serviceOptions).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Tier */}
        {formData.service && (
          <div>
            <label className="block text-primary mb-2">Select Tier</label>
            <select name="service_tier" value={formData.service_tier} onChange={handleChange} required className="input-field">
              <option value="">Select a tier</option>
              {serviceOptions[formData.service]?.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Conditional Questions */}
        {formData.service === "Base Photoshoot" && formData.service_tier?.includes("Couple/Family") && (
          <div>
            <label className="block text-primary mb-2">How many people will be photographed?</label>
            <input type="number" placeholder="e.g. 3" className="input-field" onChange={(e) => handleExtraQuestionChange("peopleCount", e.target.value)} />
          </div>
        )}

        {formData.service === "Event Photography" && (
          <>
            <div>
              <label className="block text-primary mb-2">Approximate guest count</label>
              <input type="number" placeholder="e.g. 150" className="input-field" onChange={(e) => handleExtraQuestionChange("guestCount", e.target.value)} />
            </div>

            <div>
              <label className="block text-primary mb-2">Is parking available?</label>
              <select className="input-field" onChange={(e) => handleExtraQuestionChange("parking", e.target.value)}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </>
        )}

        {/* Vision */}
        <div>
          <label className="block text-primary mb-2">Tell me about your vision (required)</label>
          <p className="text-sm text-accent-dark mb-2">Tell me a little about what you're hoping for in your session</p>
          <textarea name="occasion" value={formData.occasion} onChange={handleChange} required className="input-field h-32" />
        </div>

        {/* Location */}
        <div>
          <label className="block text-primary mb-2">Desired Location</label>
          <p className="text-sm text-accent-dark mb-2">If you have a specific location in mind, let me know!</p>
          <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-field" />
        </div>

        {/* Pinterest */}
        <div>
          <label className="block text-primary mb-2">Pinterest Inspiration Board</label>
          <p className="text-sm text-accent-dark mb-2">Share your Pinterest board to help visualize your vision</p>
          <input
            type="url"
            name="pinterestInspo"
            value={formData.pinterestInspo}
            onChange={handleChange}
            placeholder="https://pinterest.com/..."
            className="input-field"
          />
        </div>

        {/* Add-ons */}
        <div>
          <h3 className="text-primary mb-4">Add Ons</h3>
          <p className="text-sm text-accent-dark mb-2">Additional edits and options available</p>
          <div className="space-y-2">
            {[
              "Additional Time (Before 8PM) - $60/hour",
              "Additional Time (After 8PM) - $80/hour",
              "VHS Camera Edit (15 sec) + Clips - $50",
              "Creative Graphic Edit - prices vary",
            ].map((addon, i) => (
              <label key={i} className="flex items-start space-x-2">
                <input type="checkbox" value={addon.split(" - ")[0]} onChange={handleCheckboxChange} className="mt-1" />
                <span>{addon}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-primary mb-2">Preferred Date</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="input-field" />
        </div>

        <div>
          <label className="block text-primary mb-2">Preferred Time</label>
          <select name="time" value={formData.time} onChange={handleChange} className="input-field">
            <option value="">Select</option>
            {timeSlots.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Referral */}
        <div>
          <label className="block text-primary mb-2">How did you hear about me?</label>
          <select name="referralSource" value={formData.referralSource} onChange={handleChange} className="input-field">
            <option value="">Select option</option>
            {referralOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Questions */}
        <div>
          <label className="block text-primary mb-2">Questions / Comments / Concerns</label>
          <p className="text-sm text-accent-dark mb-2">Feel free to let me know any questions or accommodations you need addressed!</p>
          <textarea name="questions" value={formData.questions} onChange={handleChange} className="input-field h-32" />
        </div>

        <div className="text-center text-sm text-accent-dark pt-6">
          <p className="mb-1">Deposit required (half of the total) and a contractual agreement must be signed for all bookings.</p>
          <p>Turnaround time: 4–10 days for most photoshoots.</p>
        </div>

        <button type="submit" disabled={isSubmitting} className="border border-primary px-8 py-3 text-primary hover:bg-primary hover:text-white transition-all">
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </form>
    </motion.div>
  );
};

export default ContactForm;
