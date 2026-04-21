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
  | "assistant_requested"
  | "assistant_responded"
  | "assistant_failed"
  | "copied"
  | "context_added"
  | "context_archived"
  | "edited"
  | "reviewed"
  | "approved"
  | "archived"
  | "rewrite_requested"
  | "rewrite_succeeded"
  | "rewrite_failed"
  | "send_confirmed"
  | "send_requested"
  | "send_succeeded"
  | "send_failed";

export type AdminAIContextNoteStatus = "active" | "archived";
export type AdminAIAssistantThreadStatus = "active" | "archived";
export type AdminAIAssistantActorType = "admin" | "assistant" | "system";
export type AdminAIAssistantTaskType =
  | "suggested_reply_help"
  | "pricing_guidance"
  | "clarifying_questions"
  | "shoot_planning"
  | "package_recommendation"
  | "general_inquiry_help";

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

export interface AdminAIContextNote {
  id: string;
  contact_submission_id: string;
  actor_user_id: string;
  note_text: string;
  status: AdminAIContextNoteStatus;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminAIAssistantThread {
  id: string;
  contact_submission_id: string;
  status: AdminAIAssistantThreadStatus;
  created_by_user_id: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminAIAssistantMessage {
  id: string;
  thread_id: string;
  contact_submission_id: string;
  actor_type: AdminAIAssistantActorType;
  task_type: AdminAIAssistantTaskType;
  message_text: string;
  selected_context_note_ids: string[];
  source_draft_id: string | null;
  response_to_message_id: string | null;
  run_id: string | null;
  metadata_json: Record<string, unknown>;
  created_by_user_id: string | null;
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

export interface AdminAIMarkDraftSentResponse {
  ok: boolean;
  draftId: string;
  status: "sent";
  sentAt: string;
  reqId?: string;
}

export interface AdminAISaveContextNoteResponse {
  ok: boolean;
  contextNoteId: string;
  contactSubmissionId: string;
  status: AdminAIContextNoteStatus;
  reqId?: string;
}

export interface AdminAIArchiveContextNoteResponse {
  ok: boolean;
  contextNoteId: string;
  status: "archived";
  reqId?: string;
}

export interface AdminAIRewriteDraftResponse {
  ok: boolean;
  draftId: string;
  versionNumber: number;
  status: "generated";
  runId?: string;
  reqId?: string;
}

export interface AdminAIInquiryAssistantResponse {
  ok: boolean;
  threadId: string;
  requestMessageId: string;
  responseMessageId: string;
  taskType: AdminAIAssistantTaskType;
  answer: string;
  runId?: string;
  reqId?: string;
}

export type AdminGeneralAssistantTaskType =
  | "pricing_help"
  | "wording_help"
  | "shoot_planning"
  | "location_ideas"
  | "timing_lighting_weather"
  | "general_internal_support";

export type AdminGeneralAssistantSourceType =
  | "official_site"
  | "official_park"
  | "tourism_board"
  | "venue"
  | "photography_blog"
  | "location_roundup"
  | "local_guide"
  | "map_reference"
  | "other";

export type AdminGeneralAssistantPermitLikelihood = "low" | "unclear" | "likely";
export type AdminGeneralAssistantQuickShootPracticality = "easy" | "possible_with_care" | "poor_fit";

export interface AdminGeneralAssistantAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AdminGeneralAssistantSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  sourceType: AdminGeneralAssistantSourceType;
  whyRelevant: string;
}

export interface AdminGeneralAssistantLocationSuggestion {
  label: string;
  area: string | null;
  whyFit: string;
  bestUseWindow: string | null;
  bestShootWindows?: string[];
  locationFeatures?: string[];
  permitLikelihood?: AdminGeneralAssistantPermitLikelihood;
  permitBasis?: string | null;
  permitSourceRef?: string | null;
  quickShootPracticality?: AdminGeneralAssistantQuickShootPracticality;
  accessCautions?: string[];
  frictionNotes?: string[];
  cautions: string[];
  sourceRefs: string[];
  sourceUrls?: string[];
}

export interface AdminGeneralAssistantTurn {
  role: "admin" | "assistant";
  content: string;
  taskType: AdminGeneralAssistantTaskType;
  createdAt: string;
  enableResearch?: boolean;
  attachments?: AdminGeneralAssistantAttachment[];
  answer?: string;
  imageObservations?: string[];
  locationSuggestions?: AdminGeneralAssistantLocationSuggestion[];
  sources?: AdminGeneralAssistantSource[];
  suggestedNextSteps?: string[];
  suggestedQuestions?: string[];
  cautions?: string[];
  referencedCatalogSlugs?: string[];
}

export interface AdminGeneralAssistantInquiryReference {
  contactSubmissionId: string;
  selectedContextNoteIds?: string[];
  sourceDraftId?: string | null;
}

export interface AdminGeneralAssistantUploadedAttachment {
  id: string;
  kind: "image";
  bucket: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  expiresAt: string | null;
}

export interface AdminGeneralAssistantUploadAttachmentResponse {
  ok: boolean;
  attachment: AdminGeneralAssistantUploadedAttachment;
  reqId?: string;
}

export interface AdminGeneralAssistantResponse {
  ok: boolean;
  taskType: AdminGeneralAssistantTaskType;
  answer: string;
  suggestedNextSteps?: string[];
  suggestedQuestions?: string[];
  cautions?: string[];
  referencedCatalogSlugs?: string[];
  imageObservations?: string[];
  locationSuggestions?: AdminGeneralAssistantLocationSuggestion[];
  sources?: AdminGeneralAssistantSource[];
  inquiryLinked?: boolean;
  runId?: string;
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
  contextNotes: AdminAIContextNote[];
  assistantThread: AdminAIAssistantThread | null;
  assistantMessages: AdminAIAssistantMessage[];
  workflowStatus: string | null;
  reqId?: string;
}

export type AdminContractType = "portrait_branding" | "portrait" | "event_conference" | "event";

export type AdminContractStatus = "draft" | "review_ready" | "approved" | "archived";

export type AdminContractFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "select"
  | "multiselect"
  | "list";

export interface AdminContractFieldOption {
  label: string;
  value: string;
}

export interface AdminContractVisibilityRule {
  toggle?: string;
  fieldEquals?: {
    key: string;
    value: string | number | boolean;
  };
}

export interface AdminContractFieldDefinition {
  key: string;
  label: string;
  type: AdminContractFieldType;
  rawType?: string;
  uiGroup?: string;
  required?: boolean;
  requiredOnCreate?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean | string[];
  options?: AdminContractFieldOption[];
  visibleWhen?: AdminContractVisibilityRule;
}

export interface AdminContractToggleDefinition {
  key: string;
  label: string;
  defaultValue: boolean;
  helpText?: string;
}

export interface AdminContractTemplateDefinition {
  type: AdminContractType;
  label: string;
  description: string;
  category?: "portrait" | "event" | string;
  fields: AdminContractFieldDefinition[];
  toggles: AdminContractToggleDefinition[];
  sectionOrder: string[];
}

export interface AdminContractsTemplateManifestResponse {
  ok: boolean;
  templates: AdminContractTemplateDefinition[];
  reqId?: string;
}

export interface AdminContractSection {
  key: string;
  title: string;
  included: boolean;
  bodyText: string;
  bodyHtml: string;
  editedManually: boolean;
}

export interface AdminContractListItem {
  id: string;
  title: string;
  contractType: AdminContractType;
  status: AdminContractStatus;
  contactSubmissionId: string | null;
  clientName: string | null;
  clientBusinessName: string | null;
  templateVersion: string | null;
  updatedAt: string | null;
  approvedAt: string | null;
}

export interface AdminContractDetail {
  id: string;
  title: string;
  contractType: AdminContractType;
  status: AdminContractStatus;
  contactSubmissionId: string | null;
  templateKey: string;
  templateVersion: string;
  fieldValues: Record<string, unknown>;
  toggleValues: Record<string, boolean>;
  sections: AdminContractSection[];
  renderedHtml: string;
  sourceSnapshot: Record<string, unknown>;
  updatedAt: string | null;
  approvedAt: string | null;
}

export interface AdminContractCreatePayload {
  contractType: AdminContractType;
  contactSubmissionId?: string | null;
  fieldValues?: Record<string, unknown>;
  toggleValues?: Record<string, boolean>;
}

export interface AdminContractSavePayload {
  contractId: string;
  fieldValues: Record<string, unknown>;
  toggleValues: Record<string, boolean>;
  sections: AdminContractSection[];
  status: AdminContractStatus;
}

// Admin credentials interface
export interface AdminCredentials {
  email: string;
  password: string;
}
