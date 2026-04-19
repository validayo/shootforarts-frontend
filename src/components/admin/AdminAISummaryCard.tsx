import type { AdminAIInboxItem } from "../../utils";

interface AdminAISummaryCardProps {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  items: AdminAIInboxItem[];
}

const metricChipClass = "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5";

const AdminAISummaryCard = ({ enabled, loading, error, items }: AdminAISummaryCardProps) => {
  if (!enabled) return null;

  const readyForReviewCount = items.filter(
    (item) => item.analysisStatus === "succeeded" && item.reviewState === "pending_review"
  ).length;
  const draftsReadyCount = items.filter((item) => item.draftStatus === "generated").length;
  const needsGuidanceCount = items.filter((item) => item.recommendedAction !== "recommend_catalog").length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">AI Review Queue</p>
          <p className="mt-0.5 text-sm text-gray-500">Quick AI workflow signals for the current inbox.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className={`${metricChipClass} animate-pulse`}>
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="mt-2 h-6 w-10 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          AI insights are temporarily unavailable. The rest of the dashboard is still fully usable.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-2.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
          AI is enabled but no AI-reviewed inquiries are available yet.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className={metricChipClass}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Ready For Review</p>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <p className="text-xl font-semibold text-gray-900">{readyForReviewCount}</p>
              <p className="text-sm text-gray-500">Awaiting admin review</p>
            </div>
          </div>
          <div className={metricChipClass}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Drafts Ready</p>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <p className="text-xl font-semibold text-gray-900">{draftsReadyCount}</p>
              <p className="text-sm text-gray-500">Reply drafts available</p>
            </div>
          </div>
          <div className={metricChipClass}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Needs Clarification</p>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <p className="text-xl font-semibold text-gray-900">{needsGuidanceCount}</p>
              <p className="text-sm text-gray-500">Custom quote or missing details</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminAISummaryCard;
