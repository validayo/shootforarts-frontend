import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminAssistant from "./AdminAssistant";

const getContactSubmissions = vi.fn();
const askAdminAssistant = vi.fn();
const uploadAdminAssistantAttachment = vi.fn();
const createObjectURL = vi.fn(() => "blob:preview");
const revokeObjectURL = vi.fn();

vi.mock("../../lib/api/services", () => ({
  getContactSubmissions: (...args: unknown[]) => getContactSubmissions(...args),
  askAdminAssistant: (...args: unknown[]) => askAdminAssistant(...args),
  uploadAdminAssistantAttachment: (...args: unknown[]) => uploadAdminAssistantAttachment(...args),
}));

vi.mock("../../lib/observability/logger", () => ({
  logAdminAction: vi.fn(),
  logAdminError: vi.fn(),
  logAdminWarning: vi.fn(),
}));

describe("AdminAssistant", () => {
  beforeEach(() => {
    getContactSubmissions.mockReset();
    askAdminAssistant.mockReset();
    uploadAdminAssistantAttachment.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: revokeObjectURL,
    });
    window.localStorage.clear();
    getContactSubmissions.mockResolvedValue([
      {
        id: "contact-1",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        service: "Creative Photoshoot",
        date: "2026-06-01",
        created_at: "2026-04-19T00:00:00.000Z",
      },
    ]);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders preset chips and empty-state guidance", async () => {
    render(<AdminAssistant />);

    expect(screen.getByText("Internal guidance only. Does not send, quote, or create drafts automatically.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pricing Help" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Location Ideas" })).toBeInTheDocument();
    expect(screen.getByText("Start a new advisory chat")).toBeInTheDocument();

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });
  });

  it("shows the research toggle only for scouting-oriented task types", async () => {
    const user = userEvent.setup();
    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    expect(screen.queryByLabelText("Use research for scouting")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Location Ideas" }));
    expect(screen.getByLabelText("Use research for scouting")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pricing Help" }));
    expect(screen.queryByLabelText("Use research for scouting")).not.toBeInTheDocument();
  });

  it("uploads images and submits a researched scouting request", async () => {
    const user = userEvent.setup();
    uploadAdminAssistantAttachment.mockResolvedValue({
      ok: true,
      attachment: {
        id: "attachment-1",
        kind: "image",
        bucket: "ai-assistant-attachments",
        path: "admin/reference.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        width: null,
        height: null,
        expiresAt: "2026-04-20T12:00:00.000Z",
      },
    });
    askAdminAssistant.mockResolvedValue({
      ok: true,
      taskType: "location_ideas",
      answer: "Try elevated courts and hilltop lookouts with city edge lines.",
      imageObservations: ["The reference image leans urban, enclosed, and cinematic."],
      locationSuggestions: [
        {
          label: "Hilltop courts near Scarborough bluffs-adjacent parks",
          area: "Scarborough",
          whyFit: "The fencing and elevation echo the enclosed movie-court vibe.",
          bestUseWindow: "Blue hour",
          bestShootWindows: ["Blue hour", "Early weekday morning"],
          locationFeatures: ["Fenced court lines", "Elevated skyline edge"],
          permitLikelihood: "unclear",
          permitBasis: "City guidance is mixed here, so confirm before a longer setup or visible lighting gear.",
          permitSourceRef: "source-2",
          quickShootPracticality: "possible_with_care",
          accessCautions: ["Transit access is easier than parking here."],
          frictionNotes: ["Security may care if lighting stands come out."],
          cautions: ["Scout for access restrictions before the shoot."],
          sourceRefs: ["source-1"],
          sourceUrls: ["https://example.com/scarborough-courts"],
        },
      ],
      sources: [
        {
          id: "source-1",
          title: "Scarborough courts roundup",
          url: "https://example.com/scarborough-courts",
          domain: "example.com",
          sourceType: "location_roundup",
          whyRelevant: "Lists enclosed outdoor courts around Scarborough.",
        },
        {
          id: "source-2",
          title: "Toronto permit guidance",
          url: "https://example.com/toronto-permits",
          domain: "example.com",
          sourceType: "official_site",
          whyRelevant: "Explains permit expectations for organized city shoots.",
        },
      ],
      suggestedNextSteps: ["Shortlist 2-3 options and scout them at the target time of day."],
    });

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    await user.selectOptions(screen.getByLabelText("Link inquiry"), "contact-1");
    await user.click(screen.getByRole("button", { name: "Location Ideas" }));
    await user.click(screen.getByLabelText("Use research for scouting"));

    const file = new File(["image"], "reference.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Attach images"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadAdminAssistantAttachment).toHaveBeenCalledWith(file, "contact-1");
    });

    const promptField = screen.getByLabelText("Prompt");
    await user.clear(promptField);
    await user.type(promptField, "Find Toronto spots that match this court vibe.");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    await waitFor(() => {
      expect(askAdminAssistant).toHaveBeenCalledWith({
        taskType: "location_ideas",
        message: "Find Toronto spots that match this court vibe.",
        recentTurns: [],
        inquiryReference: {
          contactSubmissionId: "contact-1",
        },
        attachmentIds: ["attachment-1"],
        enableResearch: true,
      });
    });

    expect(screen.getByText("Image observations")).toBeInTheDocument();
    expect(screen.getByText("Location suggestions")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Possible with care")).toBeInTheDocument();
    expect(screen.getByText("Permit unclear")).toBeInTheDocument();
    expect(screen.getByText("City guidance is mixed here, so confirm before a longer setup or visible lighting gear.")).toBeInTheDocument();
    expect(screen.getByText("Permit source: Toronto permit guidance")).toBeInTheDocument();
    expect(screen.getByText("Blue hour")).toBeInTheDocument();
    expect(screen.getByText("Early weekday morning")).toBeInTheDocument();
    expect(screen.getByText("Fenced court lines")).toBeInTheDocument();
    expect(screen.getByText("Transit access is easier than parking here.")).toBeInTheDocument();
    expect(screen.getByText("Security may care if lighting stands come out.")).toBeInTheDocument();
    expect(screen.getAllByText("Scarborough courts roundup")).toHaveLength(2);
  });

  it("uploads pasted images from the prompt", async () => {
    uploadAdminAssistantAttachment.mockResolvedValue({
      ok: true,
      attachment: {
        id: "attachment-1",
        kind: "image",
        bucket: "ai-assistant-attachments",
        path: "admin/pasted.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        width: null,
        height: null,
        expiresAt: "2026-04-20T12:00:00.000Z",
      },
    });

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    const file = new File(["image"], "pasted.png", { type: "image/png" });
    fireEvent.paste(screen.getByLabelText("Prompt"), {
      clipboardData: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(uploadAdminAssistantAttachment).toHaveBeenCalledWith(file, null);
    });

    expect(screen.getByText("pasted.png")).toBeInTheDocument();
  });

  it("uploads dropped images into the composer area", async () => {
    uploadAdminAssistantAttachment.mockResolvedValue({
      ok: true,
      attachment: {
        id: "attachment-1",
        kind: "image",
        bucket: "ai-assistant-attachments",
        path: "admin/dropped.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        width: null,
        height: null,
        expiresAt: "2026-04-20T12:00:00.000Z",
      },
    });

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    const file = new File(["image"], "dropped.png", { type: "image/png" });
    const prompt = screen.getByLabelText("Prompt");
    const dropContainer = prompt.closest(".border-t");
    expect(dropContainer).not.toBeNull();

    fireEvent.dragOver(dropContainer as Element, {
      dataTransfer: {
        files: [file],
      },
    });
    fireEvent.drop(dropContainer as Element, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(uploadAdminAssistantAttachment).toHaveBeenCalledWith(file, null);
    });

    expect(screen.getByText("dropped.png")).toBeInTheDocument();
  });

  it("caps recent turns at four when attachments or research are enabled", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "sfa_admin_general_assistant_session_v1:general",
      JSON.stringify([
        { role: "admin", content: "turn 1", taskType: "general_internal_support", createdAt: "2026-04-20T00:00:00.000Z" },
        { role: "assistant", content: "turn 2", taskType: "general_internal_support", createdAt: "2026-04-20T00:01:00.000Z" },
        { role: "admin", content: "turn 3", taskType: "general_internal_support", createdAt: "2026-04-20T00:02:00.000Z" },
        { role: "assistant", content: "turn 4", taskType: "general_internal_support", createdAt: "2026-04-20T00:03:00.000Z" },
        { role: "admin", content: "turn 5", taskType: "general_internal_support", createdAt: "2026-04-20T00:04:00.000Z" },
        { role: "assistant", content: "turn 6", taskType: "general_internal_support", createdAt: "2026-04-20T00:05:00.000Z" },
      ]),
    );

    uploadAdminAssistantAttachment.mockResolvedValue({
      ok: true,
      attachment: {
        id: "attachment-1",
        kind: "image",
        bucket: "ai-assistant-attachments",
        path: "admin/reference.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        width: null,
        height: null,
        expiresAt: "2026-04-20T12:00:00.000Z",
      },
    });
    askAdminAssistant.mockResolvedValue({
      ok: true,
      taskType: "location_ideas",
      answer: "Scoped response",
    });

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "Location Ideas" }));
    await user.click(screen.getByLabelText("Use research for scouting"));

    const file = new File(["image"], "reference.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Attach images"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadAdminAssistantAttachment).toHaveBeenCalled();
    });

    await user.clear(screen.getByLabelText("Prompt"));
    await user.type(screen.getByLabelText("Prompt"), "Need scoped follow-up");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    await waitFor(() => {
      expect(askAdminAssistant).toHaveBeenCalled();
    });

    const payload = askAdminAssistant.mock.calls[0]?.[0];
    expect(payload.recentTurns).toHaveLength(4);
    expect(payload.recentTurns.map((turn: { content: string }) => turn.content)).toEqual([
      "turn 3",
      "turn 4",
      "turn 5",
      "turn 6",
    ]);
  });

  it("trims normal recent turns further by character budget while preserving newest context", async () => {
    const user = userEvent.setup();
    const longTurn = "a".repeat(2500);
    window.localStorage.setItem(
      "sfa_admin_general_assistant_session_v1:general",
      JSON.stringify([
        { role: "admin", content: "old short", taskType: "general_internal_support", createdAt: "2026-04-20T00:00:00.000Z" },
        { role: "assistant", content: longTurn, taskType: "general_internal_support", createdAt: "2026-04-20T00:01:00.000Z" },
        { role: "admin", content: longTurn, taskType: "general_internal_support", createdAt: "2026-04-20T00:02:00.000Z" },
        { role: "assistant", content: longTurn, taskType: "general_internal_support", createdAt: "2026-04-20T00:03:00.000Z" },
      ]),
    );

    askAdminAssistant.mockResolvedValue({
      ok: true,
      taskType: "general_internal_support",
      answer: "Scoped response",
    });

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    await user.clear(screen.getByLabelText("Prompt"));
    await user.type(screen.getByLabelText("Prompt"), "Need a tighter context window");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    await waitFor(() => {
      expect(askAdminAssistant).toHaveBeenCalled();
    });

    const payload = askAdminAssistant.mock.calls[0]?.[0];
    expect(payload.recentTurns.map((turn: { content: string }) => turn.content)).toEqual([
      longTurn,
      longTurn,
    ]);
  });

  it("trims research recent turns by the stricter character budget while keeping the newest turn", async () => {
    const user = userEvent.setup();
    const veryLongTurn = "b".repeat(2100);
    window.localStorage.setItem(
      "sfa_admin_general_assistant_session_v1:general",
      JSON.stringify([
        { role: "admin", content: "older short", taskType: "general_internal_support", createdAt: "2026-04-20T00:00:00.000Z" },
        { role: "assistant", content: veryLongTurn, taskType: "general_internal_support", createdAt: "2026-04-20T00:01:00.000Z" },
        { role: "admin", content: veryLongTurn, taskType: "general_internal_support", createdAt: "2026-04-20T00:02:00.000Z" },
        { role: "assistant", content: veryLongTurn, taskType: "general_internal_support", createdAt: "2026-04-20T00:03:00.000Z" },
      ]),
    );

    askAdminAssistant.mockResolvedValue({
      ok: true,
      taskType: "location_ideas",
      answer: "Scoped response",
    });

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "Location Ideas" }));
    await user.click(screen.getByLabelText("Use research for scouting"));
    await user.clear(screen.getByLabelText("Prompt"));
    await user.type(screen.getByLabelText("Prompt"), "Need scoped research follow-up");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    await waitFor(() => {
      expect(askAdminAssistant).toHaveBeenCalled();
    });

    const payload = askAdminAssistant.mock.calls[0]?.[0];
    expect(payload.recentTurns.map((turn: { content: string }) => turn.content)).toEqual([
      veryLongTurn,
    ]);
  });

  it("shows the backend failure reason when assistant generation fails", async () => {
    const user = userEvent.setup();
    askAdminAssistant.mockRejectedValue(
      new Error("OpenAI structured output validation failure: General assistant model output has invalid source url protocol"),
    );

    render(<AdminAssistant />);

    await waitFor(() => {
      expect(getContactSubmissions).toHaveBeenCalled();
    });

    await user.clear(screen.getByLabelText("Prompt"));
    await user.type(screen.getByLabelText("Prompt"), "Need staircase locations");
    await user.click(screen.getByRole("button", { name: "Ask Assistant" }));

    await waitFor(() => {
      expect(screen.getByText("OpenAI structured output validation failure: General assistant model output has invalid source url protocol")).toBeInTheDocument();
    });
  });
});
