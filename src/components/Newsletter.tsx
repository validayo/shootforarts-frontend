import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { subscribe as subscribeNewsletter } from "../lib/services";

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await subscribeNewsletter(email);

      setShowSuccess(true);
      setEmail("");

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error subscribing:", error);
      setError("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div className="bg-white border-y border-accent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
        <form onSubmit={handleSubmit} className="flex items-center justify-center gap-4 flex-wrap">
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
              className="bg-primary text-white px-4 py-1 text-sm hover:bg-accent-dark transition-colors duration-300 disabled:opacity-50"
            >
              Subscribe
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </motion.div>
  );
};

export default Newsletter;
