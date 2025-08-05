import { supabase } from "./supabase";
import { getAccessToken } from "./auth";
import { Photo, ContactFormData } from "../utils";

let photoCache: Photo[] = [];
let listeners: ((photos: Photo[]) => void)[] = [];

/**
 * Subscribe to real-time photo updates.
 */
export const subscribeToPhotos = (callback: (photos: Photo[]) => void) => {
  listeners.push(callback);
  callback(photoCache);

  if (listeners.length === 1) {
    const subscription = supabase
      .channel("photos_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photos",
        },
        async () => {
          const { data } = await supabase
            .from("photos")
            .select("*")
            .order("created_at", { ascending: false });

          if (data) {
            photoCache = data;
            listeners.forEach((listener) => listener(photoCache));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      listeners = listeners.filter((l) => l !== callback);
    };
  }

  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
};

/**
 * Fetch photos optionally filtered by category.
 */
export const fetchPhotos = async (category?: string): Promise<Photo[]> => {
  try {
    let query = supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    photoCache = data;
    return data;
  } catch (error) {
    console.error("Error fetching photos:", error);
    return [];
  }
};

/**
 * Submit contact form and trigger email notification.
 */
export const submitContactForm = async (
  formData: ContactFormData
): Promise<void> => {
  try {
    const { error } = await supabase.from("contact_submissions").insert([
      {
        ...formData,
      },
    ]);
    if (error) throw error;

    const token = await getAccessToken();

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "contact",
          data: formData,
        }),
      }
    );
  } catch (error) {
    console.error("Error submitting contact form:", error);
    throw error;
  }
};

/**
 * Subscribe to newsletter and trigger email notification.
 */
export const subscribeToNewsletter = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert([{ email }]);
    if (error) throw error;

    const token = await getAccessToken();

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "newsletter",
          data: { email },
        }),
      }
    );
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    throw error;
  }
};