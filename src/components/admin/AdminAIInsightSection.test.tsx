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
  contextNotes: [
    {
      id: "note-1",
      contact_submission_id: "contact-1",
      actor_user_id: "user-1",
      note_text: "Client called and confirmed the downtown Toronto location.",
      status: "active",
      metadata_json: {},
      created_at: "2026-04-19T01:10:00.000Z",
      updated_at: "2026-04-19T01:10:00.000Z",
    },
    {
      id: "note-2",
      contact_submission_id: "contact-1",
      actor_user_id: "user-1",
      note_text: "Older concept note that is no longer relevant.",
      status: "archived",
      metadata_json: {},
      created_at: "2026-04-19T01:05:00.000Z",
      updated_at: "2026-04-19T01:15:00.000Z",
    },
  ],
  assistantThread: {
    id: "thread-1",
    contact_submission_id: "contact-1",
    status: "active",
    created_by_user_id: "user-1",
    metadata_json: {},
    created_at: "2026-04-19T01:20:00.000Z",
    updated_at: "2026-04-19T01:25:00.000Z",
  },
  assistantMessages: [
    {
      id: "assistant-msg-1",
      thread_id: "thread-1",
      contact_submission_id: "contact-1",
      actor_type: "admin",
      task_type: "suggested_reply_help",
      message_text: "What should I say next to this client?",
      selected_context_note_ids: ["note-1"],
      source_draft_id: "draft-2",
      response_to_message_id: null,
      run_id: null,
      metadata_json: {},
      created_by_user_id: "user-1",
      created_at: "2026-04-19T01:20:00.000Z",
    },
    {
      id: "assistant-msg-2",
      thread_id: "thread-1",
      contact_submission_id: "contact-1",
      actor_type: "assistant",
      task_type: "suggested_reply_help",
      message_text: "Lead with a warm confirmation and ask one concrete follow-up question.",
      selected_context_note_ids: ["note-1"],
      source_draft_id: "draft-2",
      response_to_message_id: "assistant-msg-1",
      run_id: "run-1",
      metadata_json: {},
      created_by_user_id: null,
      created_at: "2026-04-19T01:20:05.000Z",
    },
  ],
  workflowStatus: null,
});

const defaultActionState = {
  saving: false,
  approving: false,
  sending: false,
  savingContext: false,
  archivingContext: false,
  rewriting: false,
  assistantAsking: false,
  error: null,
  success: null,
} as const;

describe("AdminAIInsightSection", () => {
  it("renders draft actions and version history", () => {
    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
      />
    );

    expect(screen.getByText("Draft Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /context & rewrite/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assistant/i })).toBeInTheDocument();
    expect(screen.queryByText("Version History")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Timeline")).not.toBeInTheDocument();
  });

  it("shows history only after opening the history section", async () => {
    const user = userEvent.setup();

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
      />
    );

    await user.click(screen.getByRole("button", { name: /show history/i }));

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
        actionState={defaultActionState}
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
        actionState={{ ...defaultActionState, error: "Draft edit could not be saved." }}
        onSaveEdit={onSaveEdit}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Draft" }));
    const bodyField = screen.getByLabelText("Body");
    await user.clear(bodyField);
    await user.type(bodyField, "Hi Jane,\n\nThis save should fail.");
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
        actionState={defaultActionState}
      />
    );

    expect(screen.getByRole("button", { name: "Copy Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as Sent" })).toBeInTheDocument();
  });

  it("allows adding a context note", async () => {
    const user = userEvent.setup();
    const onSaveContextNote = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
        onSaveContextNote={onSaveContextNote}
      />
    );

    await user.click(screen.getByRole("button", { name: /context & rewrite/i }));
    await user.type(screen.getByLabelText("Add Internal Context Note"), "Client confirmed a sunrise start time.");
    await user.click(screen.getByRole("button", { name: "Save Context Note" }));

    expect(onSaveContextNote).toHaveBeenCalledWith("Client confirmed a sunrise start time.");
  });

  it("allows selecting notes and rewriting only when instruction exists", async () => {
    const user = userEvent.setup();
    const onRewriteDraft = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
        onRewriteDraft={onRewriteDraft}
      />
    );

    await user.click(screen.getByRole("button", { name: /context & rewrite/i }));
    const rewriteButton = screen.getByRole("button", { name: "Rewrite Draft" });
    const regenerateButton = screen.getByRole("button", { name: "Regenerate Draft" });

    expect(rewriteButton).toBeDisabled();
    expect(regenerateButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(rewriteButton).toBeDisabled();
    expect(regenerateButton).toBeEnabled();

    await user.type(screen.getByLabelText("Rewrite Instruction"), "Make this shorter and reference the updated location.");
    expect(rewriteButton).toBeEnabled();

    await user.click(rewriteButton);

    expect(onRewriteDraft).toHaveBeenCalledWith("draft-2", {
      mode: "rewrite",
      selectedContextNoteIds: ["note-1"],
      instruction: "Make this shorter and reference the updated location.",
      tone: null,
    });
  });

  it("calls archive handler for active notes", async () => {
    const user = userEvent.setup();
    const onArchiveContextNote = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
        onArchiveContextNote={onArchiveContextNote}
      />
    );

    await user.click(screen.getByRole("button", { name: /context & rewrite/i }));
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(onArchiveContextNote).toHaveBeenCalledWith("note-1");
  });

  it("keeps the assistant panel collapsed by default and reveals prior messages when opened", async () => {
    const user = userEvent.setup();

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
      />
    );

    expect(screen.queryByText("Recent Assistant Thread")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /assistant/i }));

    expect(screen.getByText("Recent Assistant Thread")).toBeInTheDocument();
    expect(screen.getByText("Lead with a warm confirmation and ask one concrete follow-up question.")).toBeInTheDocument();
  });

  it("allows preset-assisted assistant questions and submits selected context notes", async () => {
    const user = userEvent.setup();
    const onAskAssistant = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={defaultActionState}
        onAskAssistant={onAskAssistant}
      />
    );

    await user.click(screen.getByRole("button", { name: /context & rewrite/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /assistant/i }));
    await user.click(screen.getByRole("button", { name: "Pricing Guidance" }));

    const questionField = screen.getByLabelText("Question");
    await user.clear(questionField);
    await user.type(questionField, "What pricing direction makes sense after the location update?");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    expect(onAskAssistant).toHaveBeenCalledWith({
      taskType: "pricing_guidance",
      message: "What pricing direction makes sense after the location update?",
      selectedContextNoteIds: ["note-1"],
      sourceDraftId: "draft-2",
      threadId: "thread-1",
    });
  });

  it("keeps the assistant question in place when the request fails", async () => {
    const user = userEvent.setup();
    const onAskAssistant = vi.fn().mockRejectedValue(new Error("assistant failed"));

    render(
      <AdminAIInsightSection
        detail={buildDetail()}
        loading={false}
        error={null}
        actionState={{ ...defaultActionState, error: "Assistant response could not be generated." }}
        onAskAssistant={onAskAssistant}
      />
    );

    await user.click(screen.getByRole("button", { name: /assistant/i }));
    const questionField = screen.getByLabelText("Question");
    await user.type(questionField, "What should I ask next?");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    expect(onAskAssistant).toHaveBeenCalled();
    expect(screen.getByLabelText("Question")).toHaveValue("What should I ask next?");
  });
});
