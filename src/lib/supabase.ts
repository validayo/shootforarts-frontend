import { Photo } from "../utils";
import { supabaseUrl, supabaseAnonKey } from "./supabaseClient";
// Re-export the singleton client for consumers importing from "../lib/supabase"
export { supabase } from "./supabaseClient";
export { supabaseUrl, supabaseAnonKey };

export const uploadPhoto = async (file: File, category: string, title?: string, onProgress?: (progress: number) => void): Promise<Photo> => {
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
    // Build backend URL dynamically
    const url = new URL(`${import.meta.env.VITE_BACKEND_URL}/images`);

    // Add category filter if not "ALL"
    if (category && category !== "ALL") {
      url.searchParams.append("category", category);
    }

    // Fetch photos from backend
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    

    // Return just the photo array
    return json.photos || [];
  } catch (err) {
    console.error("❌ Error fetching photos:", err);
    return [];
  }
};

