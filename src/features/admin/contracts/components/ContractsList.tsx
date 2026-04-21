import React from "react";

import type { AdminContractListItem, AdminContractTemplateDefinition } from "../../../../utils";

interface AdminContractsListProps {
  contracts: AdminContractListItem[];
  templates: AdminContractTemplateDefinition[];
  selectedContractId: string | null;
  loading: boolean;
  error: string | null;
  onOpen: (contractId: string) => void;
  onNewContract: () => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "Just now";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 ring-gray-200",
  review_ready: "bg-amber-50 text-amber-700 ring-amber-100",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  archived: "bg-gray-50 text-gray-500 ring-gray-200",
};

const AdminContractsList: React.FC<AdminContractsListProps> = ({
  contracts,
  templates,
  selectedContractId,
  loading,
  error,
  onOpen,
  onNewContract,
}) => {
  const templateLabels = templates.reduce<Record<string, string>>((acc, template) => {
    acc[template.type] = template.label;
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Contracts</h3>
          <p className="mt-1 text-sm text-gray-600">Saved drafts and inquiry-linked contracts.</p>
        </div>
        <button
          type="button"
          onClick={onNewContract}
          className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          New contract
        </button>
      </div>

      <div className="space-y-3 p-4">
        {loading ? (
          <div className="space-y-3" aria-label="Contracts loading">
            {[0, 1, 2].map((index) => (
              <div key={index} className="animate-pulse rounded-xl border border-gray-200 p-4">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : contracts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600">
            No contracts yet. Start with a manual draft or generate one from an inquiry.
          </div>
        ) : (
          contracts.map((contract) => {
            const isSelected = contract.id === selectedContractId;
            const clientLine = [contract.clientName, contract.clientBusinessName].filter(Boolean).join(" • ");
            return (
              <button
                key={contract.id}
                type="button"
                onClick={() => onOpen(contract.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{contract.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {templateLabels[contract.contractType] ?? contract.contractType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                      STATUS_STYLES[contract.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {contract.status.replace(/_/g, " ")}
                  </span>
                </div>
                {clientLine ? <p className="mt-3 text-sm text-gray-700">{clientLine}</p> : null}
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span>{contract.contactSubmissionId ? "Linked inquiry" : "Manual draft"}</span>
                  <span>{formatDateTime(contract.updatedAt)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

export default AdminContractsList;
