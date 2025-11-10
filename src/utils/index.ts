export interface Photo {
  id: string;
  url: string;
  category: string;
  uploaded_at?: any;
}

// Form data interface for contact form
export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  service: string;
  service_tier?: string;
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
  extra_questions?: Record<string, any>; // flexible for dynamic Qs
}

// AdminPage-related types
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  service: string;
  service_tier?: string;
  occasion?: string;
  date: string;
  time?: string;
  location?: string;
  instagram?: string;
  referralSource?: string;
  add_ons?: string[];
  pinterestInspo?: string;
  questions?: string;
  created_at?: string;
  extra_questions?: Record<string, any>;
}

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: Contact;
}

export type Tab = "dashboard" | "calendar" | "upload";

// Service options for the dropdown
// utils/index.ts

export const serviceOptions: Record<string, string[]> = {
  "Base Photoshoot": ["Tier 1 (Solo Shoot)", "Tier 2 (Solo Shoot)", "Tier 1 (Couple/Family)", "Tier 2 (Couple/Family)"],
  "Creative Photoshoot": ["Tier 1", "Tier 2"],
  "Event Photography": ["Tier 1", "Tier 2"],
  "Wedding Photography": ["Tier 1", "Tier 2", "Tier 3"],
  "Prom / HOCO": ["Tier 1", "Tier 2"],
  "Grad Photoshoots": ["Tier 1", "Tier 2"],
};

// Referral source options
export const referralOptions = ["Instagram", "Facebook", "Word of mouth", "Google", "Other"];

// Admin credentials interface
export interface AdminCredentials {
  email: string;
  password: string;
}
