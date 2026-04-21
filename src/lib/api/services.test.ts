import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken } from "../auth/session";

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
  supabaseAnonKey: "anon-key",
}));

vi.mock("../auth/session", () => ({
  getAccessToken: vi.fn(),
}));

import {
  askAdminAssistant,
  uploadAdminAssistantAttachment,
  askAdminAIInquiryAssistant,
  approveAdminAIDraft,
  archiveAdminAIContextNote,
  BASE,
  createAdminContract,
  deleteAdminContract,
  getAdminContractDetail,
  getAdminContractsTemplateManifest,
  getAdminAIInbox,
  getAdminAIInquiry,
  getGallery,
  listAdminContracts,
  markAdminAIDraftSent,
  markAdminAILastSeen,
  rewriteAdminAIDraft,
  saveAdminContract,
  saveAdminAIContextNote,
  saveAdminAIDraftEdit,
  sendAdminAIApprovedDraft,
  submitContact,
  subscribe,
} from "./services";

const fetchMock = vi.fn();

const buildPayload = () => ({
  firstName: "Ayo",
  lastName: "Client",
  email: "client@example.com",
  phone: "6471234567",
  service: "Base Photoshoot",
  service_tier: "Tier 1 (Solo Shoot)",
  occasion: "Portraits",
  pinterestInspo: "",
  add_ons: [],
  date: "2026-02-25",
  time: "3:00 PM",
  instagram: "",
  location: "",
  referralSource: "Instagram",
  questions: "",
  extra_questions: {},
});

