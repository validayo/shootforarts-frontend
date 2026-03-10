// Shared service and marketing option lists.
export const serviceOptions: Record<string, string[]> = {
  "Base Photoshoot": ["Tier 1 (Solo Shoot)", "Tier 2 (Solo Shoot)", "Tier 1 (Couple/Family)", "Tier 2 (Couple/Family)"],
  "Creative Photoshoot": ["Tier 1", "Tier 2"],
  "Event Photography": ["Tier 1", "Tier 2"],
  "Wedding Photography": ["Tier 1", "Tier 2", "Tier 3"],
  "Prom / HOCO": ["Tier 1", "Tier 2"],
  "Grad Photoshoots": ["Tier 1", "Tier 2"],
};

export type TierReminder = {
  price: string;
  includes: string[];
};

export const serviceTierReminders: Record<string, Record<string, TierReminder>> = {
  "Base Photoshoot": {
    "Tier 1 (Solo Shoot)": {
      price: "$150",
      includes: ["1-hour shoot", "6 pro-edited + 5 base-edited photos", "1 outfit"],
    },
    "Tier 2 (Solo Shoot)": {
      price: "$200",
      includes: ["1-hour shoot", "12 pro-edited + 10 base-edited photos", "2 outfits"],
    },
    "Tier 1 (Couple/Family)": {
      price: "$250",
      includes: ["1-hour shoot", "11 pro-edited + 15 base-edited photos", "2 outfits"],
    },
    "Tier 2 (Couple/Family)": {
      price: "$350",
      includes: ["2-hour shoot", "15 pro-edited + 20 base-edited photos", "4 outfits"],
    },
  },
  "Creative Photoshoot": {
    "Tier 1": {
      price: "$180",
      includes: ["30-minute shoot", "Editorial or creative concept", "5 pro-edited photos", "1 outfit / set"],
    },
    "Tier 2": {
      price: "$350",
      includes: ["2-hour shoot", "Advanced setup (props, lighting, or theme)", "15 pro-edited photos", "3 outfits / sets"],
    },
  },
  "Event Photography": {
    "Tier 1": {
      price: "$125/hr",
      includes: ["2-hour minimum", "Unlimited photos", "Color-corrected gallery", "Online delivery"],
    },
    "Tier 2": {
      price: "$150/hr",
      includes: ["2-hour minimum", "Highlight reel included", "Two-camera coverage", "30-45 second social clip"],
    },
  },
  "Wedding Photography": {
    "Tier 1": {
      price: "$1000",
      includes: ["5 hours", "1 photographer", "Full gallery + USB delivery"],
    },
    "Tier 2": {
      price: "$1500",
      includes: ["8 hours", "2 photographers", "Engagement shoot", "Full gallery + highlight reel"],
    },
    "Tier 3": {
      price: "$2200",
      includes: ["Full-day coverage", "2 photographers + drone", "Next-day sneak peeks", "Custom album book"],
    },
  },
  "Prom / HOCO": {
    "Tier 1": {
      price: "$110",
      includes: ["Solo coverage", "45-minute session", "15-20 edited photos", "Group photos (client included)"],
    },
    "Tier 2": {
      price: "$150",
      includes: ["Solo + small group coverage", "1.5-hour session", "25-30 edited photos"],
    },
  },
  "Grad Photoshoots": {
    "Tier 1": {
      price: "$100",
      includes: ["30-minute session", "15 edited photos", "Single graduate"],
    },
    "Tier 2": {
      price: "$200",
      includes: ["1-hour session", "25 edited photos", "Includes family or friend group shots"],
    },
  },
};

export const referralOptions = ["Instagram", "Facebook", "Word of mouth", "Google", "Other"];

export const addOnOptions: string[] = [
  "Additional Time (Before 8PM) - $60/hour",
  "Additional Time (After 8PM) - $80/hour",
  "VHS Camera Edit (15 sec) + Clips - $50",
  "Creative Graphic Edit - prices vary",
  "Highlight reel - $80",
  "Drone footage - $200",
  "Studio rental - varies",
  "Rush Delivery (24hr turnaround) - $100",
  "Rush Delivery (48hr turnaround) - $50",
];
