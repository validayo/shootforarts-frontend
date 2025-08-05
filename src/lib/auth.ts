import { supabase } from "./supabase";

/**
 * Get the current user's access token for authenticated requests.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

/**
 * Log in an admin user with email and password.
 */
export const adminLogin = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};

/**
 * Log out the current user.
 */
export const adminLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
};