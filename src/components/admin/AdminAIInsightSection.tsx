import { useEffect, useMemo, useState } from "react";

import { aiStatusClassByKey } from "./adminAIStyles";
import type { AdminAIDraftVersion, AdminAIInquiryDetailResponse, AdminAIReviewAction } from "../../utils";

interface AdminAIInsightSectionProps {
  detail: AdminAIInquiryDetailResponse | null;
  loading: boolean;
  error: string | null;
  actionState?: {
    saving: boolean;
    approving: boolean;
    sending: boolean;
    error: string | null;
    success: string | null;
  };
  onSaveEdit?: (contactSubmissionId: string, draftId: string, payload: { subjectLine?: string | null; bodyText: string }) => Promise<void>;
  onApprove?: (draftId: string) => Promise<void>;
  onCopyDraft?: (draft: { subjectLine?: string | null; bodyText: string }) => Promise<void> | void;
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

const AdminAIInsightSection = ({
  detail,
  loading,
  error,
  actionState,
  onSaveEdit,
  onApprove,
  onCopyDraft,
}: AdminAIInsightSectionProps) => {
  const activeAnalysis = detail?.activeAnalysis ?? null;
  const latestDraft = detail ? getLatestDraft(detail.draftVersions) : null;
  const sendableDraft = getSendableDraft(detail, latestDraft);
  const recentReviewActions = useMemo(() => (detail?.reviewActions ?? []).slice(0, 5), [detail?.reviewActions]);

  const [isEditing, setIsEditing] = useState(false);
  const [subjectValue, setSubjectValue] = useState("");
  const [bodyValue, setBodyValue] = useState("");

  useEffect(() => {
    setSubjectValue(latestDraft?.subject_line ?? "");
    setBodyValue(latestDraft?.body_text ?? "");
    setIsEditing(false);
  }, [latestDraft?.id, latestDraft?.subject_line, latestDraft?.body_text]);

  const subjectBaseline = latestDraft?.subject_line ?? "";
  const bodyBaseline = latestDraft?.body_text ?? "";
  const isDirty = subjectValue !== subjectBaseline || bodyValue !== bodyBaseline;
  const canSave = Boolean(detail && latestDraft && bodyValue.trim() && isDirty && !actionState?.saving);
  const actionSummary = getActionSummary(recentReviewActions[0] ?? null);
  const latestDraftUpdatedAt = latestDraft?.sent_at ?? latestDraft?.approved_at ?? latestDraft?.created_at ?? null;
  const insightHeaderLabel = getInsightHeaderLabel(detail);

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
                  )}
                </div>
              </div>
            )}
          </div>

          {detail.draftVersions.length > 1 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Version History</p>
              <div className="mt-2 space-y-2">
                {detail.draftVersions.slice(0, 5).map((draft) => (
                  <div key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
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

          {recentReviewActions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Review Timeline</p>
              <div className="mt-2 space-y-2">
                {recentReviewActions.map((action) => (
                  <div key={action.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
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
    </section>
  );
};

export default AdminAIInsightSection;
