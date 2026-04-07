import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Camera, ExternalLink, MapPin, Star } from "lucide-react";
import SEO from "../../components/seo/SEO";
import Footer from "../../components/layout/Footer";
import BookLeadForm from "../../components/landing/BookLeadForm";
import { trackBookLandingCtaClick, trackOutboundClick } from "../../lib/analytics/events";
import { getGallery } from "../../lib/api/services";
import type { Photo } from "../../utils/types";

const pricingHighlights = [
  {
    title: "Portrait Sessions",
    description: "For headshots, birthdays, solo portraits, couples, and family sessions.",
    tiers: [
      {
        label: "Solo session",
        price: "$150",
        details: "1 hour, 6 pro-edited + 5 base-edited photos, 1 outfit",
      },
      {
        label: "Solo plus",
        price: "$200",
        details: "1 hour, 12 pro-edited + 10 base-edited photos, 2 outfits",
      },
    ],
  },
  {
    title: "Grad Sessions",
    description: "Campus portraits with clear photo counts and group-shot options.",
    tiers: [
      {
        label: "30-minute grad shoot",
        price: "$100",
        details: "8 edited photos, single graduate only",
      },
      {
        label: "1-hour grad shoot",
        price: "$180",
        details: "15 edited photos, includes family or friend group shots",
      },
    ],
  },
  {
    title: "Event Coverage",
    description: "For celebrations, campus events, brand activations, and community gatherings.",
    tiers: [
      {
        label: "Event photo coverage",
        price: "$125/hr",
        details: "2-hour minimum, unlimited photos, color-corrected online gallery",
      },
      {
        label: "Event photo + video package",
        price: "$150/hr",
        details: "2-hour minimum, highlight reel, two-camera coverage, social clip",
      },
    ],
  },
];

const trustOrganizations = ["TTC", "TDSB", "Ontario Tech University", "Blackhurst Cultural Centre"];
const googleReviewsUrl = "https://share.google/EhJPfBBpqj9hFRSDs";
const publicPhoneNumber = "+1 647-250-2790";
const publicPhoneHref = "tel:+16472502790";

const getBookingWindowCopy = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

  const currentMonthLabel = monthFormatter.format(now);
  const nextMonthLabel = monthFormatter.format(nextMonth);
  const currentYear = now.getFullYear();
  const nextYear = nextMonth.getFullYear();

  const bookingWindowLabel =
    currentYear === nextYear
      ? `Now booking ${currentMonthLabel} and ${nextMonthLabel} ${currentYear}`
      : `Now booking ${currentMonthLabel} ${currentYear} and ${nextMonthLabel} ${nextYear}`;

  return {
    bookingWindowLabel,
    limitedAvailabilityLabel: `Limited ${currentMonthLabel} weekend availability`,
  };
};

