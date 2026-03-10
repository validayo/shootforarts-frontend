import React from "react";
import { Link } from "react-router-dom";
import Gallery from "../../components/gallery/Gallery";
import NewsletterPopup from "../../components/newsletter/NewsletterPopup";
import SEO from "../../components/seo/SEO";
import { trackHomeCtaClick } from "../../lib/analytics/events";

const featuredSessions = [
  {
    title: "Portrait Sessions",
    price: "From $150",
    description: "Headshots, birthdays, and personal portraits crafted around your style.",
    service: "Base Photoshoot",
  },
  {
    title: "Creative Concepts",
    price: "From $180",
    description: "Editorial and concept shoots with intentional lighting, mood, and direction.",
    service: "Creative Photoshoot",
  },
  {
    title: "Event Coverage",
    price: "From $125/hr",
    description: "Real moments documented with a clean, story-driven event gallery.",
    service: "Event Photography",
  },
];

const bookingSteps = [
  {
    title: "Start your inquiry",
    description: "Tell me your vision, date, and location, and I'll recommend the best fit for your session.",
  },
  {
    title: "Plan the details",
    description: "We'll align on mood, outfits, timing, and shot goals so shoot day feels effortless.",
  },
  {
    title: "Shoot and delivery",
    description: "After your shoot, I edit your gallery and deliver your final images online.",
  },
];

const getBookingWindowLabel = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

  const currentMonthLabel = monthFormatter.format(now);
  const nextMonthLabel = monthFormatter.format(nextMonth);
  const currentYear = now.getFullYear();
  const nextYear = nextMonth.getFullYear();

  if (currentYear === nextYear) {
    return `Now booking ${currentMonthLabel} and ${nextMonthLabel} ${currentYear}`;
  }

  return `Now booking ${currentMonthLabel} ${currentYear} and ${nextMonthLabel} ${nextYear}`;
};

const HomePage: React.FC = () => {
  const bookingWindowLabel = getBookingWindowLabel();

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

      <section className="px-4 pb-12 pt-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent-dark">
                Featured Sessions
              </p>
              <h2 className="mt-2 text-2xl font-serif text-primary sm:text-3xl">
                Choose a session style and start booking
              </h2>
            </div>
            <Link to="/services" className="text-sm text-primary underline-offset-4 transition hover:underline">
              See full services
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {featuredSessions.map((session) => {
              const destination = `/contact?service=${encodeURIComponent(session.service)}`;
              return (
                <article key={session.title} className="rounded-xl border border-accent/80 bg-white/80 p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
                    {session.price}
                  </p>
                  <h3 className="mt-2 text-xl font-serif text-primary">{session.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-accent-dark">{session.description}</p>
                  <Link
                    to={destination}
                    onClick={() =>
                      trackHomeCtaClick("featured_sessions", {
                        label: "Book this session",
                        destination,
                        service: session.service,
                      })
                    }
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary transition-colors duration-300 hover:bg-primary hover:text-secondary"
                  >
                    Book this session
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-accent/80 bg-secondary p-8 sm:p-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent-dark">
            How Booking Works
          </p>
          <h2 className="mt-2 max-w-2xl text-2xl font-serif text-primary sm:text-3xl">
            A simple process from inquiry to final gallery
          </h2>

          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {bookingSteps.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-accent/70 bg-secondary p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-serif text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-accent-dark">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

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
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
                {bookingWindowLabel}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:border-l lg:border-accent/70 lg:pl-8">
              <Link
                to="/contact"
                onClick={() =>
                  trackHomeCtaClick("booking_cta", {
                    label: "Start Your Inquiry",
                    destination: "/contact",
                  })
                }
                className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary shadow-sm transition-colors duration-300 hover:bg-accent-dark"
              >
                Start Your Inquiry
              </Link>
              <Link
                to="/services"
                onClick={() =>
                  trackHomeCtaClick("booking_cta", {
                    label: "View Services / Pricing",
                    destination: "/services",
                  })
                }
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
