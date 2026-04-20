import { useEffect, useMemo, useState } from "react";

import { aiStatusClassByKey } from "./adminAIStyles";
import type {
  AdminAIAssistantMessage,
  AdminAIAssistantTaskType,
  AdminAIContextNote,
  AdminAIDraftVersion,
  AdminAIInquiryDetailResponse,
  AdminAIReviewAction,
} from "../../utils";

interface AdminAIInsightSectionProps {
  detail: AdminAIInquiryDetailResponse | null;
  loading: boolean;
  error: string | null;
  actionState?: {
    saving: boolean;
    approving: boolean;
    sending: boolean;
    savingContext: boolean;
    archivingContext: boolean;
    rewriting: boolean;
    assistantAsking: boolean;
    error: string | null;
    success: string | null;
  };
  onSaveEdit?: (contactSubmissionId: string, draftId: string, payload: { subjectLine?: string | null; bodyText: string }) => Promise<void>;
  onApprove?: (draftId: string) => Promise<void>;
  onCopyDraft?: (draft: { subjectLine?: string | null; bodyText: string }) => Promise<void> | void;
  onMarkSent?: (draftId: string) => Promise<void>;
  onSaveContextNote?: (note: string) => Promise<void>;
  onArchiveContextNote?: (contextNoteId: string) => Promise<void>;
  onRewriteDraft?: (
    draftId: string,
    payload: { mode: "rewrite" | "regenerate"; selectedContextNoteIds: string[]; instruction?: string | null; tone?: string | null }
  ) => Promise<void>;
  onAskAssistant?: (payload: {
    taskType: AdminAIAssistantTaskType;
    message: string;
    selectedContextNoteIds: string[];
    sourceDraftId?: string | null;
    threadId?: string | null;
  }) => Promise<void>;
}

const labelize = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
    : null;

const trimOrNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getLatestDraft = (drafts: AdminAIDraftVersion[]) =>
  [...drafts].sort((a, b) => b.version_number - a.version_number)[0] ?? null;

const getSendableDraft = (detail: AdminAIInquiryDetailResponse | null, latestDraft: AdminAIDraftVersion | null) => {
  if (latestDraft && ["approved", "send_failed"].includes(latestDraft.status)) {
    return latestDraft;
  }
  return detail?.latestApprovedDraft ?? null;
};

const getActionSummary = (action: AdminAIReviewAction | null) => {
  if (!action) return null;
  const at = formatDateTime(action.created_at);
  return at ? `${labelize(action.action_type)} • ${at}` : labelize(action.action_type);
};

const getInsightHeaderLabel = (detail: AdminAIInquiryDetailResponse | null) => {
  const activeAnalysis = detail?.activeAnalysis;
  if (!activeAnalysis) return null;
  if (activeAnalysis.status === "pending") return "AI Pending";
  if (activeAnalysis.status === "failed") return "AI Failed";
  if (activeAnalysis.review_state === "pending_review") return "Ready for Review";
  return labelize(activeAnalysis.review_state);
};

const getActiveContextNotes = (notes: AdminAIContextNote[]) => notes.filter((note) => note.status === "active");
const getArchivedContextNotes = (notes: AdminAIContextNote[]) => notes.filter((note) => note.status === "archived");

const assistantTaskOptions: Array<{
  taskType: AdminAIAssistantTaskType;
  label: string;
  placeholder: string;
}> = [
  {
    taskType: "suggested_reply_help",
    label: "Reply Advice",
    placeholder: "What should I say next to this client based on the latest details?",
  },
  {
    taskType: "pricing_guidance",
    label: "Pricing Guidance",
    placeholder: "What pricing direction makes sense for this inquiry and why?",
  },
  {
    taskType: "clarifying_questions",
    label: "Clarifying Questions",
    placeholder: "What are the most important follow-up questions I should ask next?",
  },
  {
    taskType: "shoot_planning",
    label: "Planning Ideas",
    placeholder: "What timing, location, lighting, or planning considerations should I think about?",
  },
  {
    taskType: "package_recommendation",
    label: "Package Fit",
    placeholder: "What package or scope recommendation fits this inquiry best?",
  },
];

const assistantTaskLabelByType = assistantTaskOptions.reduce<Record<AdminAIAssistantTaskType, string>>((acc, option) => {
  acc[option.taskType] = option.label;
  return acc;
}, {
  general_inquiry_help: "General Help",
  suggested_reply_help: "Reply Advice",
  pricing_guidance: "Pricing Guidance",
  clarifying_questions: "Clarifying Questions",
  shoot_planning: "Planning Ideas",
  package_recommendation: "Package Fit",
});

