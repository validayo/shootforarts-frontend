import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { trackOutboundClick } from "../../../lib/analytics/events";

type ContactSuccessMessageProps = {
  onSendAnotherInquiry?: () => void;
};

const ContactSuccessMessage: React.FC<ContactSuccessMessageProps> = ({ onSendAnotherInquiry }) => {
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

      <p className="mt-5 text-sm text-accent-dark">
        While you wait, follow{" "}
        <a
          href="https://instagram.com/shootforarts"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackOutboundClick("https://instagram.com/shootforarts", "contact_thank_you")}
          className="text-primary underline underline-offset-4"
        >
          @shootforarts
        </a>{" "}
        on Instagram for recent work, behind-the-scenes clips, and new session drops.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onSendAnotherInquiry ? (
          <button
            type="button"
            onClick={onSendAnotherInquiry}
            className="border border-primary px-6 py-2 text-primary hover:bg-primary hover:text-white transition-all"
          >
            Send Another Inquiry
          </button>
        ) : null}
        <Link to="/services" className="border border-primary px-6 py-2 text-primary hover:bg-primary hover:text-white transition-all">
          Back to Services
        </Link>
        <Link to="/contact" className="border border-primary px-6 py-2 text-primary hover:bg-primary hover:text-white transition-all">
          Back to Contact
        </Link>
      </div>
    </motion.div>
  );
};

export default ContactSuccessMessage;
