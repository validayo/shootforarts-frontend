import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "./ContactForm";

const mocks = vi.hoisted(() => ({
  submitContact: vi.fn(),
  trackContactFormError: vi.fn(),
  trackContactFormStarted: vi.fn(),
  trackContactSubmit: vi.fn(),
  isHoneypotTriggered: vi.fn(() => false),
  isMinFillTimeReached: vi.fn(() => true),
  getCooldownRemainingMs: vi.fn(() => 0),
  markSubmissionNow: vi.fn(),
  cooldownSeconds: vi.fn((remainingMs: number) => Math.max(1, Math.ceil(remainingMs / 1000))),
}));

vi.mock("../../lib/api/services", () => ({
  submitContact: mocks.submitContact,
}));

vi.mock("../../lib/analytics/events", () => ({
  trackContactFormError: mocks.trackContactFormError,
  trackContactFormStarted: mocks.trackContactFormStarted,
  trackContactSubmit: mocks.trackContactSubmit,
}));

vi.mock("../../lib/security/formProtection", () => ({
  isHoneypotTriggered: mocks.isHoneypotTriggered,
  isMinFillTimeReached: mocks.isMinFillTimeReached,
  getCooldownRemainingMs: mocks.getCooldownRemainingMs,
  markSubmissionNow: mocks.markSubmissionNow,
  cooldownSeconds: mocks.cooldownSeconds,
}));

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("First Name"), "Ayo");
  await user.type(screen.getByPlaceholderText("Last Name"), "Client");
  await user.type(screen.getByPlaceholderText("example@example.com"), "client@example.com");
  await user.type(screen.getByPlaceholderText("(647) 123-4567"), "6471234567");
  const serviceSelect = document.querySelector("select[name='service']") as HTMLSelectElement;
  await user.selectOptions(serviceSelect, "Base Photoshoot");
  await waitFor(() => {
    expect(document.querySelector("select[name='service_tier']")).not.toBeNull();
  });
  const tierSelect = document.querySelector("select[name='service_tier']") as HTMLSelectElement;
  await user.selectOptions(tierSelect, "Tier 1 (Solo Shoot)");
  const occasionInput = document.querySelector("textarea[name='occasion']") as HTMLTextAreaElement;
  await user.type(occasionInput, "Portrait session with clean edits.");
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHoneypotTriggered.mockReturnValue(false);
    mocks.isMinFillTimeReached.mockReturnValue(true);
    mocks.getCooldownRemainingMs.mockReturnValue(0);
    mocks.cooldownSeconds.mockImplementation((remainingMs: number) => Math.max(1, Math.ceil(remainingMs / 1000)));
  });

  it("shows loading state and success message after submit", async () => {
    const user = userEvent.setup();

    let resolveSubmit: () => void = () => undefined;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mocks.submitContact.mockReturnValueOnce(submitPromise);

    render(
      <MemoryRouter>
        <ContactForm />
      </MemoryRouter>
    );

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();

    resolveSubmit();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Thank you!" })).toBeInTheDocument();
    });
    expect(mocks.submitContact).toHaveBeenCalledTimes(1);
    expect(mocks.trackContactSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows cooldown validation message and blocks submit", async () => {
    const user = userEvent.setup();
    mocks.getCooldownRemainingMs.mockReturnValueOnce(3200);

    render(
      <MemoryRouter>
        <ContactForm />
      </MemoryRouter>
    );

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait 4s before sending another request.");
    expect(mocks.submitContact).not.toHaveBeenCalled();
  });
});
