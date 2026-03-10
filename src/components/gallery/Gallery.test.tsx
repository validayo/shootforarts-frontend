import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Photo } from "../../utils";
import Gallery from "./Gallery";

const mocks = vi.hoisted(() => ({
  getGallery: vi.fn(),
  trackGalleryView: vi.fn(),
  trackGalleryLightboxOpen: vi.fn(),
}));

vi.mock("../../lib/api/services", () => ({
  getGallery: mocks.getGallery,
}));

vi.mock("../../lib/analytics/events", () => ({
  trackGalleryView: mocks.trackGalleryView,
  trackGalleryLightboxOpen: mocks.trackGalleryLightboxOpen,
}));

vi.mock("react-masonry-css", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="masonry">{children}</div>,
}));

vi.mock("yet-another-react-lightbox", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="lightbox">Lightbox open</div> : null),
}));

vi.mock("yet-another-react-lightbox/plugins/zoom", () => ({
  default: {},
}));

const onePhoto = (override: Partial<Photo> = {}): Photo => ({
  id: "photo-1",
  url: "https://example.com/full.jpg",
  transformed_url: "https://example.com/thumb.jpg",
  category: "PORTRAITS",
  ...override,
});

describe("Gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders fetched gallery cards", async () => {
    mocks.getGallery.mockResolvedValueOnce([onePhoto()]);

    render(<Gallery />);

    expect(await screen.findByRole("button", { name: /open photo 1 in lightbox/i })).toBeInTheDocument();
    expect(mocks.getGallery).toHaveBeenCalledWith("ALL", { width: 480, quality: 70, format: "webp" });
    expect(mocks.trackGalleryView).toHaveBeenCalledWith("ALL");
  });

  it("opens lightbox with keyboard and fetches full-resolution images", async () => {
    mocks.getGallery
      .mockResolvedValueOnce([onePhoto()])
      .mockResolvedValueOnce([onePhoto({ url: "https://example.com/full-hd.jpg" })]);

    render(<Gallery />);

    const firstCard = await screen.findByRole("button", { name: /open photo 1 in lightbox/i });
    fireEvent.keyDown(firstCard, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByTestId("lightbox")).toBeInTheDocument();
    });

    expect(mocks.getGallery).toHaveBeenNthCalledWith(2, "ALL", { width: 1200, quality: 85, format: "webp" });
  });

  it("shows a friendly error if gallery fetch fails", async () => {
    mocks.getGallery.mockRejectedValueOnce(new Error("network down"));

    render(<Gallery />);

    expect(await screen.findByText("Failed to load photos. Please try again later.")).toBeInTheDocument();
  });
});
