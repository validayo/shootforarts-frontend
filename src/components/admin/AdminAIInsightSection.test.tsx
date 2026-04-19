import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AdminAIInsightSection from "./AdminAIInsightSection";
import type { AdminAIInquiryDetailResponse } from "../../utils";

const buildDetail = (): AdminAIInquiryDetailResponse => ({
  ok: true,
  contactSubmissionId: "contact-1",
  rawSubmission: {
    id: "contact-1",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    service: "Grad Photoshoots",
    date: "2026-06-01",
  },
  activeAnalysis: {
    id: "analysis-1",
    contact_submission_id: "contact-1",
    status: "succeeded",
    review_state: "pending_review",
    summary: "Strong grad inquiry with a likely Tier 1 fit.",
    detected_service: "Grad Photoshoots",
    detected_service_tier: "Tier 1",
    requested_date_text: "2026-06-01",
    requested_time_text: "6:00 PM",
    requested_location_text: "Toronto",
    budget_signal: null,
    urgency_signal: null,
    recommended_action: "recommend_catalog",
    recommended_catalog_id: "catalog-1",
    confidence_score: 0.92,
    rationale_short: "Tier 1 fits the requested scope.",
    extracted_entities_json: {},
    source_snapshot_json: {},
    model_name: "gpt-5.4-mini",
    prompt_version: "phase1-analyze-v1",
    is_active: true,
    created_at: "2026-04-19T00:00:00.000Z",
    updated_at: "2026-04-19T00:00:00.000Z",
    recommendedCatalogItem: { id: "catalog-1", label: "Grad Photoshoots - Tier 1" },
  },
  draftVersions: [
    {
      id: "draft-2",
      contact_submission_id: "contact-1",
      analysis_id: "analysis-1",
      version_number: 2,
      source_type: "manual_edit",
      instruction_text: "Manual admin edit",
      tone: "warm-professional",
      subject_line: "Shoot For Arts Grad Session",
      body_text: "Hi Jane,\n\nThanks for reaching out about grad photos.",
      status: "edited",
      generated_by: "admin",
      approved_by: null,
      approved_at: null,
      sent_at: null,
      created_at: "2026-04-19T01:00:00.000Z",
    },
    {
      id: "draft-1",
      contact_submission_id: "contact-1",
      analysis_id: "analysis-1",
      version_number: 1,
      source_type: "initial",
      instruction_text: null,
      tone: "warm-professional",
      subject_line: "Initial Subject",
      body_text: "Initial body",
      status: "generated",
      generated_by: "ai",
      approved_by: null,
      approved_at: null,
      sent_at: null,
      created_at: "2026-04-19T00:30:00.000Z",
    },
  ],
  latestApprovedDraft: null,
  reviewActions: [
    {
      id: "action-1",
      contact_submission_id: "contact-1",
      draft_id: "draft-2",
      actor_user_id: "user-1",
      action_type: "edited",
      notes: null,
      metadata_json: {},
      created_at: "2026-04-19T01:00:00.000Z",
    },
  ],
  workflowStatus: null,
});

describe("AdminAIInsightSection", () => {
  it("renders draft actions and version history", () => {
    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={{ saving: false, approving: false, sending: false, error: null, success: null }}
      />
    );

    expect(screen.getByText("Draft Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve Draft" })).toBeInTheDocument();
    expect(screen.getByText("Version History")).toBeInTheDocument();
    expect(screen.getByText("Review Timeline")).toBeInTheDocument();
  });

  it("allows editing and saving a revised draft", async () => {
    const user = userEvent.setup();
    const onSaveEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={{ saving: false, approving: false, sending: false, error: null, success: null }}
        onSaveEdit={onSaveEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Draft" }));
    const bodyField = screen.getByLabelText("Body");
    await user.clear(bodyField);
    await user.type(bodyField, "Hi Jane,\n\nUpdated draft body.");
    await user.click(screen.getByRole("button", { name: "Save Edited Draft" }));

    expect(onSaveEdit).toHaveBeenCalledWith("contact-1", "draft-2", {
      subjectLine: "Shoot For Arts Grad Session",
      bodyText: "Hi Jane,\n\nUpdated draft body.",
    });
  });

  it("keeps edit mode open when saving fails", async () => {
    const user = userEvent.setup();
    const onSaveEdit = vi.fn().mockRejectedValue(new Error("save failed"));

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={{ saving: false, approving: false, sending: false, error: "Draft edit could not be saved.", success: null }}
        onSaveEdit={onSaveEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Draft" }));
    await user.click(screen.getByRole("button", { name: "Save Edited Draft" }));

    expect(onSaveEdit).toHaveBeenCalled();
    expect(screen.getByLabelText("Body")).toBeInTheDocument();
  });

  it("shows copy draft for approved or failed sends", () => {
    const detail = buildDetail();
    detail.draftVersions[0].status = "send_failed";

    render(
      <AdminAIInsightSection
        detail={detail}
        loading={false}
        error={null}
        actionState={{ saving: false, approving: false, sending: false, error: null, success: null }}
      />
    );

    expect(screen.getByRole("button", { name: "Copy Draft" })).toBeInTheDocument();
  });
});
