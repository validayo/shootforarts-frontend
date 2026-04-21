import React from 'react';
import SEO from '../../../components/seo/SEO';
import { trackOutboundClick } from '../../../lib/analytics/events';
import ContactForm from '../components/ContactForm';

const publicPhoneNumber = "+1 647-250-2790";
const publicPhoneHref = "tel:+16472502790";

const ContactPage: React.FC = () => {
  return (
    <div className="pt-20 pb-20">
      <SEO
        title="Contact Shoot For Arts | Book a Toronto Photographer"
        description="Contact Shoot For Arts to book portraits, headshots, branding sessions, grad photos, event coverage, weddings, or a custom Toronto photoshoot."
        ogTitle="Contact Shoot For Arts | Book a Toronto Photographer"
        ogDescription="Book portraits, headshots, branding sessions, grad photos, event coverage, weddings, or a custom Toronto shoot with Shoot For Arts."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/contact"
      />
      <div className="max-w-3xl mx-auto px-6 mb-12 text-center">
        <h2 className="text-3xl font-serif mb-6">Contact</h2>
        <p className="text-lg mb-4">
          My inbox is always open! Any questions, inquiries, and comments can be sent directly to me through this form.
        </p>
        <p className="text-base mb-4 text-accent-dark">Expected response time: within 24 hours (Monday-Saturday).</p>
        <p className="text-lg mb-8">
          You can also reach me via{' '}
          <a
            href="https://instagram.com/shootforarts"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutboundClick("https://instagram.com/shootforarts", "contact_page")}
            className="text-primary hover:underline"
          >
            Instagram DM
          </a>
          , or send me an email directly at{' '}
          <a
            href="mailto:contact@shootforarts.com"
            onClick={() => trackOutboundClick("mailto:contact@shootforarts.com", "contact_page")}
            className="text-primary hover:underline"
          >
            contact@shootforarts.com
          </a>
        </p>
        <p className="text-base text-accent-dark">
          Prefer a faster reply? Call or text{' '}
          <a
            href={publicPhoneHref}
            onClick={() => trackOutboundClick(publicPhoneHref, "contact_page")}
            className="text-primary hover:underline"
          >
            {publicPhoneNumber}
          </a>
          .
        </p>
      </div>
      <ContactForm />
    </div>
  );
};

export default ContactPage;
