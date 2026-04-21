import React from "react";

import type { Contact, AdminContractCreatePayload, AdminContractTemplateDefinition } from "../../../../utils";
import AdminContractFieldRenderer from "./ContractFieldRenderer";

type CreateMode = "manual" | "inquiry";

interface AdminContractCreatePanelProps {
  templates: AdminContractTemplateDefinition[];
  contacts: Contact[];
  mode: CreateMode;
  contractType: string;
  contactSubmissionId: string;
  initialFieldValues: Record<string, unknown>;
  creating: boolean;
  error: string | null;
  onModeChange: (mode: CreateMode) => void;
  onContractTypeChange: (contractType: string) => void;
  onContactSubmissionIdChange: (contactSubmissionId: string) => void;
  onInitialFieldValueChange: (key: string, value: unknown) => void;
  onCreate: (payload: AdminContractCreatePayload) => void;
  onCancel?: () => void;
}

const CREATE_MODES: Array<{ key: CreateMode; label: string }> = [
  { key: "manual", label: "Manual" },
  { key: "inquiry", label: "From inquiry" },
];

const HIDDEN_CREATE_FIELD_KEYS = new Set([
  "brandName",
  "deliveryWindowDaysMax",
  "deliveryWindowDaysMin",
  "photographerSignatureName",
  "signingDate",
  "specialNotes",
]);

const AdminContractCreatePanel: React.FC<AdminContractCreatePanelProps> = ({
  templates,
  contacts,
  mode,
  contractType,
  contactSubmissionId,
  initialFieldValues,
  creating,
  error,
  onModeChange,
  onContractTypeChange,
  onContactSubmissionIdChange,
  onInitialFieldValueChange,
  onCreate,
  onCancel,
}) => {
  const selectedTemplate = templates.find((template) => template.type === contractType) ?? null;
  const createFields = (selectedTemplate?.fields ?? []).filter(
    (field) => field.requiredOnCreate && !HIDDEN_CREATE_FIELD_KEYS.has(field.key),
  );
  const initialCreateFieldValues = createFields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field.key] = initialFieldValues[field.key] ?? field.defaultValue ?? "";
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">New Contract</h3>
            <p className="mt-1 text-sm text-gray-600">Start from an inquiry or build a manual draft.</p>
          </div>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap gap-2">
          {CREATE_MODES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onModeChange(option.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                mode === option.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-900">Contract type</span>
          <select
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            value={contractType}
            onChange={(event) => onContractTypeChange(event.target.value)}
          >
            <option value="">Select a contract type</option>
            {templates.map((template) => (
              <option key={template.type} value={template.type}>
                {template.label}
              </option>
            ))}
          </select>
        </label>

        {mode === "inquiry" ? (
          <label className="block">
            <span className="text-sm font-medium text-gray-900">Inquiry</span>
            <select
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              value={contactSubmissionId}
              onChange={(event) => onContactSubmissionIdChange(event.target.value)}
            >
              <option value="">Select an inquiry</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {[contact.firstName, contact.lastName].filter(Boolean).join(" ")} · {contact.service}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {createFields.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {createFields.map((field) => (
              <AdminContractFieldRenderer
                key={field.key}
                field={field}
                value={initialCreateFieldValues[field.key]}
                onChange={(value) => onInitialFieldValueChange(field.key, value)}
              />
            ))}
          </div>
        ) : null}

        {selectedTemplate?.description ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {selectedTemplate.description}
          </p>
        ) : null}

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        <button
          type="button"
          onClick={() =>
            onCreate({
              contractType: contractType as AdminContractCreatePayload["contractType"],
              contactSubmissionId: mode === "inquiry" ? contactSubmissionId || null : null,
              fieldValues: initialCreateFieldValues,
            })
          }
          disabled={creating || !contractType || (mode === "inquiry" && !contactSubmissionId)}
          className="inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create draft"}
        </button>
      </div>
    </section>
  );
};

export default AdminContractCreatePanel;
