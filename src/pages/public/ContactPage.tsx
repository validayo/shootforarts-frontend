import React from 'react';
import ContactForm from '../../components/contact/ContactForm';
import SEO from '../../components/seo/SEO';
import { trackOutboundClick } from '../../lib/analytics/events';

const ContactPage: React.FC = () => {
  return (
    <div className="pt-20 pb-20">
      <SEO
        title="Contact - Shoot For Arts"
        description="Let’s make something together. Reach out to Ayo for portraits, events, or creative shoots — wherever your story takes you."
        keywords={["book a photoshoot","contact photographer","portrait session","event shoot","creative photos","Shoot For Arts","Ayo"]}
        ogTitle="Contact - Shoot For Arts"
        ogDescription="Ready to create something special? Contact Ayo at Shoot For Arts to plan your next shoot or creative project."
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
      </div>
      <ContactForm />
    </div>
  );
};

export default ContactPage
