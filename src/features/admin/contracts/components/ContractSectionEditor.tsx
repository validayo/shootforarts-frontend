import React from "react";

import type { AdminContractSection } from "../../../../utils";

interface AdminContractSectionEditorProps {
  section: AdminContractSection;
  onChange: (nextSection: AdminContractSection) => void;
}

const AdminContractSectionEditor: React.FC<AdminContractSectionEditorProps> = ({ section, onChange }) => {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">{section.key}</p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            checked={section.included}
            onChange={(event) =>
              onChange({
                ...section,
                included: event.target.checked,
                editedManually: true,
              })
            }
          />
          Included
        </label>
      </div>

      <textarea
        className="mt-4 min-h-[180px] w-full resize-y rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
        value={section.bodyText}
        disabled={!section.included}
        onChange={(event) =>
          onChange({
            ...section,
            bodyText: event.target.value,
            editedManually: true,
          })
        }
      />
    </section>
  );
};

export default AdminContractSectionEditor;