const BookLandingPage: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "error">("loading");
  const { bookingWindowLabel, limitedAvailabilityLabel } = getBookingWindowCopy();

  useEffect(() => {
    let cancelled = false;

    const loadTopPhotos = async () => {
      try {
        const topPhotos = await getGallery(
          "ALL",
          { width: 1200, quality: 82, format: "webp" },
          { include_top: true, include_season: false, top_limit: 6 }
        );
        if (cancelled) return;
        const featuredPhotos = topPhotos.slice(0, 6);
        if (featuredPhotos.length === 0) {
          setPhotoState("error");
          return;
        }
        setPhotos(featuredPhotos);
        setPhotoState("ready");
      } catch (error) {
        console.error("Failed to load top photos for /book", error);
        if (!cancelled) setPhotoState("error");
      }
    };

    loadTopPhotos();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderPhotoCard = (photo: Photo, index: number) => (
    <article key={photo.id} className="group relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-primary/5">
      <img
        src={photo.url}
        alt={`Shoot For Arts featured photo ${index + 1}`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
    </article>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5efe6_0%,#f8f4ee_46%,#fffdf9_100%)] text-primary">
      <SEO
        title="Book a Toronto Photoshoot Starting at $100 | Shoot For Arts"
        description="Book portraits, grad shoots, and event photography in Toronto starting at $100. Clear pricing, fast replies, and direct booking with Shoot For Arts."
        ogTitle="Book a Toronto Photoshoot Starting at $100 | Shoot For Arts"
        ogDescription="Toronto portraits, grad shoots, and event coverage with clear pricing and fast booking."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/book"
      />

      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-20 lg:pt-8">
          <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(124,92,65,0.18),transparent_48%),radial-gradient(circle_at_top_right,rgba(205,177,153,0.32),transparent_38%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-5">
              <Link to="/" className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
                Shoot For Arts
              </Link>
              <span className="hidden text-sm text-accent-dark sm:inline">Toronto-based photographer</span>
            </div>

            <div className="pt-10">
              <div className="max-w-3xl">
                <p className="text-xs font-medium uppercase tracking-[0.26em] text-accent-dark">Toronto Photographer</p>
                <h1 className="mt-4 text-5xl font-serif leading-[0.95] text-primary sm:text-6xl">
                  Book a Toronto photoshoot starting at $100
                </h1>
                <p className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-primary/80">
                  Trusted by 50+ clients across Toronto
                </p>
                <p className="mt-4 text-2xl font-serif leading-tight text-primary sm:text-3xl">
                  Clear pricing, fast replies, and a small deposit to lock your date
                </p>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-accent-dark sm:text-lg">
                  Portraits, grad shoots, and event coverage across Toronto without the back-and-forth. Know the price, know what you get, and check availability fast.
                </p>

                <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium uppercase tracking-[0.15em] text-primary">
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Portrait sessions from $150</div>
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Grad shoots from $100</div>
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Events from $125/hr</div>
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Replies within 24 hours</div>
                </div>
                <div className="mt-4 inline-flex rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 text-sm font-medium text-primary">
                  Only a small deposit is needed to lock your date
                </div>

                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <a
                    href="#book-form"
                    onClick={() => trackBookLandingCtaClick("hero", { label: "Check Availability & Lock Your Date", destination: "#book-form" })}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary transition-colors duration-300 hover:bg-accent-dark"
                  >
                    Check Availability &amp; Lock Your Date
                    <ArrowRight size={16} />
                  </a>
                  <Link
                    to="/services"
                    className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-medium text-primary underline underline-offset-4 transition-colors duration-300 hover:text-accent-dark"
                  >
                    See Full Services &amp; Pricing
                    <ArrowRight size={16} />
                  </Link>
                </div>
                <p className="mt-3 text-sm font-medium text-primary">Only a small deposit needed to secure your shoot</p>
                <p className="mt-1 text-sm text-accent-dark">Takes 1 minute. No commitment.</p>

                <div className="mt-3">
                  <p className="text-sm font-medium text-primary">{limitedAvailabilityLabel}</p>
                  <p className="mt-1 text-sm font-medium text-primary">{bookingWindowLabel}</p>
                  <p className="mt-2 text-sm text-accent-dark">
                    Prefer to move faster? Call or text{" "}
                    <a
                      href={publicPhoneHref}
                      onClick={() => trackOutboundClick(publicPhoneHref, "book_page")}
                      className="font-medium text-primary underline underline-offset-4 transition-colors duration-300 hover:text-accent-dark"
                    >
                      {publicPhoneNumber}
                    </a>
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-medium text-primary">Toronto coverage</p>
                  <p className="mt-1 text-sm text-accent-dark">Portraits, campus grads, and events across Toronto</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-medium text-primary">Fast response</p>
                  <p className="mt-1 text-sm text-accent-dark">Replies within 24 hours</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-white/70 p-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-medium text-primary">Clear deliverables</p>
                  <p className="mt-1 text-sm text-accent-dark">Packages list your time, photos, and coverage upfront</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-primary/10 bg-white/75 p-8 shadow-[0_20px_60px_rgba(60,43,24,0.06)]">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent-dark">Pricing Snapshot</p>
            <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Real packages. Clear pricing. Fast decisions.</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-accent-dark">
              Most visitors want to know the price, what is included, and how quickly they can book. Here are the most-booked options pulled from the full services page.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {pricingHighlights.map((item) => (
                <article key={item.title} className="rounded-[1.5rem] border border-primary/10 bg-secondary/70 p-5">
                  <h3 className="text-2xl font-serif text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-accent-dark">{item.description}</p>

                  <div className="mt-5 space-y-3">
                    {item.tiers.map((tier) => (
                      <div key={`${item.title}-${tier.label}`} className="rounded-2xl border border-primary/10 bg-white/85 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-primary">{tier.label}</p>
                            <p className="mt-1 text-sm leading-relaxed text-accent-dark">{tier.details}</p>
                          </div>
                          <p className="shrink-0 text-sm font-medium uppercase tracking-[0.14em] text-primary">{tier.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="top-work" className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-7xl">
            {photoState === "error" ? (
              <div className="mt-8 rounded-[2rem] border border-primary/10 bg-white/70 p-8 text-sm text-accent-dark">
                More work available in full portfolio below
              </div>
            ) : photoState === "loading" ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`photo-skeleton-${index}`} className="aspect-[4/5] animate-pulse rounded-[1.75rem] bg-primary/10" />
                ))}
              </div>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, index) => renderPhotoCard(photo, index))}
              </div>
            )}
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent-dark">Booking</p>
              <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Get pricing and availability in about 1 minute</h2>
              <p className="mt-4 text-base leading-relaxed text-accent-dark">
                Tell me what you need and your preferred date. I&apos;ll reply within 24 hours with next steps, pricing clarity, and availability.
              </p>
              <p className="mt-4 text-sm font-medium text-primary">{limitedAvailabilityLabel}</p>
              <p className="mt-1 text-sm font-medium text-primary">{bookingWindowLabel}</p>
              <p className="mt-3 text-sm font-medium text-primary">Only a small deposit is needed to secure your date.</p>
              <p className="mt-3 text-sm text-accent-dark">
                Want a faster answer? Call or text{' '}
                <a
                  href={publicPhoneHref}
                  onClick={() => trackOutboundClick(publicPhoneHref, "book_page")}
                  className="font-medium text-primary underline underline-offset-4 transition-colors duration-300 hover:text-accent-dark"
                >
                  {publicPhoneNumber}
                </a>
                .
              </p>
            </div>
            <BookLeadForm />
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-primary/10 bg-secondary/60 p-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent-dark">Portfolio</p>
            <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Still deciding?</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-accent-dark">
              Browse full galleries and explore past work before booking.
            </p>
            <Link
              to="/"
              onClick={() => trackBookLandingCtaClick("portfolio", { label: "View Full Portfolio", destination: "/" })}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary px-7 py-3 text-sm font-medium text-primary transition-colors duration-300 hover:bg-primary hover:text-secondary"
            >
              View Full Portfolio
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-7xl rounded-[1.75rem] bg-primary px-6 py-7 text-secondary">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary/80">Trusted Across Toronto</p>
            <h2 className="mt-3 text-3xl font-serif leading-tight">Trusted by students, creatives, and organizations across Toronto</h2>
            <p className="mt-4 text-sm leading-relaxed text-secondary/80">
              Recent work includes student sessions, events, and creative shoots across Toronto
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {trustOrganizations.map((organization) => (
                <span key={organization} className="rounded-full border border-white/20 px-4 py-2 text-sm text-secondary">
                  {organization}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.25rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(124,92,65,0.08),rgba(255,255,255,0.92))] p-8 shadow-[0_20px_60px_rgba(60,43,24,0.05)] lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent-dark">Google Reviews</p>
              <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">See what clients are saying before you book</h2>
              <div className="mt-4 flex items-center gap-1 text-primary" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-base leading-relaxed text-accent-dark">
                Read what past clients are saying before you book
              </p>
            </div>

            <a
              href={googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackBookLandingCtaClick("reviews", { label: "Read Google Reviews", destination: googleReviewsUrl });
                trackOutboundClick(googleReviewsUrl, "book_google_reviews");
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary transition-colors duration-300 hover:bg-accent-dark"
            >
              Read Google Reviews
              <ExternalLink size={16} />
            </a>
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-primary/10 bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(60,43,24,0.05)]">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent-dark">Final Step</p>
            <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Have a date in mind? Check availability before the best slots go.</h2>
            <p className="mt-4 text-sm text-accent-dark">A small deposit secures your date once we confirm the details.</p>
            <a
              href="#book-form"
              onClick={() => trackBookLandingCtaClick("final", { label: "Check Availability & Lock Your Date", destination: "#book-form" })}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary transition-colors duration-300 hover:bg-accent-dark"
            >
              Check Availability &amp; Lock Your Date
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BookLandingPage;
