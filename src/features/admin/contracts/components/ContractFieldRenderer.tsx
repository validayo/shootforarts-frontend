import React from "react";

import type { AdminContractFieldDefinition } from "../../../../utils";

interface AdminContractFieldRendererProps {
  field: AdminContractFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

const inputBaseClasses =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

const parseNumericInputValue = (value: string) => {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isNaN(parsed) ? "" : parsed;
};

const AdminContractFieldRenderer: React.FC<AdminContractFieldRendererProps> = ({ field, value, onChange }) => {
  const fieldId = `contract-field-${field.key}`;
  const stringValue = typeof value === "string" ? value : value == null ? "" : String(value);
  const showUnsupportedType =
    Boolean(field.rawType) &&
    field.type === "text";

  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-sm font-medium text-gray-900">
        {field.label}
        {field.required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {field.helpText ? <p className="mt-1 text-xs text-gray-500">{field.helpText}</p> : null}

      {showUnsupportedType ? (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Unsupported field type: <span className="font-medium">{field.rawType}</span>
        </div>
      ) : field.type === "textarea" ? (
        <textarea
          id={fieldId}
          className={`${inputBaseClasses} min-h-[112px] resize-y`}
          placeholder={field.placeholder}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "boolean" ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            id={fieldId}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="text-sm text-gray-700">{field.label}</span>
        </div>
      ) : field.type === "select" ? (
        <select
          id={fieldId}
          className={inputBaseClasses}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "multiselect" ? (
        <select
          id={fieldId}
          multiple
          className={`${inputBaseClasses} min-h-[128px]`}
          value={Array.isArray(value) ? value.map((item) => String(item)) : []}
          onChange={(event) =>
            onChange(
              Array.from(event.target.selectedOptions).map((option) => option.value),
            )
          }
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "list" ? (
        <>
          <textarea
            id={fieldId}
            className={`${inputBaseClasses} min-h-[112px] resize-y`}
            placeholder={field.placeholder ?? "One item per line"}
            value={Array.isArray(value) ? value.map((item) => String(item)).join("\n") : stringValue}
            onChange={(event) =>
              onChange(
                event.target.value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
          <p className="mt-1 text-xs text-gray-500">One item per line.</p>
        </>
      ) : (
        <input
          id={fieldId}
          type={field.type === "number" || field.type === "currency" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "datetime" ? "datetime-local" : "text"}
          step={field.type === "currency" ? "0.01" : field.type === "number" ? "1" : undefined}
          className={inputBaseClasses}
          placeholder={field.placeholder}
          value={stringValue}
          onChange={(event) =>
            onChange(
              field.type === "number" || field.type === "currency"
                ? parseNumericInputValue(event.target.value)
                : event.target.value,
            )
          }
        />
      )}
    </label>
  );
};

export default AdminContractFieldRenderer;
