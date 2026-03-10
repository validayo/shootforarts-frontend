import React from "react";
import { Link } from "react-router-dom";
import Gallery from "../../components/gallery/Gallery";
import NewsletterPopup from "../../components/newsletter/NewsletterPopup";
import SEO from "../../components/seo/SEO";

const HomePage: React.FC = () => {
  return (
    <div className="pt-10">
      <SEO
        title="Shoot For Arts - Life is better with cherished memories."
        description="Ayo captures emotion and color through portraits, events, and creative shoots. Shoot For Arts is all about storytelling through every frame."
        keywords={["photography","portraits","event photography","creative shoots","storytelling photos","Shoot For Arts","Ayo"]}
        ogTitle="Shoot For Arts - Life is better with cherished memories."
        ogDescription="Explore the work of Ayo. Shoot For Arts captures emotion, color, and connection through portraits, events, and creative shoots anywhere in the world."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/"
      />
      <NewsletterPopup />
      <Gallery />

      <section className="px-4 pb-20 pt-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-accent/80 bg-gradient-to-br from-secondary via-accent-light/20 to-secondary p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_auto] lg:items-center lg:gap-10">
            <div className="max-w-2xl text-left lg:pr-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent-dark">
                Booking
              </p>
              <h2 className="mt-3 text-3xl font-serif leading-tight text-primary [text-wrap:balance] sm:text-3xl md:text-[2.75rem]">
                Every story deserves to be captured beautifully, and yours is no exception.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-accent-dark [text-wrap:pretty] sm:text-base">
                Tell me what you're envisioning, and I'll guide you to the session that fits your style, moment, and goals.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:border-l lg:border-accent/70 lg:pl-8">
              <Link
                to="/contact"
                className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary shadow-sm transition-colors duration-300 hover:bg-accent-dark"
              >
                Start Your Inquiry
              </Link>
              <Link
                to="/services"
                className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-primary px-7 py-3 text-sm font-medium text-primary transition-colors duration-300 hover:bg-primary hover:text-secondary"
              >
                View Services / Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
