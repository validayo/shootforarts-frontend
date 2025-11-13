import type { Contact } from "./index";

export interface AdminSubscriber {
  id: string;
  email: string;
  created_at: string;
}

type Identifiable = {
  id?: string | number | null;
  email?: string | null;
  created_at?: string | null;
};

export const isLocalEnvironment = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
};

export const dedupeByIdentity = <T extends Identifiable>(items: T[]): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    const key =
      (item.id && String(item.id)) ||
      (item.email && item.created_at ? `${item.email}-${item.created_at}` : JSON.stringify(item));
    map.set(key, item);
  });
  return Array.from(map.values());
};

export const toContactList = (payload: unknown): Contact[] => {
  if (Array.isArray(payload)) return payload as Contact[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { submissions?: unknown }).submissions)
  ) {
    return ((payload as { submissions: Contact[] }).submissions) ?? [];
  }
  return [];
};

export const toSubscriberList = (payload: unknown): AdminSubscriber[] => {
  if (Array.isArray(payload)) return payload as AdminSubscriber[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { subscribers?: unknown }).subscribers)
  ) {
    return ((payload as { subscribers: AdminSubscriber[] }).subscribers) ?? [];
  }
  return [];
};
