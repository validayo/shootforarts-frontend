export interface Photo {
  id: string;
  url: string;
  category: string;
  uploaded_at?: string | Date | null;
  is_top?: boolean;
  top_rank?: number | null;
  season_tag?: string | null;
  season_rank?: number | null;
  transformed_url?: string;
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
  extra_questions?: Record<string, unknown>; // flexible for dynamic Qs
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
  extra_questions?: Record<string, unknown>;
}

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: Contact;
}

export type Tab = "dashboard" | "calendar" | "upload";

// Admin credentials interface
export interface AdminCredentials {
  email: string;
  password: string;
}