const assistantPlaceholderByType = assistantTaskOptions.reduce<Record<AdminAIAssistantTaskType, string>>((acc, option) => {
  acc[option.taskType] = option.placeholder;
  return acc;
}, {
  general_inquiry_help: "Ask for help with this inquiry’s next steps, pricing direction, or follow-up questions.",
  suggested_reply_help: "What should I say next to this client based on the latest details?",
  pricing_guidance: "What pricing direction makes sense for this inquiry and why?",
  clarifying_questions: "What are the most important follow-up questions I should ask next?",
  shoot_planning: "What timing, location, lighting, or planning considerations should I think about?",
  package_recommendation: "What package or scope recommendation fits this inquiry best?",
});

const getAssistantTaskLabel = (taskType: AdminAIAssistantTaskType) => assistantTaskLabelByType[taskType] ?? labelize(taskType);

const getAssistantActorLabel = (message: AdminAIAssistantMessage) => {
  if (message.actor_type === "admin") return "You";
  if (message.actor_type === "assistant") return "Assistant";
  return "System";
};

const AdminAIInsightSection = ({
  detail,
  loading,
  error,
  actionState,
  onSaveEdit,
  onApprove,
  onCopyDraft,
  onMarkSent,
  onSaveContextNote,
  onArchiveContextNote,
  onRewriteDraft,
  onAskAssistant,
}: AdminAIInsightSectionProps) => {
  const activeAnalysis = detail?.activeAnalysis ?? null;
  const latestDraft = detail ? getLatestDraft(detail.draftVersions) : null;
  const sendableDraft = getSendableDraft(detail, latestDraft);
  const recentReviewActions = useMemo(() => (detail?.reviewActions ?? []).slice(0, 5), [detail?.reviewActions]);
  const activeContextNotes = useMemo(() => getActiveContextNotes(detail?.contextNotes ?? []), [detail?.contextNotes]);
  const archivedContextNotes = useMemo(() => getArchivedContextNotes(detail?.contextNotes ?? []), [detail?.contextNotes]);
  const assistantThread = detail?.assistantThread ?? null;
  const assistantMessages = useMemo(() => detail?.assistantMessages ?? [], [detail?.assistantMessages]);

  const [isEditing, setIsEditing] = useState(false);
  const [subjectValue, setSubjectValue] = useState("");
  const [bodyValue, setBodyValue] = useState("");
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [newContextNote, setNewContextNote] = useState("");
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [selectedContextNoteIds, setSelectedContextNoteIds] = useState<string[]>([]);
  const [isAssistantPanelOpen, setIsAssistantPanelOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [selectedAssistantTaskType, setSelectedAssistantTaskType] = useState<AdminAIAssistantTaskType | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setSubjectValue(latestDraft?.subject_line ?? "");
    setBodyValue(latestDraft?.body_text ?? "");
    setIsEditing(false);
  }, [latestDraft?.id, latestDraft?.subject_line, latestDraft?.body_text]);

  useEffect(() => {
    setSelectedContextNoteIds((prev) => prev.filter((id) => activeContextNotes.some((note) => note.id === id)));
  }, [activeContextNotes]);

  const subjectBaseline = latestDraft?.subject_line ?? "";
  const bodyBaseline = latestDraft?.body_text ?? "";
  const isDirty = subjectValue !== subjectBaseline || bodyValue !== bodyBaseline;
  const canSave = Boolean(detail && latestDraft && bodyValue.trim() && isDirty && !actionState?.saving);
  const actionSummary = getActionSummary(recentReviewActions[0] ?? null);
  const latestDraftUpdatedAt = latestDraft?.sent_at ?? latestDraft?.approved_at ?? latestDraft?.created_at ?? null;
  const insightHeaderLabel = getInsightHeaderLabel(detail);
  const canSaveContextNote = Boolean(trimOrNull(newContextNote) && !actionState?.savingContext);
  const canRewriteDraft = Boolean(
    latestDraft &&
    selectedContextNoteIds.length > 0 &&
    trimOrNull(rewriteInstruction) &&
    !actionState?.rewriting
  );
  const canRegenerateDraft = Boolean(latestDraft && selectedContextNoteIds.length > 0 && !actionState?.rewriting);
  const activeAssistantTaskType = selectedAssistantTaskType ?? "general_inquiry_help";
  const canAskAssistant = Boolean(trimOrNull(assistantQuestion) && !actionState?.assistantAsking);
  const hasDraftHistory = (detail?.draftVersions?.length ?? 0) > 1;
  const hasReviewHistory = recentReviewActions.length > 0;
  const hasHistory = hasDraftHistory || hasReviewHistory;

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">AI Insight</p>
          <p className="mt-0.5 text-sm text-gray-500">Recommendation and draft guidance for this inquiry.</p>
        </div>
        {activeAnalysis && insightHeaderLabel && (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              aiStatusClassByKey[activeAnalysis.review_state] ??
              aiStatusClassByKey[activeAnalysis.status] ??
              aiStatusClassByKey.archived
            }`}
          >
            {insightHeaderLabel}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 animate-pulse space-y-3">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-16 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-200" />
        </div>
      ) : error ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          AI insight could not be loaded right now. Raw inquiry details remain available below.
        </div>
      ) : !detail || !activeAnalysis ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500">
          No AI analysis is available for this inquiry yet.
        </div>
      ) : activeAnalysis.status === "pending" ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500">
          AI analysis is still processing for this inquiry.
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-gray-800">
          {actionState?.error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              {actionState.error}
            </div>
          )}
          {actionState?.success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              {actionState.success}
            </div>
          )}

          {activeAnalysis.summary && (
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Summary</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-800">{activeAnalysis.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Recommendation</p>
              <p className="mt-1 font-medium text-gray-900">
                {activeAnalysis.recommendedCatalogItem?.label ??
                  (activeAnalysis.recommended_action === "custom_quote" ? "Custom quote review" : "Needs clarification")}
              </p>
              <p className="mt-2 text-xs text-gray-500">Action: {labelize(activeAnalysis.recommended_action)}</p>
              {typeof activeAnalysis.confidence_score === "number" && (
                <p className="mt-1 text-xs text-gray-500">Confidence: {Math.round(activeAnalysis.confidence_score * 100)}%</p>
              )}
            </div>

            <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Rationale</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-800">
                {activeAnalysis.rationale_short || "No rationale was stored for this recommendation."}
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Draft Review</p>
                {latestDraftUpdatedAt && (
                  <p className="mt-1 text-xs text-gray-500">Latest update: {formatDateTime(latestDraftUpdatedAt)}</p>
                )}
                {actionSummary && (
                  <p className="mt-1 text-xs text-gray-500">Recent action: {actionSummary}</p>
                )}
              </div>
              {latestDraft && <span className="text-xs text-gray-500">Version {latestDraft.version_number}</span>}
            </div>

            {!latestDraft ? (
              <p className="mt-2 text-sm text-gray-500">No draft has been generated for this inquiry yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Subject</span>
                      <input
                        value={subjectValue}
                        onChange={(event) => setSubjectValue(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                        placeholder="Shoot For Arts Inquiry Follow-Up"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Body</span>
                      <textarea
                        value={bodyValue}
                        onChange={(event) => setBodyValue(event.target.value)}
                        rows={10}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!canSave}
                        onClick={() => {
                          if (!detail || !latestDraft || !onSaveEdit) return;
                          void (async () => {
                            try {
                              await onSaveEdit(detail.contactSubmissionId, latestDraft.id, {
                                subjectLine: subjectValue.trim() || null,
                                bodyText: bodyValue,
                              });
                              setIsEditing(false);
                            } catch {
                              // Keep the editor open so the admin can correct and retry.
                            }
                          })();
                        }}
                        className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {actionState?.saving ? "Saving..." : "Save Edited Draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectValue(subjectBaseline);
                          setBodyValue(bodyBaseline);
                          setIsEditing(false);
                        }}
                        className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestDraft.subject_line && (
                      <p className="text-sm font-medium text-gray-900">{latestDraft.subject_line}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{latestDraft.body_text}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Edit Draft
                    </button>
                  )}
                  {latestDraft.status !== "approved" && latestDraft.status !== "sent" && !isEditing && (
                    <button
                      type="button"
                      disabled={Boolean(actionState?.approving)}
                      onClick={() => {
                        if (!onApprove) return;
                        void onApprove(latestDraft.id);
                      }}
                      className="inline-flex rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
                    >
                      {actionState?.approving ? "Approving..." : "Approve Draft"}
                    </button>
                  )}
                  {sendableDraft && !isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (!onCopyDraft) return;
                          void onCopyDraft({
                            subjectLine: sendableDraft.subject_line,
                            bodyText: sendableDraft.body_text,
                          });
                        }}
                        className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
                      >
                        Copy Draft
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(actionState?.sending) || !onMarkSent}
                        onClick={() => {
                          if (!onMarkSent) return;
                          void onMarkSent(sendableDraft.id);
                        }}
                        className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionState?.sending ? "Marking..." : "Mark as Sent"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <button
              type="button"
              onClick={() => setIsContextPanelOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Context & Rewrite</p>
                <p className="mt-1 text-sm text-gray-500">
                  Add internal context from calls or texts, then rewrite or regenerate using selected notes.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {activeContextNotes.length} active {activeContextNotes.length === 1 ? "note" : "notes"} • {isContextPanelOpen ? "Hide" : "Show"}
              </span>
            </button>

            {isContextPanelOpen && (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Add Internal Context Note</span>
                    <textarea
                      value={newContextNote}
                      onChange={(event) => setNewContextNote(event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      placeholder="Client called and confirmed the shoot location, updated budget, or clarified the concept..."
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canSaveContextNote}
                      onClick={() => {
                        if (!onSaveContextNote || !trimOrNull(newContextNote)) return;
                        void (async () => {
                          try {
                            await onSaveContextNote(newContextNote);
                            setNewContextNote("");
                            setIsContextPanelOpen(true);
                          } catch {
                            // Keep text in place so the admin can retry.
                          }
                        })();
                      }}
                      className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {actionState?.savingContext ? "Saving..." : "Save Context Note"}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Active Context Notes</p>
                      <p className="mt-1 text-xs text-gray-500">Select the notes that should inform the next rewrite or regenerate action.</p>
                    </div>
                    {archivedContextNotes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowArchivedNotes((prev) => !prev)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        {showArchivedNotes ? "Hide archived notes" : `Show archived notes (${archivedContextNotes.length})`}
                      </button>
                    )}
                  </div>

                  {activeContextNotes.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">No active context notes yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {activeContextNotes.map((note) => {
                        const checked = selectedContextNoteIds.includes(note.id);
                        return (
                          <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedContextNoteIds((prev) =>
                                      checked ? prev.filter((id) => id !== note.id) : [...prev, note.id]
                                    );
                                  }}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300"
                                />
                                <div className="min-w-0">
                                  <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{note.note_text}</p>
                                  <p className="mt-1 text-xs text-gray-500">{formatDateTime(note.created_at)}</p>
                                </div>
                              </label>
                              <button
                                type="button"
                                disabled={Boolean(actionState?.archivingContext) || !onArchiveContextNote}
                                onClick={() => {
                                  if (!onArchiveContextNote) return;
                                  void onArchiveContextNote(note.id);
                                }}
                                className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionState?.archivingContext ? "Archiving..." : "Archive"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showArchivedNotes && archivedContextNotes.length > 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Archived Notes</p>
                      <div className="mt-2 space-y-2">
                        {archivedContextNotes.map((note) => (
                          <div key={note.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                            <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{note.note_text}</p>
                            <p className="mt-1 text-xs text-gray-500">{formatDateTime(note.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Rewrite Instruction</span>
                    <textarea
                      value={rewriteInstruction}
                      onChange={(event) => setRewriteInstruction(event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      placeholder="Make this warmer, shorter, and mention the updated location details."
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    Rewrite requires selected notes and an instruction. Regenerate uses selected notes without extra instruction.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canRewriteDraft}
                      onClick={() => {
                        if (!latestDraft || !onRewriteDraft) return;
                        void onRewriteDraft(latestDraft.id, {
                          mode: "rewrite",
                          selectedContextNoteIds,
                          instruction: rewriteInstruction,
                          tone: null,
                        });
                      }}
                      className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {actionState?.rewriting ? "Generating..." : "Rewrite Draft"}
                    </button>
                    <button
                      type="button"
                      disabled={!canRegenerateDraft}
                      onClick={() => {
                        if (!latestDraft || !onRewriteDraft) return;
                        void onRewriteDraft(latestDraft.id, {
                          mode: "regenerate",
                          selectedContextNoteIds,
                          instruction: null,
                          tone: null,
                        });
                      }}
                      className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionState?.rewriting ? "Generating..." : "Regenerate Draft"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <button
              type="button"
              onClick={() => setIsAssistantPanelOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Assistant</p>
                <p className="mt-1 text-sm text-gray-500">
                  Internal inquiry guidance for wording, pricing, clarifying questions, and planning ideas.
                </p>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {assistantMessages.length} {assistantMessages.length === 1 ? "message" : "messages"} • {isAssistantPanelOpen ? "Hide" : "Show"}
              </span>
            </button>

            {isAssistantPanelOpen && (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  Internal guidance only. Does not send or create drafts.
                </div>

                {assistantMessages.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Recent Assistant Thread</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {assistantThread ? `Active thread started ${formatDateTime(assistantThread.created_at)}` : "Recent inquiry guidance"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                      {assistantMessages.map((message) => {
                        const isAssistantMessage = message.actor_type === "assistant";
                        return (
                          <div
                            key={message.id}
                            className={`rounded-lg border px-3 py-2.5 ${
                              isAssistantMessage ? "border-teal-200 bg-teal-50" : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                                {getAssistantActorLabel(message)}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                                  {getAssistantTaskLabel(message.task_type)}
                                </span>
                                <span className="text-[11px] text-gray-500">{formatDateTime(message.created_at)}</span>
                              </div>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">{message.message_text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                    Ask for help with this inquiry’s next steps, pricing direction, or follow-up questions.
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Ask The Assistant</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assistantTaskOptions.map((option) => {
                      const isSelected = selectedAssistantTaskType === option.taskType;
                      return (
                        <button
                          key={option.taskType}
                          type="button"
                          disabled={Boolean(actionState?.assistantAsking)}
                          onClick={() => {
                            setSelectedAssistantTaskType(option.taskType);
                            if (!trimOrNull(assistantQuestion)) {
                              setAssistantQuestion(option.placeholder);
                            }
                          }}
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "bg-gray-900 text-white"
                              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-3 block">
                    <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Question</span>
                    <textarea
                      value={assistantQuestion}
                      onChange={(event) => setAssistantQuestion(event.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      placeholder={assistantPlaceholderByType[activeAssistantTaskType]}
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span>
                      Task: <span className="font-medium text-gray-700">{getAssistantTaskLabel(activeAssistantTaskType)}</span>
                    </span>
                    <span>
                      {selectedContextNoteIds.length > 0
                        ? `Using ${selectedContextNoteIds.length} selected context ${selectedContextNoteIds.length === 1 ? "note" : "notes"}`
                        : "No context notes selected"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canAskAssistant || !onAskAssistant}
                      onClick={() => {
                        if (!onAskAssistant || !trimOrNull(assistantQuestion)) return;
                        void (async () => {
                          try {
                            await onAskAssistant({
                              taskType: activeAssistantTaskType,
                              message: assistantQuestion,
                              selectedContextNoteIds,
                              sourceDraftId: latestDraft?.id ?? null,
                              threadId: assistantThread?.id ?? null,
                            });
                            setAssistantQuestion("");
                          } catch {
                            // Keep the question in place so the admin can retry.
                          }
                        })();
                      }}
                      className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {actionState?.assistantAsking ? "Asking..." : "Ask Assistant"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasHistory && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">History</p>
                  <p className="mt-1 text-sm text-gray-500">Past draft versions and review actions for this inquiry.</p>
                </div>
                <span className="text-xs font-medium text-gray-500">{showHistory ? "Hide" : "Show history"}</span>
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {hasDraftHistory && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Version History</p>
                      <div className="mt-2 space-y-2">
                        {detail.draftVersions.slice(0, 5).map((draft) => (
                          <div key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Version {draft.version_number}</p>
                              <p className="text-xs text-gray-500">
                                {labelize(draft.source_type)} • {formatDateTime(draft.created_at)}
                              </p>
                            </div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${aiStatusClassByKey[draft.status] ?? aiStatusClassByKey.archived}`}>
                              {labelize(draft.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasReviewHistory && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Review Timeline</p>
                      <div className="mt-2 space-y-2">
                        {recentReviewActions.map((action) => (
                          <div key={action.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{labelize(action.action_type)}</p>
                              <p className="text-xs text-gray-500">{formatDateTime(action.created_at)}</p>
                            </div>
                            {action.draft_id && (
                              <span className="text-xs text-gray-500">Draft {action.draft_id.slice(0, 8)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminAIInsightSection;
