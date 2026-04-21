import React from "react";

import type {
  AdminContractDetail,
  AdminContractFieldDefinition,
  AdminContractSection,
  AdminContractStatus,
  AdminContractTemplateDefinition,
} from "../../../../utils";
import AdminContractFieldRenderer from "./ContractFieldRenderer";
import AdminContractSectionEditor from "./ContractSectionEditor";

interface AdminContractEditorProps {
  contract: AdminContractDetail;
  template: AdminContractTemplateDefinition | null;
  saving: boolean;
  deleting?: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  onFieldChange: (key: string, value: unknown) => void;
  onToggleChange: (key: string, value: boolean) => void;
  onSectionChange: (nextSection: AdminContractSection) => void;
  onStatusChange: (status: AdminContractStatus) => void;
  onSave: () => void;
  onDelete?: () => void;
}

const STATUS_OPTIONS: AdminContractStatus[] = ["draft", "review_ready", "approved", "archived"];
const HIDDEN_FIELD_KEYS = new Set([
  "brandName",
  "clientSignatureName",
  "deliveryWindowDaysMax",
  "deliveryWindowDaysMin",
  "signingDate",
  "photographerSignatureName",
  "specialNotes",
]);

const ADVANCED_FIELD_KEYS = new Set([
  "additionalPhotographerAvailable",
  "additionalPhotographerRate",
  "currency",
  "estimatedCoverageHours",
  "priorityMoments",
  "priorityPeople",
  "requiresAccessCredentials",
  "retainerPercent",
  "simultaneousCoverageIncluded",
]);

const isAdvancedField = (field: AdminContractFieldDefinition): boolean => {
  return field.uiGroup === "advanced" || ADVANCED_FIELD_KEYS.has(field.key) || /(Hours|Minutes|Rounds)$/.test(field.key);
};

const shouldRenderField = (
  field: AdminContractFieldDefinition,
  fieldValues: Record<string, unknown>,
  toggleValues: Record<string, boolean>,
): boolean => {
  if (!field.visibleWhen) return true;

  if (field.visibleWhen.toggle && !toggleValues[field.visibleWhen.toggle]) {
    return false;
  }

  if (field.visibleWhen.fieldEquals) {
    return fieldValues[field.visibleWhen.fieldEquals.key] === field.visibleWhen.fieldEquals.value;
  }

  return true;
};

const AdminContractEditor: React.FC<AdminContractEditorProps> = ({
  contract,
  template,
  saving,
  deleting = false,
  saveError,
  saveSuccess,
  onFieldChange,
  onToggleChange,
  onSectionChange,
  onStatusChange,
  onSave,
  onDelete,
}) => {
  const fields = (template?.fields ?? []).filter((field) =>
    !HIDDEN_FIELD_KEYS.has(field.key) &&
    shouldRenderField(field, contract.fieldValues, contract.toggleValues),
  );
  const primaryFields = fields.filter((field) => !isAdvancedField(field));
  const advancedFields = fields.filter((field) => isAdvancedField(field));
  const toggles = template?.toggles ?? [];
  const editableSections = contract.sections.filter((section) => section.key.toLowerCase() !== "signatures");

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{contract.title}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {template?.label ?? contract.contractType.replace(/_/g, " ")} · Template version {contract.templateVersion}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end lg:w-auto">
            <label className="block w-full sm:min-w-[11rem] lg:w-auto">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Status</span>
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                value={contract.status}
                onChange={(event) => onStatusChange(event.target.value as AdminContractStatus)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving || deleting}
                className="inline-flex w-full justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {deleting ? "Deleting..." : "Delete contract"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || deleting}
              className="inline-flex w-full justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
          </div>
        </div>
        {saveError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div> : null}
        {saveSuccess ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saveSuccess}</div> : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Fields</h4>
        {primaryFields.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {primaryFields.map((field) => (
              <AdminContractFieldRenderer
                key={field.key}
                field={field}
                value={contract.fieldValues[field.key]}
                onChange={(value) => onFieldChange(field.key, value)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            No editable field definitions were provided for this contract type.
          </div>
        )}

        {advancedFields.length > 0 ? (
          <details className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-gray-900">
              Advanced template defaults
              <span className="ml-2 text-xs font-normal text-gray-500">
                Timing and internal defaults that usually stay unchanged
              </span>
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {advancedFields.map((field) => (
                <AdminContractFieldRenderer
                  key={field.key}
                  field={field}
                  value={contract.fieldValues[field.key]}
                  onChange={(value) => onFieldChange(field.key, value)}
                />
              ))}
            </div>
          </details>
        ) : null}

      </section>

      {toggles.length > 0 ? (
        <details className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
            Clause Toggles
            <span className="ml-2 text-xs normal-case tracking-normal text-gray-500">
              Optional clauses that usually stay unchanged
            </span>
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {toggles.map((toggle) => (
              <label
                key={toggle.key}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                  checked={(contract.toggleValues[toggle.key] ?? toggle.defaultValue) === true}
                  onChange={(event) => onToggleChange(toggle.key, event.target.checked)}
                />
                <span>
                  <span className="font-medium text-gray-900">{toggle.label}</span>
                  {toggle.helpText ? <span className="mt-1 block text-xs text-gray-500">{toggle.helpText}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </details>
      ) : null}

      <details className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
          Manual Edit Sections
          <span className="ml-2 text-xs normal-case tracking-normal text-gray-500">
            Direct section text overrides when you need finer control
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          {editableSections.map((section) => (
            <AdminContractSectionEditor key={section.key} section={section} onChange={onSectionChange} />
          ))}
        </div>
      </details>
    </div>
  );
};

export default AdminContractEditor;
