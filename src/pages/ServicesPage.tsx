import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Accordion from "../components/Accordion";

const ServicesPage: React.FC = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

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
    { title: "Tier 1 (Solo Shoot)", price: "$150", details: ["30-minute shoot", "5 Pro-Edited + 5 Base-Edited photos", "1 outfit"] },
    { title: "Tier 2 (solo shoot)", price: "$200", details: ["1-hour shoot", "8 Pro-Edited + 10 Base-Edited photos", "1 outfit"] },
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
    { title: "Tier 1", price: "$120", details: ["Solo coverage only", "45-min session", "15–20 edited photos", "Group photos (client must be in all)"] },
    { title: "Tier 2", price: "$200", details: ["Solo + small group coverage", "1.5 hours", "25–30 edited photos"] },
  ];

  const gradPhotoshoots = [
    { title: "Tier 1", price: "$100", details: ["30-min session", "15 edited photos", "Single graduate only"] },
    { title: "Tier 2", price: "$150", details: ["1-hour session", "25 edited photos", "Includes family or friend group shots"] },
  ];

  const eventPhotography = [
    { title: "Tier 1", price: "$100/hr", details: ["2-hour minimum", "Unlimited photos", "All color-corrected", "Online gallery delivery"] },
    { title: "Tier 2", price: "$150/hr", details: ["Includes highlight reel", "Two-camera coverage", "Social clip (30–45 seconds)"] },
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
      details: [
        "Extra outfit – $25",
        "Additional 30 mins – $40",
        "Studio rental – varies",
        "Highlight reel – $80",
        "Drone footage – $200",
        "Rush delivery – $50",
      ],
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

  return (
    <div className="pt-32 pb-20 px-4 max-w-6xl mx-auto">
      <motion.h1
        className="text-4xl font-serif mb-16 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Services
      </motion.h1>

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
            <Accordion category={section.label} tiers={section.tiers} />
          </div>
        </motion.div>
      ))}

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
