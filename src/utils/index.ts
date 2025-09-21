export interface Photo {
  id: string;
  url: string; // original full-size
  url_thumb?: string; // 400px
  url_medium?: string; // 800px
  url_large?: string; // 1600px
  category: string;
  uploaded_at?: any;
}

// Define form data interface for contact form
export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  service: string;
  occasion: string;
  pinterestInspo?: string;
  add_ons: string[];
  date: string;
  time: string;
  timeframe?: string;
  instagram?: string;
  location?: string;
  referralSource?: string;
  questions?: string;
}

// Service options for the dropdown
export const serviceOptions = [
  "Wedding Photography",
  "Event Photography",
  "Portrait Session",
  "Corporate Event",
  "Family Session",
  "Engagement Session",
  "Other",
];

// Referral source options
export const referralOptions = ["Instagram", "Facebook", "Word of mouth", "Google", "Other"];

// Admin credentials interface
export interface AdminCredentials {
  email: string;
  password: string;
}
