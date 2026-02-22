import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tier {
  title: string;
  price: string;
  details: string[];
}

interface AccordionProps {
  category: string;
  tiers: Tier[];
  defaultOpenIndex?: number | null;
}

const Accordion: React.FC<AccordionProps> = ({ category, tiers, defaultOpenIndex = null }) => {
  const [openTier, setOpenTier] = useState<number | null>(defaultOpenIndex);

  return (
    <div className="w-full">
      <h2 className="text-xl font-serif mb-4">{category}</h2>
      <div className="border-t border-gray-300">
        {tiers.map((tier, i) => (
          <div key={i} className="border-b border-gray-200">
            <button
              onClick={() => setOpenTier(openTier === i ? null : i)}
              className="w-full py-3 flex justify-between text-left font-serif text-base md:text-lg"
            >
              <span>
                {tier.title} — {tier.price}
              </span>
              <span>{openTier === i ? "–" : "+"}</span>
            </button>

            <AnimatePresence>
              {openTier === i && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="pb-3 pl-4 text-sm text-accent-dark"
                >
                  <ul className="list-disc list-inside space-y-1">
                    {tier.details.map((detail, j) => (
                      <li key={j}>{detail}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Accordion;
