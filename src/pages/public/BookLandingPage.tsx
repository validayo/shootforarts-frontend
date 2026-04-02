import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Camera, ExternalLink, MapPin, Star } from "lucide-react";
import SEO from "../../components/seo/SEO";
import Footer from "../../components/layout/Footer";
import BookLeadForm from "../../components/landing/BookLeadForm";
import { trackBookLandingCtaClick, trackOutboundClick } from "../../lib/analytics/events";
import { getGallery } from "../../lib/api/services";
import type { Photo } from "../../utils/types";

const packageHighlights = [
  {
    title: "Portraits",
    price: "from $125",
    description: "Clean personal portraits, birthdays, creative looks, and short solo sessions around Toronto.",
  },
  {
    title: "Events",
    price: "from $140/hr",
    description: "Coverage for campus events, celebrations, brand activations, and community gatherings.",
  },
  {
    title: "Grad shoots",
    price: "from $150",
    description: "Caps, gowns, campus landmarks, and polished grad portraits for individuals or small groups.",
  },
];

const trustOrganizations = ["TTC", "TDSB", "Ontario Tech University", "Blackhurst Cultural Centre"];
const googleReviewsUrl = "https://share.google/EhJPfBBpqj9hFRSDs";
const urgencyLabel = "Now booking March & April 2026 sessions";

const BookLandingPage: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "error">("loading");

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
        title="Book a Toronto Photographer | Shoot For Arts"
        description="Book portraits, grad shoots, and event photography in Toronto with Shoot For Arts. Clear pricing, quick inquiries, and direct contact."
        ogTitle="Book a Toronto Photographer | Shoot For Arts"
        ogDescription="Book portraits, graduations, and events directly with Shoot For Arts in Toronto."
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
                  Portraits, Graduations &amp; Events
                </h1>
                <p className="mt-4 text-2xl font-serif leading-tight text-primary sm:text-3xl">Book your photoshoot in minutes</p>
                <p className="mt-5 text-lg font-medium uppercase tracking-[0.18em] text-primary/80">Starting at $125</p>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-accent-dark sm:text-lg">
                  Quick booking. Clear pricing. Fast turnaround. No back-and-forth. No confusion.
                </p>

                <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium uppercase tracking-[0.15em] text-primary">
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Portrait sessions from $125</div>
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Event coverage from $140/hr</div>
                  <div className="rounded-full border border-primary/15 bg-white/80 px-4 py-3">Grad shoots from $150</div>
                </div>
                <p className="mt-3 text-sm font-medium text-primary">Deposit secures your date</p>

                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <a
                    href="#book-form"
                    onClick={() => trackBookLandingCtaClick("hero", { label: "Book Now", destination: "#book-form" })}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary transition-colors duration-300 hover:bg-accent-dark"
                  >
                    Book Now
                    <ArrowRight size={16} />
                  </a>
                  <Link
                    to="/"
                    className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-medium text-primary underline underline-offset-4 transition-colors duration-300 hover:text-accent-dark"
                  >
                    View Full Portfolio
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-medium text-primary">{urgencyLabel}</p>
                  <p className="mt-1 text-sm font-medium text-primary">Limited spots available</p>
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
                  <p className="mt-3 text-sm font-medium text-primary">Curated work</p>
                  <p className="mt-1 text-sm text-accent-dark">Top work from recent shoots across Toronto</p>
                </div>
              </div>
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
              <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Ready to lock in your shoot?</h2>
              <p className="mt-4 text-base leading-relaxed text-accent-dark">
                Tell me what you need and your preferred date. I&apos;ll get back to you within 24 hours.
              </p>
              <p className="mt-4 text-sm font-medium text-primary">{urgencyLabel}</p>
            </div>
            <BookLeadForm />
          </div>
        </section>

        <section className="px-6 pb-16 sm:px-8 lg:px-10 lg:pb-20">
          <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-primary/10 bg-white/75 p-8 shadow-[0_20px_60px_rgba(60,43,24,0.06)]">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent-dark">Packages</p>
            <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Simple pricing. No confusion.</h2>
            <div className="mt-8 grid gap-4">
              {packageHighlights.map((item) => (
                <article key={item.title} className="rounded-[1.5rem] border border-primary/10 bg-secondary/70 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-serif text-primary">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-accent-dark">{item.description}</p>
                    </div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">{item.price}</p>
                  </div>
                </article>
              ))}
            </div>
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
            <h2 className="mt-3 text-3xl font-serif text-primary sm:text-4xl">Have a date in mind? Let&apos;s lock it in.</h2>
            <a
              href="#book-form"
              onClick={() => trackBookLandingCtaClick("final", { label: "Book Now", destination: "#book-form" })}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-secondary transition-colors duration-300 hover:bg-accent-dark"
            >
              Book Now
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
