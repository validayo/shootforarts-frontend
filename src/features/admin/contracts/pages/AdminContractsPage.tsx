import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import AdminContractCreatePanel from "../components/ContractCreatePanel";
import AdminContractEditor from "../components/ContractEditor";
import AdminContractPreview from "../components/ContractPreview";
import AdminContractsList from "../components/ContractsList";
import AdminShellLayout from "../../shared/components/AdminShellLayout";
import { ROUTES } from "../../../../config/routes";
import {
  createAdminContract,
  deleteAdminContract,
  getAdminContractDetail,
  getAdminContractsTemplateManifest,
  getContactSubmissions,
  listAdminContracts,
  saveAdminContract,
} from "../../../../lib/api/services";
import { logAdminAction, logAdminError } from "../../../../lib/observability/logger";
import { supabase } from "../../../../lib/supabase";
import { buildContractDocumentHtml } from "../utils/contractsDocument";
import { downloadContractPdf } from "../utils/contractsPdf";
import type {
  AdminContractCreatePayload,
  AdminContractDetail,
  AdminContractListItem,
  AdminContractTemplateDefinition,
  Contact,
} from "../../../../utils";

type CreateMode = "manual" | "inquiry";

const AdminContractsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedContractId = searchParams.get("contractId");

  const [templates, setTemplates] = useState<AdminContractTemplateDefinition[]>([]);
  const [contracts, setContracts] = useState<AdminContractListItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [manifestLoading, setManifestLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [editingContract, setEditingContract] = useState<AdminContractDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("manual");
  const [createContractType, setCreateContractType] = useState("");
  const [createContactSubmissionId, setCreateContactSubmissionId] = useState("");
  const [createInitialFieldValues, setCreateInitialFieldValues] = useState<Record<string, unknown>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateSelectedContractId = (contractId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (contractId) {
      next.set("contractId", contractId);
    } else {
      next.delete("contractId");
    }
    setSearchParams(next, { replace: true });
  };

  const fetchContractsList = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const nextContracts = await listAdminContracts();
      setContracts(nextContracts);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load contracts.";
      setListError(message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setManifestLoading(true);
      setManifestError(null);
      setListError(null);
      setWorkspaceError(null);

      try {
        const [manifest, contractList, inquiryContacts] = await Promise.all([
          getAdminContractsTemplateManifest(),
          listAdminContracts(),
          getContactSubmissions(),
        ]);

        if (cancelled) return;

        setTemplates(manifest.templates);
        setContracts(contractList);
        setContacts(inquiryContacts);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not load contracts.";
        setManifestError(message);
        setListError(message);
        setWorkspaceError(message);
      } finally {
        if (!cancelled) {
          setManifestLoading(false);
          setListLoading(false);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedContractId) {
      if (!createOpen) {
        setEditingContract(null);
      }
      return;
    }

    if (editingContract?.id === selectedContractId) {
      setCreateOpen(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setWorkspaceError(null);
    setCreateOpen(false);
    setCreateError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setEditingContract(null);

    const loadDetail = async () => {
      try {
        const detail = await getAdminContractDetail(selectedContractId);
        if (cancelled) return;
        setEditingContract(detail);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not load contract draft.";
        setWorkspaceError(message);
        setEditingContract(null);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedContractId, createOpen, editingContract?.id]);

  const activeTemplate = editingContract
    ? templates.find((template) => template.type === editingContract.contractType) ?? null
    : createContractType
      ? templates.find((template) => template.type === createContractType) ?? null
      : null;
  const documentHtml = editingContract ? buildContractDocumentHtml(editingContract, activeTemplate) : "";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logAdminAction("auth.logout");
      window.location.href = ROUTES.admin.login;
    } catch (error) {
      logAdminError("auth.logout_failed", { message: String(error) });
    }
  };

  const handleOpenCreate = () => {
    setCreateOpen(true);
    setEditingContract(null);
    setCreateError(null);
    setSaveError(null);
    setSaveSuccess(null);
    updateSelectedContractId(null);
  };

  const handleCreate = async (payload: AdminContractCreatePayload) => {
    setCreating(true);
    setCreateError(null);
    setWorkspaceError(null);

    try {
      const detail = await createAdminContract(payload);
      setEditingContract(detail);
      setCreateOpen(false);
      setCreateInitialFieldValues({});
      setCreateContactSubmissionId("");
      setCreateMode("manual");
      setCreateContractType("");
      updateSelectedContractId(detail.id);
      await fetchContractsList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create contract draft.";
      setCreateError(message);
      logAdminError("contracts.create_failed", { message });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!editingContract) return;

    const confirmed = window.confirm(
      `Delete "${editingContract.title}"? This will archive the contract and remove it from the main list.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await deleteAdminContract(editingContract.id);

      setEditingContract(null);
      updateSelectedContractId(null);
      setCreateOpen(false);
      await fetchContractsList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete contract draft.";
      setSaveError(message);
      logAdminError("contracts.delete_failed", { message, contractId: editingContract.id });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!editingContract || !documentHtml) return;
    await downloadContractPdf(editingContract.title, documentHtml);
  };

  const handleSave = async () => {
    if (!editingContract) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const savedDetail = await saveAdminContract({
        contractId: editingContract.id,
        fieldValues: editingContract.fieldValues,
        toggleValues: editingContract.toggleValues,
        sections: editingContract.sections,
        status: editingContract.status,
      });
      setEditingContract(savedDetail);
      const refreshedDetail = await getAdminContractDetail(savedDetail.id);
      setEditingContract(refreshedDetail);
      setSaveSuccess("Contract draft saved.");
      await fetchContractsList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save contract draft.";
      setSaveError(message);
      logAdminError("contracts.save_failed", { message, contractId: editingContract.id });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShellLayout
      title="Contracts"
      subtitle="Create, edit, and review internal contract drafts before sending them manually."
      activeNav="contracts"
      onLogout={handleLogout}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminContractsList
            contracts={contracts}
            templates={templates}
            selectedContractId={selectedContractId}
            loading={listLoading}
            error={listError ?? manifestError}
            onOpen={(contractId) => {
              setCreateOpen(false);
              setSaveError(null);
              setSaveSuccess(null);
              updateSelectedContractId(contractId);
            }}
            onNewContract={handleOpenCreate}
          />
        </div>

        <div className="grid gap-6 min-[1700px]:grid-cols-[minmax(20rem,0.95fr)_minmax(30rem,1.15fr)] min-[1700px]:items-start">
          <div className="space-y-6">
            {manifestLoading ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-48 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-5/6 rounded bg-gray-100" />
                </div>
              </section>
            ) : createOpen ? (
              <AdminContractCreatePanel
                templates={templates}
                contacts={contacts}
                mode={createMode}
                contractType={createContractType}
                contactSubmissionId={createContactSubmissionId}
                initialFieldValues={createInitialFieldValues}
                creating={creating}
                error={createError}
                onModeChange={(mode) => {
                  setCreateMode(mode);
                  if (mode === "manual") {
                    setCreateContactSubmissionId("");
                  }
                }}
                onContractTypeChange={(contractType) => {
                  setCreateContractType(contractType);
                  setCreateInitialFieldValues({});
                }}
                onContactSubmissionIdChange={setCreateContactSubmissionId}
                onInitialFieldValueChange={(key, value) =>
                  setCreateInitialFieldValues((prev) => ({ ...prev, [key]: value }))
                }
                onCreate={handleCreate}
                onCancel={() => setCreateOpen(false)}
              />
            ) : editingContract ? (
              <AdminContractEditor
                contract={editingContract}
                template={activeTemplate}
                saving={saving}
                deleting={deleting}
                saveError={saveError}
                saveSuccess={saveSuccess}
                onFieldChange={(key, value) =>
                  setEditingContract((prev) =>
                    prev
                      ? {
                          ...prev,
                          fieldValues: { ...prev.fieldValues, [key]: value },
                        }
                      : prev,
                  )
                }
                onToggleChange={(key, value) =>
                  setEditingContract((prev) =>
                    prev
                      ? {
                          ...prev,
                          toggleValues: { ...prev.toggleValues, [key]: value },
                        }
                      : prev,
                  )
                }
                onSectionChange={(nextSection) =>
                  setEditingContract((prev) =>
                    prev
                      ? {
                          ...prev,
                          sections: prev.sections.map((section) =>
                            section.key === nextSection.key ? nextSection : section,
                          ),
                        }
                      : prev,
                  )
                }
                onStatusChange={(status) =>
                  setEditingContract((prev) => (prev ? { ...prev, status } : prev))
                }
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ) : workspaceError ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
                {workspaceError}
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">Open or create a contract draft</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Start from an inquiry or manual entry, then edit fields, toggles, and section source on one page.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-5 inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  New contract
                </button>
              </section>
            )}
          </div>

          <div className="md:mx-auto md:w-full md:max-w-[980px] min-[1700px]:mx-0 min-[1700px]:max-w-none min-[1700px]:sticky min-[1700px]:top-24">
            <AdminContractPreview
              renderedHtml={documentHtml}
              loading={detailLoading}
              onDownloadPdf={handleDownloadPdf}
            />
          </div>
        </div>
      </div>
    </AdminShellLayout>
  );
};

export default AdminContractsPage;
