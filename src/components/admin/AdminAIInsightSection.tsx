import { aiStatusClassByKey } from "./adminAIStyles";
import type { AdminAIDraftVersion, AdminAIInquiryDetailResponse } from "../../utils";

interface AdminAIInsightSectionProps {
  detail: AdminAIInquiryDetailResponse | null;
  loading: boolean;
  error: string | null;
}

const labelize = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getLatestDraft = (drafts: AdminAIDraftVersion[]) =>
  [...drafts].sort((a, b) => b.version_number - a.version_number)[0] ?? null;

const AdminAIInsightSection = ({ detail, loading, error }: AdminAIInsightSectionProps) => {
  const activeAnalysis = detail?.activeAnalysis ?? null;
  const latestDraft = detail ? getLatestDraft(detail.draftVersions) : null;

  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">AI Insight</p>
          <p className="mt-0.5 text-sm text-gray-500">Recommendation and draft guidance for this inquiry.</p>
        </div>
        {activeAnalysis && (
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${aiStatusClassByKey[activeAnalysis.status]}`}>
              {labelize(activeAnalysis.status)}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                aiStatusClassByKey[activeAnalysis.review_state] ?? aiStatusClassByKey.archived
              }`}
            >
              {labelize(activeAnalysis.review_state)}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-3 animate-pulse">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Latest Draft</p>
              {latestDraft && (
                <span className="text-xs text-gray-500">
                  Version {latestDraft.version_number} • {labelize(latestDraft.status)}
                </span>
              )}
            </div>
            {latestDraft ? (
              <div className="mt-2 space-y-2">
                {latestDraft.subject_line && (
                  <p className="text-sm font-medium text-gray-900">{latestDraft.subject_line}</p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{latestDraft.body_text}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No draft has been generated for this inquiry yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminAIInsightSection;
