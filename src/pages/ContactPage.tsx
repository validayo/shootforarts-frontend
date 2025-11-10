import React from 'react';
import ContactForm from '../components/ContactForm';

const ContactPage: React.FC = () => {
  return (
    <div className="pt-20 pb-20">
      <div className="max-w-3xl mx-auto px-6 mb-12 text-center">
        <h2 className="text-3xl font-serif mb-6">Contact</h2>
        <p className="text-lg mb-4">
          My inbox is always open! Any questions, inquiries, and comments can be sent directly to me through this form.
        </p>
        <p className="text-lg mb-8">
          You can also reach me via{' '}
          <a 
            href="https://instagram.com/shootforarts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Instagram DM
          </a>
          , or send me an email directly at{' '}
          <a 
            href="mailto:contact@shootforarts.com"
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