describe("api/services wrappers", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getAccessToken).mockResolvedValue("admin-token");
  });

  it("submits contact payload to edge function", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const payload = buildPayload();
    await submitContact(payload);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/contact-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  it("normalizes plain text response bodies into message objects", async () => {
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const result = await submitContact(buildPayload());
    expect(result).toEqual({ message: "ok" });
  });

  it("throws API text errors for non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad request", { status: 400 }));
    await expect(subscribe("client@example.com")).rejects.toThrow("bad request");
  });

  it("builds gallery query params from transforms and extra filters", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          photos: [{ id: "1", url: "https://img", category: "PORTRAITS" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const photos = await getGallery(
      "PORTRAITS",
      { width: 320, quality: 70, format: "webp" },
      { season: "summer", include_top: true, include_season: false, top_limit: 4 }
    );

    expect(photos).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0] ?? [];
    const parsed = new URL(String(url));

    expect(parsed.origin + parsed.pathname).toBe(`${BASE}/gallery`);
    expect(parsed.searchParams.get("category")).toBe("PORTRAITS");
    expect(parsed.searchParams.get("width")).toBe("320");
    expect(parsed.searchParams.get("quality")).toBe("70");
    expect(parsed.searchParams.get("format")).toBe("webp");
    expect(parsed.searchParams.get("season")).toBe("summer");
    expect(parsed.searchParams.get("include_top")).toBe("true");
    expect(parsed.searchParams.get("include_season")).toBe("false");
    expect(parsed.searchParams.get("top_limit")).toBe("4");
  });

  it("fetches admin AI inbox with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, items: [], nextCursor: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await getAdminAIInbox(25);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-inbox?limit=25`, {
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
    });
  });

  it("fetches admin AI inquiry detail with query params and protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          contactSubmissionId: "contact-1",
          rawSubmission: {},
          activeAnalysis: null,
          draftVersions: [],
          latestApprovedDraft: null,
          reviewActions: [],
          contextNotes: [],
          assistantThread: null,
          assistantMessages: [],
          workflowStatus: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await getAdminAIInquiry("contact-1");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-inquiry?contactSubmissionId=contact-1`, {
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
    });
  });

  it("posts admin AI last seen with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await markAdminAILastSeen("2026-04-19T00:00:00.000Z");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-mark-last-seen`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({ seenAt: "2026-04-19T00:00:00.000Z" }),
    });
  });

  it("posts a context note save with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, contextNoteId: "note-1", contactSubmissionId: "contact-1", status: "active" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await saveAdminAIContextNote("contact-1", "Client called with updated location details.");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-save-context-note`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({
        contactSubmissionId: "contact-1",
        note: "Client called with updated location details.",
      }),
    });
  });

  it("posts context note archive with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, contextNoteId: "note-1", status: "archived" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await archiveAdminAIContextNote("note-1");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-archive-context-note`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({ contextNoteId: "note-1" }),
    });
  });

  it("posts a manual admin draft edit", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, draftId: "draft-2", versionNumber: 2, status: "edited" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await saveAdminAIDraftEdit("contact-1", "draft-1", {
      subjectLine: "Updated subject",
      bodyText: "Updated draft body",
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-save-draft-edit`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({
        contactSubmissionId: "contact-1",
        draftId: "draft-1",
        subjectLine: "Updated subject",
        bodyText: "Updated draft body",
      }),
    });
  });

  it("posts draft approval with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, draftId: "draft-2", status: "approved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await approveAdminAIDraft("draft-2");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/ai-approve-draft`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({ draftId: "draft-2" }),
    });
  });

  it("posts rewrite/regenerate requests with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, draftId: "draft-3", versionNumber: 3, status: "generated", runId: "run-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await rewriteAdminAIDraft("contact-1", "draft-2", {
      mode: "rewrite",
      selectedContextNoteIds: ["note-1", "note-2"],
      instruction: "Shorten this and reference the updated location.",
      tone: "warm-professional",
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/ai-chat-edit-draft`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({
        contactSubmissionId: "contact-1",
        draftId: "draft-2",
        mode: "rewrite",
        selectedContextNoteIds: ["note-1", "note-2"],
        instruction: "Shorten this and reference the updated location.",
        tone: "warm-professional",
      }),
    });
  });

  it("posts assistant requests with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        threadId: "thread-1",
        requestMessageId: "message-1",
        responseMessageId: "message-2",
        taskType: "pricing_guidance",
        answer: "Lead with a custom quote direction.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await askAdminAIInquiryAssistant("contact-1", {
      taskType: "pricing_guidance",
      message: "What pricing direction makes sense here?",
      selectedContextNoteIds: ["note-1"],
      sourceDraftId: "draft-2",
      threadId: "thread-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/ai-inquiry-assistant`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({
        contactSubmissionId: "contact-1",
        taskType: "pricing_guidance",
        message: "What pricing direction makes sense here?",
        selectedContextNoteIds: ["note-1"],
        sourceDraftId: "draft-2",
        threadId: "thread-1",
      }),
    });
  });

  it("posts general assistant requests with bounded recent turns and optional inquiry reference", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        taskType: "location_ideas",
        answer: "Try a rooftop or lakeside direction with flexible golden-hour timing.",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await askAdminAssistant({
      taskType: "location_ideas",
      message: "What kinds of Toronto locations fit a creative portrait shoot?",
      recentTurns: [
        {
          role: "admin",
          content: "I want options that feel elevated but not overused.",
          taskType: "location_ideas",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
      ],
      inquiryReference: {
        contactSubmissionId: "contact-1",
      },
      attachmentIds: ["attachment-1", "attachment-2"],
      enableResearch: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-assistant`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({
        taskType: "location_ideas",
        message: "What kinds of Toronto locations fit a creative portrait shoot?",
        recentTurns: [
          {
            role: "admin",
            content: "I want options that feel elevated but not overused.",
          },
        ],
        attachments: [{ id: "attachment-1" }, { id: "attachment-2" }],
        enableResearch: true,
        inquiryReference: {
          contactSubmissionId: "contact-1",
        },
      }),
    });
  });

  it("surfaces structured backend errors for general assistant requests", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: "OpenAI structured output validation failure: General assistant model output has invalid source url protocol",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      askAdminAssistant({
        taskType: "location_ideas",
        message: "Need staircase locations",
      }),
    ).rejects.toThrow("OpenAI structured output validation failure: General assistant model output has invalid source url protocol");
  });

  it("fetches admin contracts template manifest with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        templates: [
          {
            contract_type: "portrait",
            label: "Portrait",
            description: "Portrait contract",
            section_order: ["terms", "signatures"],
            fields: [
              { key: "clientName", label: "Client name", type: "text", required: true },
              { key: "retainerPercent", label: "Retainer %", type: "number", ui_group: "advanced" },
            ],
            toggles: [{ key: "includeWeatherClause", label: "Weather clause", default_value: true }],
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const manifest = await getAdminContractsTemplateManifest();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-contracts-template-manifest`, {
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
    });
    expect(manifest.templates[0]).toMatchObject({
      type: "portrait",
      label: "Portrait",
      fields: [
        { key: "clientName", label: "Client name", type: "text", required: true },
        { key: "retainerPercent", label: "Retainer %", type: "number", uiGroup: "advanced" },
      ],
      toggles: [{ key: "includeWeatherClause", label: "Weather clause", defaultValue: true }],
    });
  });

  it("creates, fetches, lists, and saves admin contracts with normalized shapes", async () => {
    const detailPayload = {
      id: "contract-1",
      title: "Armi portrait contract",
      contract_type: "portrait_branding",
      status: "draft",
      contact_submission_id: "contact-1",
      template_key: "portrait_branding",
      template_version: "v1",
      field_values_json: { clientName: "Armi" },
      toggle_values_json: { includeWeatherClause: true },
      sections_json: [
        {
          key: "terms",
          title: "Terms",
          included: true,
          body_text: "Terms body",
          body_html: "<p>Terms body</p>",
          edited_manually: false,
        },
      ],
      rendered_html: "<article>Preview</article>",
      source_snapshot_json: { origin: "manual" },
      photographer_display_name: "Ayodeji Adigun",
      photographer_business_name: "Shoot For Arts",
      photographer_signature_name: "Ayodeji Adigun, Shoot For Arts",
      updated_at: "2026-04-20T12:00:00.000Z",
      approved_at: null,
    };

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          ok: true,
          contractId: "contract-1",
          status: "draft",
          contract: detailPayload,
          photographerDisplayName: "Ayodeji Adigun",
          photographerBusinessName: "Shoot For Arts",
          photographerSignatureName: "Ayodeji Adigun, Shoot For Arts",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, contract: detailPayload }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          ok: true,
          contracts: [
            {
              id: "contract-1",
              title: "Armi portrait contract",
              contract_type: "portrait_branding",
              status: "draft",
              contact_submission_id: "contact-1",
              client_name: "Armi De Francia",
              template_version: "v1",
              updated_at: "2026-04-20T12:00:00.000Z",
              approved_at: null,
            },
          ],
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, contract: detailPayload }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          ok: true,
          contractId: "contract-1",
          status: "archived",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const created = await createAdminContract({
      contractType: "portrait_branding",
      contactSubmissionId: "contact-1",
    });
    const fetched = await getAdminContractDetail("contract-1");
    const listed = await listAdminContracts();
    const saved = await saveAdminContract({
      contractId: "contract-1",
      fieldValues: { clientName: "Armi" },
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
      status: "draft",
    });
    const deleted = await deleteAdminContract("contract-1");

    expect(created.renderedHtml).toBe("<article>Preview</article>");
    expect(created.photographerDisplayName).toBe("Ayodeji Adigun");
    expect(fetched.sections[0]).toMatchObject({ key: "terms", bodyText: "Terms body" });
    expect(listed[0]).toMatchObject({ id: "contract-1", contractType: "portrait_branding", clientName: "Armi De Francia" });
    expect(saved.fieldValues).toEqual({ clientName: "Armi" });
    expect(saved.photographerBusinessName).toBe("Shoot For Arts");
    expect(saved.photographerSignatureName).toBe("Ayodeji Adigun, Shoot For Arts");
    expect(deleted).toEqual({ ok: true, contractId: "contract-1", status: "archived", reqId: undefined });
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${BASE}/admin-contracts-create`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        contractType: "portrait_branding",
        contactSubmissionId: "contact-1",
        fieldValues: {},
        toggleValues: {},
      }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${BASE}/admin-contracts-detail?contractId=contract-1`, expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(3, `${BASE}/admin-contracts-list`, expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(4, `${BASE}/admin-contracts-save`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        contractId: "contract-1",
        fieldValues: { clientName: "Armi" },
        toggleValues: { includeWeatherClause: true },
        sections: [
          {
            key: "terms",
            title: "Terms",
            included: true,
            bodyText: "Terms body",
            editedManually: false,
          },
        ],
        status: "draft",
      }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, `${BASE}/admin-contracts-delete`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        contractId: "contract-1",
      }),
    }));
  });

  it("uploads assistant attachments with form data and protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        attachment: {
          id: "attachment-1",
          kind: "image",
          bucket: "ai-assistant-attachments",
          path: "admin/attachment.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          width: null,
          height: null,
          expiresAt: "2026-04-20T12:00:00.000Z",
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const file = new File(["test"], "reference.png", { type: "image/png" });
    await uploadAdminAssistantAttachment(file, "contact-1");

    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] ?? [];
    const [url, options] = lastCall;
    expect(url).toBe(`${BASE}/admin-ai-assistant-upload-attachment`);
    expect(options?.method).toBe("POST");
    expect(options?.headers).toEqual({
      Authorization: "Bearer admin-token",
      apikey: "anon-key",
    });
    expect(options?.body).toBeInstanceOf(FormData);
    const formData = options?.body as FormData;
    expect(formData.get("contactSubmissionId")).toBe("contact-1");
    const uploadedFile = formData.get("file");
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe(file.name);
    expect((uploadedFile as File).type).toBe(file.type);
  });

  it("posts approved draft sending with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, draftId: "draft-2", status: "sent", sentAt: "2026-04-19T00:00:00.000Z", toEmail: "client@example.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await sendAdminAIApprovedDraft("draft-2");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/ai-send-approved-draft`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({ draftId: "draft-2" }),
    });
  });

  it("posts manual sent confirmation with protected headers", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, draftId: "draft-2", status: "sent", sentAt: "2026-04-19T00:00:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await markAdminAIDraftSent("draft-2");

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/admin-ai-mark-draft-sent`, {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
        apikey: "anon-key",
      },
      body: JSON.stringify({ draftId: "draft-2" }),
    });
  });
});
