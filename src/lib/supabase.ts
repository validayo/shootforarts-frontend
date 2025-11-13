import { Photo } from "../utils";
import { supabaseUrl, supabaseAnonKey } from "./supabaseClient";
import { getGallery } from "./services";
// Re-export the singleton client for consumers importing from "../lib/supabase"
export { supabase } from "./supabaseClient";
export { supabaseUrl, supabaseAnonKey };

export const uploadPhoto = async (file: File, category: string, title?: string): Promise<Photo> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    if (title) formData.append("title", title);

    const response = await fetch(`${supabaseUrl}/functions/v1/storage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload photo");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading photo:", error);
    throw error;
  }
};

export const getPhotos = async (category?: string): Promise<Photo[]> => {
  try {
    // Emulate old behavior: fetch all, filter locally by UI's ALL/PORTRAITS/EVENTS/WEDDINGS/EXTRAS
    const all = await getGallery("ALL", { width: 1200, quality: 80, format: "webp" });
    if (!category || category === "ALL") return Array.isArray(all) ? all : [];
    const target = category.toUpperCase();
    return (Array.isArray(all) ? all : []).filter((p) => (p.category || "").toUpperCase() === target);
  } catch (err) {
    console.error("Error fetching photos:", err);
    return [];
  }
};
