import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import ContactSuccessMessage from "../../components/contact/ContactSuccessMessage";
import { ROUTES } from "../../config/routes";

const CONTACT_THANK_YOU_ACCESS_KEY = "sfa_contact_thank_you_access";
const CONTACT_THANK_YOU_ACCESS_WINDOW_MS = 30 * 60 * 1000;

const hasThankYouAccess = (): boolean => {
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

const ContactThankYouPage: React.FC = () => {
  const [isAllowed] = useState(hasThankYouAccess);

  if (!isAllowed) {
    return <Navigate to={ROUTES.public.contact} replace />;
  }

  return (
    <div className="pt-20 pb-20 px-6">
      <SEO
        title="Thank You - Shoot For Arts"
        description="Your inquiry has been received. Shoot For Arts will follow up shortly to confirm the next steps for your session."
        keywords={["contact confirmation", "photoshoot inquiry received", "Shoot For Arts thank you"]}
        ogTitle="Thank You - Shoot For Arts"
        ogDescription="Your inquiry has been received. Expect a follow-up shortly to confirm the next steps for your session."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/contact/thank-you"
      />
      <ContactSuccessMessage />
    </div>
  );
};

export default ContactThankYouPage;
