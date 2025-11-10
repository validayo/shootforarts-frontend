import { Photo, ContactFormData } from "../utils";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

/**
 * Fetch photos optionally filtered by category.
 */
export const fetchPhotos = async (category?: string): Promise<Photo[]> => {
  try {
    const res = await fetch(`${API_BASE}/images`);
    if (!res.ok) throw new Error("Failed to fetch images");
    const data = await res.json();

    // Optionally filter client-side if needed
    if (category && category !== "ALL") {
      return data.filter((p: Photo) => p.category === category);
    }

    return data;
  } catch (error) {
    console.error("Error fetching photos:", error);
    return [];
  }
};

/**
 * Submit contact form — goes through your backend.
 */
export const submitContactForm = async (formData: ContactFormData): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/contact-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Failed to submit contact form");
    }
  } catch (error) {
    console.error("Error submitting contact form:", error);
    throw error;
  }
};

/**
 * Subscribe to newsletter — goes through your backend.
 */
export const subscribeToNewsletter = async (email: string): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/newsletter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) throw new Error("Failed to subscribe");
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    throw error;
  }
};

/**
 * Upload photos (admin panel)
 */
export const uploadPhotos = async (formData: FormData): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/upload-photos`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  } catch (error) {
    console.error("Error uploading photos:", error);
    throw error;
  }
};
