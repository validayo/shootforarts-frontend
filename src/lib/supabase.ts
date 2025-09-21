import { createClient } from "@supabase/supabase-js";
import { Photo } from "../utils";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

export const getPhotos = async (category?: string, page: number = 0, pageSize: number = 20): Promise<Photo[]> => {
  try {
    // base query
    let query = supabase
      .from("photos")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    // category filter (case-insensitive, skip if ALL)
    if (category && category !== "ALL") {
      query = query.ilike("category", category); // matches Portraits / portraits / PORTRAITS
    }

    const { data, error } = await query;
    if (error) throw error;

    console.log("Supabase query response:", { category, data, error });
    return data || [];
  } catch (err) {
    console.error("Error fetching photos:", err);
    return [];
  }
};
