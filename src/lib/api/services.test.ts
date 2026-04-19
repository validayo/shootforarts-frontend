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
  approveAdminAIDraft,
  BASE,
  getAdminAIInbox,
  getAdminAIInquiry,
  getGallery,
  markAdminAIDraftSent,
  markAdminAILastSeen,
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
