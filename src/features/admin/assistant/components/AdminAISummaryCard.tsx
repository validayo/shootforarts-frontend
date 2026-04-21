import { useMemo } from "react";

import type { AdminAIInboxItem } from "../../../../utils";

interface AdminAISummaryCardProps {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  items: AdminAIInboxItem[];
}

const metricChipClass = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2";

const AdminAISummaryCard = ({ enabled, loading, error, items }: AdminAISummaryCardProps) => {
  const reviewedItems = useMemo(
    () => items.filter((item) => item.analysisStatus === "succeeded"),
    [items],
  );

  const { readyForReviewCount, draftsReadyCount, needsGuidanceCount } = useMemo(() => {
    return reviewedItems.reduce(
      (acc, item) => {
        if (item.reviewState === "pending_review") {
          acc.readyForReviewCount += 1;
        }
        if (item.draftStatus === "generated") {
          acc.draftsReadyCount += 1;
        }
        if (item.recommendedAction !== "recommend_catalog") {
          acc.needsGuidanceCount += 1;
        }
        return acc;
      },
      { readyForReviewCount: 0, draftsReadyCount: 0, needsGuidanceCount: 0 },
    );
  }, [reviewedItems]);

  if (!enabled) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">AI Review Queue</p>
          <p className="mt-0.5 text-xs text-gray-500">Light AI workflow summary for the current inbox.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className={`${metricChipClass} animate-pulse`}>
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="mt-1.5 h-5 w-10 rounded bg-gray-200" />
              <div className="mt-1.5 h-3 w-28 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          AI insights are temporarily unavailable. The rest of the dashboard is still fully usable.
        </div>
      ) : reviewedItems.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
          AI is enabled but no AI-reviewed inquiries are available yet.
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className={metricChipClass}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Ready For Review</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-lg font-semibold text-gray-900">{readyForReviewCount}</p>
              <p className="text-xs text-gray-500">Awaiting review</p>
            </div>
          </div>
          <div className={metricChipClass}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Drafts Ready</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-lg font-semibold text-gray-900">{draftsReadyCount}</p>
              <p className="text-xs text-gray-500">Reply drafts</p>
            </div>
          </div>
          <div className={metricChipClass}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Needs Clarification</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-lg font-semibold text-gray-900">{needsGuidanceCount}</p>
              <p className="text-xs text-gray-500">Quote or details needed</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminAISummaryCard;
