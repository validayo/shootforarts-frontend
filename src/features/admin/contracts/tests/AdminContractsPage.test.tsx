import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminContractsPage from "../../../../pages/admin/contracts/AdminContractsPage";

const getAdminContractsTemplateManifest = vi.fn();
const listAdminContracts = vi.fn();
const getAdminContractDetail = vi.fn();
const createAdminContract = vi.fn();
const deleteAdminContract = vi.fn();
const saveAdminContract = vi.fn();
const getContactSubmissions = vi.fn();

vi.mock("../../../../features/admin/shared/components/AdminShellLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../../lib/api/services", () => ({
  getAdminContractsTemplateManifest: (...args: unknown[]) => getAdminContractsTemplateManifest(...args),
  listAdminContracts: (...args: unknown[]) => listAdminContracts(...args),
  getAdminContractDetail: (...args: unknown[]) => getAdminContractDetail(...args),
  createAdminContract: (...args: unknown[]) => createAdminContract(...args),
  deleteAdminContract: (...args: unknown[]) => deleteAdminContract(...args),
  saveAdminContract: (...args: unknown[]) => saveAdminContract(...args),
  getContactSubmissions: (...args: unknown[]) => getContactSubmissions(...args),
}));

vi.mock("../../../../lib/observability/logger", () => ({
  logAdminAction: vi.fn(),
  logAdminError: vi.fn(),
}));

vi.mock("../../../../lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

describe("AdminContractsPage", () => {
  beforeEach(() => {
    getAdminContractsTemplateManifest.mockReset();
    listAdminContracts.mockReset();
    getAdminContractDetail.mockReset();
    createAdminContract.mockReset();
    deleteAdminContract.mockReset();
    saveAdminContract.mockReset();
    getContactSubmissions.mockReset();

    getAdminContractsTemplateManifest.mockResolvedValue({
      ok: true,
      templates: [
        {
          type: "portrait_branding",
          label: "Portrait / Branding",
          description: "Branding contracts",
          category: "portrait",
          fields: [
            {
              key: "clientName",
              label: "Client name",
              type: "text",
              required: true,
            },
          ],
          toggles: [
            {
              key: "includeWeatherClause",
              label: "Weather clause",
              defaultValue: true,
            },
          ],
          sectionOrder: ["terms", "signatures"],
        },
      ],
    });

    listAdminContracts.mockResolvedValue([
      {
        id: "contract-1",
        title: "Armi portrait contract",
        contractType: "portrait_branding",
        status: "draft",
        contactSubmissionId: "contact-1",
        clientName: "Armi De Francia",
        clientBusinessName: null,
        templateVersion: "v1",
        updatedAt: "2026-04-20T12:00:00.000Z",
        approvedAt: null,
      },
    ]);

    getContactSubmissions.mockResolvedValue([
      {
        id: "contact-1",
        firstName: "Armi",
        lastName: "De Francia",
        email: "armi@example.com",
        service: "Branding Shoot",
        date: "2026-03-05",
      },
    ]);

    getAdminContractDetail.mockResolvedValue({
      id: "contract-1",
      title: "Armi portrait contract",
      contractType: "portrait_branding",
      status: "draft",
      contactSubmissionId: "contact-1",
      templateKey: "portrait_branding",
      templateVersion: "v1",
      fieldValues: { clientName: "Armi De Francia" },
      toggleValues: { includeWeatherClause: true },
      sections: [
        {
          key: "terms",
          title: "Terms",
          included: true,
          bodyText: "Terms body",
          bodyHtml: "<p>Terms body</p>",
          editedManually: false,
        },
      ],
      renderedHtml: "<article><h1>Armi portrait contract</h1><p>Terms body</p></article>",
      sourceSnapshot: {},
      updatedAt: "2026-04-20T12:00:00.000Z",
      approvedAt: null,
    });
  });

  it("loads a selected draft from the contractId query param", async () => {
    render(
      <MemoryRouter initialEntries={["/sfaadmin/contracts?contractId=contract-1"]}>
        <AdminContractsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAdminContractsTemplateManifest).toHaveBeenCalled();
      expect(listAdminContracts).toHaveBeenCalled();
      expect(getAdminContractDetail).toHaveBeenCalledWith("contract-1");
    });

    expect(screen.getAllByText("Armi portrait contract").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Contract preview")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Photography Contract")).toBeInTheDocument();
      expect(screen.getByText(/This agreement is between the Client and the Photographer/i)).toBeInTheDocument();
    });
  });
});
