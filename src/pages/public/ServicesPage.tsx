import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import Accordion from "../../components/services/Accordion";
import { addOnOptions } from "../../utils";
import { trackServiceBookNow } from "../../lib/analytics/events";

const servicesFaqItems = [
  {
    question: "What is your turnaround time?",
    answer: "Most galleries are delivered within 4-10 days depending on the session type and scope.",
  },
  {
    question: "Can I bring props?",
    answer: "Yes. You are welcome to bring props that fit your concept. Share your ideas in advance so we can plan the setup smoothly.",
  },
  {
    question: "Do you charge for RAW photos?",
    answer: "All RAW photos are included with all packages.",
  },
  {
    question: "What if I am late or need to reschedule?",
    answer:
      "Please communicate as early as possible. If you are more than 15 minutes late, a late fee will be charged. Rescheduling is handled case-by-case based on availability.",
  },
  {
    question: "Can I bring a friend to my shoot?",
    answer:
      "Yes, you can bring one friend for support. For larger groups or additional participants, include that in your booking details ahead of time.",
  },
  {
    question: "Do you help with posing?",
    answer: "Yes, I help with posing throughout the session so you feel comfortable and look your best on camera.",
  },
];

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  const categoryImages: Record<string, string> = {
    base: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/BASE.jpg",
    creative: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/Creative.jpg",
    prom: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/PROM.jpg",
    grad: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/GRAD.jpg",
    event: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/EVENTS.JPG",
    wedding: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/WEDDING.jpg",
    addons: "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/ADDON.jpg",
  };

  const basePhotoshoot = [
    { title: "Tier 1 (Solo Shoot)", price: "$150", details: ["1-hour shoot", "6 Pro-Edited + 5 Base-Edited photos", "1 outfit"] },
    { title: "Tier 2 (solo shoot)", price: "$200", details: ["1-hour shoot", "12 Pro-Edited + 10 Base-Edited photos", "2 outfit"] },
    { title: "Tier 1 (Couple/Family)", price: "$250", details: ["1-hour shoot", "11 Pro-Edited + 15 Base-Edited photos", "2 outfits"] },
    { title: "Tier 2 (Couple/Family)", price: "$350", details: ["2-hour shoot", "15 Pro-Edited + 20 Base-Edited photos", "4 outfits"] },
  ];

  const creativePhotoshoot = [
    { title: "Tier 1", price: "$180", details: ["30-minute shoot", "Editorial or creative concept", "5 Pro-Edited photos", "1 outfit / set"] },
    {
      title: "Tier 2",
      price: "$350",
      details: ["2-hour shoot", "Advanced creative setup (props, lighting, or theme)", "15 Pro-Edited photos", "3 outfits / sets"],
    },
  ];

  const promHoco = [
    { title: "Tier 1", price: "$110", details: ["Solo coverage only", "45-min session", "15–20 edited photos", "Group photos (client must be in all)"] },
    { title: "Tier 2", price: "$150", details: ["Solo + small group coverage", "1.5 hours", "25–30 edited photos"] },
  ];

  const gradPhotoshoots = [
    { title: "Tier 1", price: "$100", details: ["30-min session", "15 edited photos", "Single graduate only"] },
    { title: "Tier 2", price: "$200", details: ["1-hour session", "25 edited photos", "Includes family or friend group shots"] },
  ];

  const eventPhotography = [
    { title: "Tier 1", price: "$125/hr", details: ["2-hour minimum", "Unlimited photos", "All color-corrected", "Online gallery delivery"] },
    { title: "Tier 2", price: "$150/hr", details: ["2-hour minimum","Includes highlight reel", "Two-camera coverage", "Social clip (30–45 seconds)"] },
  ];

  const weddingPhotography = [
    { title: "Tier 1", price: "$1000", details: ["5 hours", "1 photographer", "Full gallery + USB delivery"] },
    { title: "Tier 2", price: "$1500", details: ["8 hours", "2 photographers", "Engagement shoot", "Full gallery + highlight reel"] },
    { title: "Tier 3", price: "$2200", details: ["Full-day coverage", "2 photographers + drone", "Next-day sneak peeks", "Custom album book"] },
  ];

  const generalAddOns = [
    {
      title: "Add-On Options",
      price: "",
      details: addOnOptions,
    },
  ];

  const sections = [
    { key: "base", label: "Base Photoshoot Pricelist (Headshots, Birthday, Family Portraits)", tiers: basePhotoshoot },
    { key: "creative", label: "Creative Photoshoot Pricelist (Editorial, Graphic)", tiers: creativePhotoshoot },
    { key: "prom", label: "Prom / HOCO", tiers: promHoco },
    { key: "grad", label: "Grad Photoshoots", tiers: gradPhotoshoots },
    { key: "event", label: "Event Photography", tiers: eventPhotography },
    { key: "wedding", label: "Wedding Photography", tiers: weddingPhotography },
    { key: "addons", label: "General Add-Ons", tiers: generalAddOns },
  ];

  // Map internal section keys to ContactForm service options
  const serviceKeyMap: Record<string, string | undefined> = {
    base: "Base Photoshoot",
    creative: "Creative Photoshoot",
    prom: "Prom / HOCO",
    grad: "Grad Photoshoots",
    event: "Event Photography",
    wedding: "Wedding Photography",
    addons: undefined, // not a direct bookable service
  };

  useEffect(() => {
    const scriptId = "services-faq-jsonld";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: servicesFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });

    document.head.appendChild(script);
    return () => {
      const node = document.getElementById(scriptId);
      if (node) node.remove();
    };
  }, []);

  return (
    <div className="pt-32 pb-20 px-4 max-w-6xl mx-auto">
      <SEO
        title="Services - Shoot For Arts"
        description="Let’s make something together. Reach out to Ayo for portraits, events, or creative shoots — wherever your story takes you."
        keywords={["book a photoshoot", "contact photographer", "portrait session", "event shoot", "creative photos", "Shoot For Arts", "Ayo"]}
        ogTitle="Services - Shoot For Arts"
        ogDescription="Ready to create something special? Contact Ayo at Shoot For Arts to plan your next shoot or creative project."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/services"
      />

      {sections.map((section, index) => (
        <motion.div
          key={section.key}
          className={`flex flex-col md:flex-row items-center gap-10 mb-24 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.img
            src={categoryImages[section.key]}
            alt={section.label}
            className="w-full md:w-1/2 aspect-[5/4] object-cover rounded-xl shadow-lg hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="flex-1 w-full md:w-1/2 bg-secondary/20 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <Accordion category={section.label} tiers={section.tiers} defaultOpenIndex={section.key === "addons" ? 0 : null} />
            {serviceKeyMap[section.key] && (
              <div className="mt-6 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const selectedService = serviceKeyMap[section.key]!;
                    trackServiceBookNow(selectedService);
                    navigate(`/contact?service=${encodeURIComponent(selectedService)}`);
                  }}
                  aria-label={`Book ${serviceKeyMap[section.key]} now`}
                  className="inline-flex items-center px-6 py-2.5 rounded-full border border-primary text-primary bg-transparent hover:bg-primary hover:text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                >
                  Book Now
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      ))}

      <motion.div id="services-faq" className="mt-8 mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h3 className="text-2xl font-serif mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {servicesFaqItems.map((item) => (
            <details key={item.question} className="rounded-lg border border-accent bg-secondary/20 p-4">
              <summary className="cursor-pointer font-medium">{item.question}</summary>
              <p className="mt-3 text-accent-dark">{item.answer}</p>
            </details>
          ))}
        </div>
      </motion.div>

      <div className="mb-16 rounded-lg border border-accent/60 bg-white p-4">
        <h3 className="text-lg font-serif mb-2">Videography Available</h3>
        <p className="text-sm text-accent-dark">
          Need videography for your event or project? Reach out through the contact form or email{" "}
          <a href="mailto:contact@shootforarts.com" className="text-primary hover:underline">
            contact@shootforarts.com
          </a>
          .
        </p>
      </div>

      {/* CTA section */}
      <motion.div className="mt-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <h3 className="text-2xl font-serif mb-4">Custom Packages Available</h3>
        <p className="text-accent-dark mb-6">Need something specific? Let's create a custom package that perfectly fits your needs.</p>
        <Link to="/contact" className="inline-block border border-primary px-8 py-3 text-primary hover:bg-primary hover:text-white transition-all duration-300">
          Get in Touch
        </Link>
      </motion.div>
    </div>
  );
};

export default ServicesPage;
