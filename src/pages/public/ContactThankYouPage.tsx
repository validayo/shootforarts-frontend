import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import ContactSuccessMessage from "../../components/contact/ContactSuccessMessage";
import { ROUTES } from "../../config/routes";
import { hasValidContactThankYouAccess } from "../../components/contact/thankYouAccess";

const ContactThankYouPage: React.FC = () => {
  const [isAllowed] = useState(hasValidContactThankYouAccess);

  if (!isAllowed) {
    return <Navigate to={ROUTES.public.contact} replace />;
  }

  return (
    <div className="pt-20 pb-20 px-6">
      <SEO
        title="Thank You - Shoot For Arts"
        description="Your inquiry has been received. Shoot For Arts will follow up shortly to confirm the next steps for your session."
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
