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
  phone: string;
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
  phone?: string;
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

export type AdminAIRecommendedAction = "recommend_catalog" | "custom_quote" | "clarify_first";

export type AdminAIAnalysisStatus = "pending" | "succeeded" | "failed";

export type AdminAIReviewState = "pending_review" | "reviewed" | "approved" | "archived";

export type AdminAIDraftStatus = "generated" | "edited" | "approved" | "archived" | "sent" | "send_failed" | null;

export type AdminAIReviewActionType =
  | "opened"
  | "copied"
  | "edited"
  | "reviewed"
  | "approved"
  | "archived"
  | "send_requested"
  | "send_succeeded"
  | "send_failed";

export interface AdminAIRecommendedCatalogItem {
  id: string;
  label: string;
}

export interface AdminAIInboxItem {
  contactSubmissionId: string;
  clientName: string;
  submittedAt: string;
  service: string | null;
  serviceTier: string | null;
  workflowStatus: string | null;
  analysisStatus: AdminAIAnalysisStatus;
  summary: string | null;
  recommendedAction: AdminAIRecommendedAction;
  recommendedCatalogItem: AdminAIRecommendedCatalogItem | null;
  confidenceScore: number | null;
  draftStatus: AdminAIDraftStatus;
  reviewState: AdminAIReviewState | null;
}

export interface AdminAIInboxResponse {
  ok: boolean;
  items: AdminAIInboxItem[];
  nextCursor: string | null;
  reqId?: string;
}

export interface AdminAIAnalysisDetail {
  id: string;
  contact_submission_id: string;
  status: AdminAIAnalysisStatus;
  review_state: AdminAIReviewState;
  summary: string | null;
  detected_service: string | null;
  detected_service_tier: string | null;
  requested_date_text: string | null;
  requested_time_text: string | null;
  requested_location_text: string | null;
  budget_signal: string | null;
  urgency_signal: string | null;
  recommended_action: AdminAIRecommendedAction;
  recommended_catalog_id: string | null;
  confidence_score: number | null;
  rationale_short: string | null;
  extracted_entities_json: Record<string, unknown>;
  source_snapshot_json: Record<string, unknown>;
  model_name: string;
  prompt_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  recommendedCatalogItem: AdminAIRecommendedCatalogItem | null;
}

export interface AdminAIDraftVersion {
  id: string;
  contact_submission_id: string;
  analysis_id: string | null;
  version_number: number;
  source_type: "initial" | "rewrite" | "manual_seed" | "manual_edit";
  instruction_text: string | null;
  tone: string | null;
  subject_line: string | null;
  body_text: string;
  status: Exclude<AdminAIDraftStatus, null>;
  generated_by: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AdminAIReviewAction {
  id: string;
  contact_submission_id: string;
  draft_id: string | null;
  actor_user_id: string;
  action_type: AdminAIReviewActionType;
  notes: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface AdminAISaveDraftEditResponse {
  ok: boolean;
  draftId: string;
  versionNumber: number;
  status: Exclude<AdminAIDraftStatus, null>;
  reqId?: string;
}

export interface AdminAIApproveDraftResponse {
  ok: boolean;
  draftId: string;
  status: "approved";
  reqId?: string;
}

export interface AdminAISendDraftResponse {
  ok: boolean;
  draftId: string;
  status: "sent";
  sentAt: string;
  toEmail: string;
  reqId?: string;
}

export interface AdminAIInquiryDetailResponse {
  ok: boolean;
  contactSubmissionId: string;
  rawSubmission: Contact;
  activeAnalysis: AdminAIAnalysisDetail | null;
  draftVersions: AdminAIDraftVersion[];
  latestApprovedDraft: AdminAIDraftVersion | null;
  reviewActions: AdminAIReviewAction[];
  workflowStatus: string | null;
  reqId?: string;
}

// Admin credentials interface
export interface AdminCredentials {
  email: string;
  password: string;
}
