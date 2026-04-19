import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, TrendingUp, Users, Calendar, Mail, Search, X } from "lucide-react";
import { supabase, supabaseAnonKey } from "../../lib/supabase";
import {
  BASE,
  getContactSubmissions,
  getNewsletterSubscribers,
  getBookingWorkflows,
  upsertBookingWorkflow,
  getAdminAIInbox,
  getAdminAIInquiry,
  markAdminAILastSeen,
  type BookingWorkflowStatus,
} from "../../lib/api/services";
import {
  Contact,
  parseInspirationLinks,
  type AdminAIInboxItem,
  type AdminAIInquiryDetailResponse,
} from "../../utils";
import { serviceOptions } from "../../utils";
import { dedupeByIdentity, isLocalEnvironment, toContactList, toSubscriberList, type AdminSubscriber } from "../../utils/admin/helpers";
import type { Session } from "@supabase/supabase-js";
import { logAdminAction, logAdminError, logAdminWarning } from "../../lib/observability/logger";
import AdminAISummaryCard from "./AdminAISummaryCard";
import AdminAIInsightSection from "./AdminAIInsightSection";
import { aiStatusClassByKey } from "./adminAIStyles";

type DateFilterOption = "all" | "7days" | "30days" | "90days";
type Subscriber = AdminSubscriber;
type BookingStatus = BookingWorkflowStatus;
type WorkflowFilter = "all" | "needs_action" | "booked" | "follow_up" | "completed";

interface BookingWorkflowMeta {
  status: BookingStatus;
  assignedTo: string;
  note: string;
  updatedAt: string | null;
}

const edgeSyncEnabled = (import.meta.env.VITE_ENABLE_EDGE_SYNC ?? "false") === "true";
const WORKFLOW_STORAGE_KEY = "sfa_admin_booking_workflow_v1";
const NEEDS_ACTION_STATUSES: BookingStatus[] = ["new", "in_review", "follow_up"];
const STATUS_LABELS: Record<BookingStatus, string> = {
  new: "New",
  in_review: "In Review",
  follow_up: "Follow Up",
  booked: "Booked",
  completed: "Completed",
  archived: "Archived",
};

const DEFAULT_WORKFLOW: BookingWorkflowMeta = {
  status: "new",
  assignedTo: "",
  note: "",
  updatedAt: null,
};

const workflowStatusClass: Record<BookingStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  in_review: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  follow_up: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  booked: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  completed: "bg-teal-50 text-teal-700 ring-1 ring-teal-100",
  archived: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};
const workflowSortRank: Record<BookingStatus, number> = {
  new: 0,
  follow_up: 1,
  in_review: 2,
  booked: 3,
  completed: 4,
  archived: 5,
};

const normalizeBookingStatus = (value?: string | null): BookingStatus =>
  value && value in STATUS_LABELS ? (value as BookingStatus) : DEFAULT_WORKFLOW.status;

const AdminData: React.FC = () => {
  const aiEnabled = (import.meta.env.VITE_ENABLE_AI_ADMIN ?? "false") === "true";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeTab, setActiveTab] = useState<"contacts" | "subscribers">("contacts");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [selectedService, setSelectedService] = useState<string>("All");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workflowById, setWorkflowById] = useState<Record<string, BookingWorkflowMeta>>({});
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>("all");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<BookingStatus>("in_review");
  const [aiInboxLoading, setAIInboxLoading] = useState(false);
  const [aiInboxError, setAIInboxError] = useState<string | null>(null);
  const [aiInboxItems, setAIInboxItems] = useState<AdminAIInboxItem[]>([]);
  const [aiInboxById, setAIInboxById] = useState<Record<string, AdminAIInboxItem>>({});
  const [aiDetailById, setAIDetailById] = useState<Record<string, AdminAIInquiryDetailResponse>>({});
  const [aiDetailLoadingById, setAIDetailLoadingById] = useState<Record<string, boolean>>({});
  const [aiDetailErrorById, setAIDetailErrorById] = useState<Record<string, string | null>>({});
  const saveTimersRef = useRef<Record<string, number>>({});
  const hasMarkedAILastSeenRef = useRef(false);
  const aiFetchStatusRef = useRef<Record<string, boolean>>({});

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(data.session ?? null);
      } catch (error) {
        if (isMounted) {
          console.error("Failed to hydrate session:", error);
          setSession(null);
        }
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSupabaseData = async () => {
      setLoading(true);
      try {
        const [contactsData, subscriberData] = await Promise.all([getContactSubmissions(), getNewsletterSubscribers()]);
        if (cancelled) return;
        setContacts(contactsData);
        setSubscribers(subscriberData);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching admin data from Supabase:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSupabaseData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!edgeSyncEnabled || !session || isLocalEnvironment()) return;

    let cancelled = false;

    const fetchProtectedData = async () => {
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
        if (supabaseAnonKey) {
          headers.apikey = supabaseAnonKey;
        }
        const [backendContacts, backendSubs] = await Promise.all([
          fetch(`${BASE}/contact-submissions?limit=50&offset=0`, { headers }).then((response) => response.json()),
          fetch(`${BASE}/newsletter`, { headers }).then((response) => response.json()),
        ]);

        if (cancelled) return;

        const contactList = toContactList(backendContacts);
        const subscriberList = toSubscriberList(backendSubs);

        setContacts((prev) => dedupeByIdentity([...prev, ...contactList]));
        setSubscribers((prev) => dedupeByIdentity([...prev, ...subscriberList]));
      } catch (err) {
        if (!cancelled && edgeSyncEnabled) {
          console.warn("Protected backend sync failed; using Supabase data only", err);
          logAdminWarning("admin_data.sync_fallback_supabase", { reason: String(err) });
        }
      }
    };

    fetchProtectedData();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !aiEnabled) return;

    let cancelled = false;

    const fetchAIInbox = async () => {
      setAIInboxLoading(true);
      setAIInboxError(null);

      try {
        const response = await getAdminAIInbox();
        if (cancelled) return;

        const items = Array.isArray(response.items) ? response.items : [];
        const byId = items.reduce<Record<string, AdminAIInboxItem>>((acc, item) => {
          acc[item.contactSubmissionId] = item;
          return acc;
        }, {});

        setAIInboxItems(items);
        setAIInboxById(byId);

        if (!hasMarkedAILastSeenRef.current) {
          hasMarkedAILastSeenRef.current = true;
          void markAdminAILastSeen().catch((error) => {
            logAdminWarning("admin_data.ai_last_seen_failed", { reason: String(error) });
          });
        }
      } catch (error) {
        if (cancelled) return;
        setAIInboxItems([]);
        setAIInboxById({});
        setAIInboxError("AI insights are temporarily unavailable.");
        logAdminWarning("admin_data.ai_inbox_failed", { reason: String(error) });
      } finally {
        if (!cancelled) {
          setAIInboxLoading(false);
        }
      }
    };

    fetchAIInbox();

    return () => {
      cancelled = true;
    };
  }, [session, aiEnabled]);

  useEffect(() => {
    if (!selectedContact) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedContact(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedContact]);

  const loadAIInquiryDetail = useCallback(async (contactId: string) => {
    if (!aiEnabled || !session || aiFetchStatusRef.current[contactId]) return;

    aiFetchStatusRef.current[contactId] = true;
    setAIDetailLoadingById((prev) => ({ ...prev, [contactId]: true }));
    setAIDetailErrorById((prev) => ({ ...prev, [contactId]: null }));

    try {
      const detail = await getAdminAIInquiry(contactId);
      setAIDetailById((prev) => ({ ...prev, [contactId]: detail }));
    } catch (error) {
      delete aiFetchStatusRef.current[contactId];
      const message = "AI insight could not be loaded.";
      setAIDetailErrorById((prev) => ({ ...prev, [contactId]: message }));
      logAdminError("admin_data.ai_inquiry_failed", { contactId, reason: String(error) });
    } finally {
      setAIDetailLoadingById((prev) => ({ ...prev, [contactId]: false }));
    }
  }, [aiEnabled, session]);

  useEffect(() => {
    if (!selectedContact || !aiEnabled || aiInboxError || !session) return;
    void loadAIInquiryDetail(selectedContact.id);
  }, [selectedContact, aiEnabled, aiInboxError, session, loadAIInquiryDetail]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, Partial<BookingWorkflowMeta>>;
      const sanitized = Object.entries(parsed).reduce<Record<string, BookingWorkflowMeta>>((acc, [contactId, meta]) => {
        acc[contactId] = {
          ...DEFAULT_WORKFLOW,
          ...meta,
          status: normalizeBookingStatus(meta.status as string | undefined),
          assignedTo: String(meta.assignedTo ?? ""),
          note: String(meta.note ?? ""),
          updatedAt: meta.updatedAt ? String(meta.updatedAt) : null,
        };
        return acc;
      }, {});
      setWorkflowById(sanitized);
    } catch (error) {
      console.warn("Failed to hydrate booking workflow state:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflowById));
    } catch (error) {
      console.warn("Failed to persist booking workflow state:", error);
    }
  }, [workflowById]);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      saveTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!session || contacts.length === 0) return;

    let cancelled = false;

    const hydrateWorkflows = async () => {
      try {
        const rows = await getBookingWorkflows(contacts.map((contact) => String(contact.id)));
        if (cancelled || rows.length === 0) return;

        setWorkflowById((prev) => {
          const next = { ...prev };

          for (const row of rows) {
            const contactId = String(row.contact_id);
            const incoming: BookingWorkflowMeta = {
              status: normalizeBookingStatus(row.status),
              assignedTo: String(row.assigned_to ?? ""),
              note: String(row.note ?? ""),
              updatedAt: row.updated_at ?? row.created_at ?? null,
            };

            const current = next[contactId];
            if (!current) {
              next[contactId] = incoming;
              continue;
            }

            const currentTime = current.updatedAt ? Date.parse(current.updatedAt) : 0;
            const incomingTime = incoming.updatedAt ? Date.parse(incoming.updatedAt) : 0;
            if (incomingTime >= currentTime) {
              next[contactId] = incoming;
            }
          }

          return next;
        });
      } catch (error) {
        if (cancelled) return;
        console.warn("Failed to hydrate booking workflow from Supabase:", error);
        logAdminWarning("admin_data.workflow_hydrate_failed", { reason: String(error) });
      }
    };

    hydrateWorkflows();

    return () => {
      cancelled = true;
    };
  }, [session, contacts]);

  const filterByDate = <T extends { created_at?: string | null }>(items: T[]): T[] => {
    if (dateFilter === "all") return items;

    const daysAgoMap: Record<Exclude<typeof dateFilter, "all">, number> = { "7days": 7, "30days": 30, "90days": 90 };
    const cutoffDate = new Date();
    const daysToSubtract = daysAgoMap[dateFilter as Exclude<typeof dateFilter, "all">] || 0;
    cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);

    return items.filter((item) => {
      if (!item.created_at) return false;
      const createdAt = new Date(item.created_at);
      return createdAt >= cutoffDate;
    });
  };

  const getWorkflow = (contactId: string): BookingWorkflowMeta => ({
    ...DEFAULT_WORKFLOW,
    ...(workflowById[contactId] || {}),
  });

  const queueWorkflowPersist = (contactId: string, next: BookingWorkflowMeta) => {
    if (!session) return;

    const existingTimer = saveTimersRef.current[contactId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    saveTimersRef.current[contactId] = window.setTimeout(async () => {
      try {
        await upsertBookingWorkflow({
          contact_id: contactId,
          status: next.status,
          assigned_to: next.assignedTo || null,
          note: next.note || null,
          updated_at: next.updatedAt,
        });
      } catch (error) {
        console.warn("Failed to sync booking workflow to Supabase:", error);
        logAdminWarning("admin_data.workflow_sync_failed", { contactId, reason: String(error) });
      } finally {
        delete saveTimersRef.current[contactId];
      }
    }, 500);
  };

  const updateWorkflow = (contactId: string, patch: Partial<BookingWorkflowMeta>) => {
    setWorkflowById((prev) => {
      const current = { ...DEFAULT_WORKFLOW, ...(prev[contactId] || {}) };
      const next = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      queueWorkflowPersist(contactId, next);
      return {
        ...prev,
        [contactId]: next,
      };
    });
  };

  const filteredContacts = filterByDate(
    contacts.filter((c) => {
      const matchesSearch = `${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const norm = (s?: string) => (s || "").toLowerCase().trim();
      const matchesService = selectedService === "All" || norm(c.service) === norm(selectedService);
      const workflow = getWorkflow(c.id);
      const matchesWorkflow = (() => {
        if (workflowFilter === "all") return true;
        if (workflowFilter === "needs_action") return NEEDS_ACTION_STATUSES.includes(workflow.status);
        if (workflowFilter === "booked") return workflow.status === "booked";
        if (workflowFilter === "follow_up") return workflow.status === "follow_up";
        if (workflowFilter === "completed") return workflow.status === "completed";
        return true;
      })();
      return matchesSearch && matchesService && matchesWorkflow;
    })
  );
  const selectedIdSet = new Set(selectedContactIds);
  const visibleContactIds = filteredContacts.map((contact) => contact.id);
  const selectedVisibleIds = visibleContactIds.filter((id) => selectedIdSet.has(id));
  const selectedVisibleCount = selectedVisibleIds.length;
  const areAllVisibleSelected = visibleContactIds.length > 0 && selectedVisibleCount === visibleContactIds.length;

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => (prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]));
  };

  const toggleSelectAllVisible = () => {
    setSelectedContactIds((prev) => {
      if (areAllVisibleSelected) {
        return prev.filter((id) => !visibleContactIds.includes(id));
      }
      const merged = new Set([...prev, ...visibleContactIds]);
      return Array.from(merged);
    });
  };

  const clearVisibleSelection = () => {
    setSelectedContactIds((prev) => prev.filter((id) => !visibleContactIds.includes(id)));
  };

  const applyBulkStatus = () => {
    if (selectedVisibleIds.length === 0) return;
    for (const contactId of selectedVisibleIds) {
      updateWorkflow(contactId, { status: bulkStatus });
    }
    logAdminAction("admin_data.bulk_status_update", {
      count: selectedVisibleIds.length,
      status: bulkStatus,
    });
    clearVisibleSelection();
  };

  useEffect(() => {
    const contactIds = new Set(contacts.map((contact) => contact.id));
    setSelectedContactIds((prev) => prev.filter((id) => contactIds.has(id)));
  }, [contacts]);

  const labelize = (key: string) => {
    const map: Record<string, string> = {
      peopleCount: "Number of people",
      parking: "Parking available",
      hours: "Estimated hours",
      indoorOutdoor: "Indoor/Outdoor",
      preferredContactMethod: "Preferred contact method",
      bestContactTime: "Best contact time",
      dateFlexibility: "Date flexibility",
    };
    if (map[key]) return map[key];
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const filteredSubscribers = filterByDate(subscribers.filter((s) => s.email.toLowerCase().includes(searchTerm.toLowerCase())));

  const stats = {
    totalContacts: contacts.length,
    totalSubscribers: subscribers.length,
    recentContacts: contacts.filter((c) => c.created_at && new Date(c.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
    serviceBreakdown: contacts.reduce((acc, c) => {
      const key = c.service || "Other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const topServiceEntry = Object.entries(stats.serviceBreakdown).sort((a, b) => b[1] - a[1])[0];
  const topServiceLabel = topServiceEntry?.[0] || "N/A";
  const topServiceCount = topServiceEntry?.[1] ?? 0;
  const contactToSubscriberRatio = stats.totalSubscribers > 0
    ? `${Math.round((stats.totalContacts / stats.totalSubscribers) * 10) / 10}:1`
    : "N/A";

  const serviceBadgeClass = (service?: string) => {
    const normalized = (service || "").toLowerCase().trim();
    if (normalized.includes("wedding")) return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
    if (normalized.includes("event")) return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    if (normalized.includes("creative")) return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100";
    if (normalized.includes("grad")) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  };

  const canRenderAIState = aiEnabled && !aiInboxError;

  const getAIStatusLabel = (status: AdminAIInboxItem["analysisStatus"]) => {
    if (status === "succeeded") return "AI Ready";
    if (status === "pending") return "AI Pending";
    return "AI Failed";
  };

  const getAIRecommendationLabel = (item: AdminAIInboxItem) => {
    if (item.recommendedCatalogItem?.label) return item.recommendedCatalogItem.label;
    if (item.recommendedAction === "custom_quote") return "Custom quote review";
    return "Needs clarification";
  };

  const openContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    if (canRenderAIState) {
      void loadAIInquiryDetail(contact.id);
    }
  };

  const handleDesktopDetailToggle = (contactId: string, open: boolean) => {
    if (!open || !canRenderAIState) return;
    void loadAIInquiryDetail(contactId);
  };

  const renderAIState = (contactId: string) => {
    if (!canRenderAIState) return null;
    const item = aiInboxById[contactId];
    if (!item) return null;

    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${aiStatusClassByKey[item.analysisStatus]}`}>
            {getAIStatusLabel(item.analysisStatus)}
          </span>
          {item.reviewState && (
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
              {item.reviewState.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600">
          {getAIRecommendationLabel(item)}
          {typeof item.confidenceScore === "number" ? ` • ${Math.round(item.confidenceScore * 100)}% confidence` : ""}
        </p>
      </div>
    );
  };

  const workflowCounts = contacts.reduce(
    (acc, contact) => {
      const workflow = getWorkflow(contact.id);
      acc[workflow.status] += 1;
      return acc;
    },
    {
      new: 0,
      in_review: 0,
      follow_up: 0,
      booked: 0,
      completed: 0,
      archived: 0,
    } as Record<BookingStatus, number>
  );
  const needsActionCount = workflowCounts.new + workflowCounts.in_review + workflowCounts.follow_up;
  const actionQueue = [...contacts]
    .filter((contact) => NEEDS_ACTION_STATUSES.includes(getWorkflow(contact.id).status))
    .sort((a, b) => {
      const workflowA = getWorkflow(a.id);
      const workflowB = getWorkflow(b.id);

      const rankDelta = workflowSortRank[workflowA.status] - workflowSortRank[workflowB.status];
      if (rankDelta !== 0) return rankDelta;

      const updatedA = Date.parse(workflowA.updatedAt || a.created_at || "") || 0;
      const updatedB = Date.parse(workflowB.updatedAt || b.created_at || "") || 0;
      return updatedA - updatedB;
    })
    .slice(0, 6);

  const escapeCsvCell = (value: unknown) => {
    const raw = String(value ?? "");
    const formulaLike = /^[\t\r\n ]*[=+\-@]/.test(raw);
    const safe = `${formulaLike ? "'" : ""}${raw}`;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const exportToCsv = (rows: Array<Record<string, string>>, filename: string) => {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.map((header) => escapeCsvCell(header)).join(","),
      ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
    ];

    const csv = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportContacts = () => {
    logAdminAction("admin_data.export_contacts", { rowCount: filteredContacts.length });
    const exportData = filteredContacts.map((c) => {
      const parsedInspiration = parseInspirationLinks(c.pinterestInspo);
      const extra = c.extra_questions ?? {};
      const workflow = getWorkflow(c.id);
      return {
        "Submitted At": formatDate(c.created_at),
        Name: `${c.firstName} ${c.lastName}`,
        Email: c.email,
        Phone: c.phone || "N/A",
        Service: c.service,
        "Service Tier": c.service_tier || "N/A",
        Occasion: c.occasion || "N/A",
        Date: c.date || "N/A",
        Time: c.time || "N/A",
        "Date Flexibility": extra.dateFlexibility ? String(extra.dateFlexibility) : "N/A",
        "Preferred Contact Method": extra.preferredContactMethod ? String(extra.preferredContactMethod) : "N/A",
        "Best Contact Time": extra.bestContactTime ? String(extra.bestContactTime) : "N/A",
        Location: c.location || "N/A",
        Instagram: c.instagram || "N/A",
        "Inspiration Links": parsedInspiration.validUrls.length ? parsedInspiration.validUrls.join(" | ") : c.pinterestInspo || "N/A",
        "Referral Source": c.referralSource || "N/A",
        "Add-ons": c.add_ons?.join(", ") || "N/A",
        "Workflow Status": STATUS_LABELS[workflow.status],
        "Assigned To": workflow.assignedTo || "N/A",
        "Internal Note": workflow.note || "N/A",
        Questions: c.questions || "N/A",
      };
    });
    exportToCsv(exportData, "contacts-export");
  };

  const handleExportSubscribers = () => {
    logAdminAction("admin_data.export_subscribers", { rowCount: filteredSubscribers.length });
    const exportData = filteredSubscribers.map((s) => ({
      "Subscribed At": formatDate(s.created_at),
      Email: s.email,
    }));
    exportToCsv(exportData, "subscribers-export");
  };

  const renderDetailRow = (label: string, content: React.ReactNode) => (
    <div className="grid gap-1 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">{label}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere] break-words text-sm text-gray-800">{content}</dd>
    </div>
  );

  const renderContactDetails = (c: Contact) => (
    <div className="space-y-4">
      <dl className="divide-y divide-gray-100">
        {c.service_tier && renderDetailRow("Tier", c.service_tier)}
        {c.date && renderDetailRow("Date", c.date)}
        {c.time && renderDetailRow("Time", c.time)}
        {c.location && renderDetailRow("Location", c.location)}
        {c.phone &&
          renderDetailRow(
            "Phone",
            <a className="text-blue-600 hover:underline" href={`tel:${c.phone}`}>
              {c.phone}
            </a>,
          )}
        {c.instagram && renderDetailRow("Instagram", c.instagram)}
        {c.referralSource && renderDetailRow("Referral", c.referralSource)}
        {c.occasion && renderDetailRow("Occasion", <span className="whitespace-pre-wrap">{c.occasion}</span>)}
      </dl>

      {c.pinterestInspo && (() => {
        const links = parseInspirationLinks(c.pinterestInspo).validUrls;
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">Inspiration</p>
            {links.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm text-gray-800">
                {links.map((link) => (
                  <li key={link}>
                    <a className="break-all text-blue-600 hover:underline" href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{c.pinterestInspo}</p>
            )}
          </div>
        );
      })()}

      {c.add_ons?.length ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">Add-ons</p>
          <p className="mt-2 text-sm text-gray-800">{c.add_ons.join(", ")}</p>
        </div>
      ) : null}

      {c.extra_questions && Object.keys(c.extra_questions).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">Extra Details</p>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-800">
            {Object.entries(c.extra_questions).map(([k, v]) => (
              <li key={k}>
                <span className="font-medium text-gray-900">{labelize(k)}:</span> {String(v)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.questions && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">Questions</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{c.questions}</p>
        </div>
      )}
    </div>
  );

  const renderWorkflowEditor = (c: Contact, compact = false) => {
    const workflow = getWorkflow(c.id);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${workflowStatusClass[workflow.status]}`}>
            {STATUS_LABELS[workflow.status]}
          </span>
        </div>
        <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Status</span>
            <select
              value={workflow.status}
              onChange={(e) => updateWorkflow(c.id, { status: e.target.value as BookingStatus })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className={`space-y-1 ${compact ? "" : "md:col-span-2"}`}>
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Assigned To</span>
            <input
              type="text"
              value={workflow.assignedTo}
              onChange={(e) => updateWorkflow(c.id, { assignedTo: e.target.value })}
              placeholder="e.g. Me / Assistant"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className={`space-y-1 ${compact ? "" : "md:col-span-2"}`}>
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Internal Notes</span>
            <textarea
              value={workflow.note}
              onChange={(e) => updateWorkflow(c.id, { note: e.target.value })}
              placeholder="Add follow-up notes, deliverables, or reminders..."
              rows={3}
              className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">Last updated: {workflow.updatedAt ? formatDate(workflow.updatedAt) : "Not set yet"}</p>
      </div>
    );
  };

  const selectedWorkflow = selectedContact ? getWorkflow(selectedContact.id) : null;
  const selectedAIDetail = selectedContact ? aiDetailById[selectedContact.id] ?? null : null;
  const selectedAILoading = selectedContact ? Boolean(aiDetailLoadingById[selectedContact.id]) : false;
  const selectedAIError = selectedContact ? aiDetailErrorById[selectedContact.id] ?? null : null;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Total Contacts</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalContacts}</p>
              <p className="mt-1 text-sm text-gray-500">All inquiry submissions</p>
            </div>
            <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Users className="h-5 w-5" />
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Needs Action</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{needsActionCount}</p>
              <p className="mt-1 text-sm text-gray-500">New, review, and follow-up queue</p>
            </div>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Subscribers</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalSubscribers}</p>
              <p className="mt-1 text-sm text-gray-500">Newsletter opt-ins</p>
            </div>
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
              <Mail className="h-5 w-5" />
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Top Service</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{topServiceLabel}</p>
              <p className="mt-1 text-sm text-gray-500">{topServiceCount} bookings • Ratio {contactToSubscriberRatio}</p>
            </div>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
        </motion.div>
      </div>

      <AdminAISummaryCard enabled={aiEnabled} loading={aiInboxLoading} error={aiInboxError} items={aiInboxItems} />

      {activeTab === "contacts" && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Needs Action Queue</p>
              <p className="mt-1 text-sm text-gray-700">Top bookings to process next.</p>
            </div>
            <button
              type="button"
              onClick={() => setWorkflowFilter("needs_action")}
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              View All ({needsActionCount})
            </button>
          </div>

          {actionQueue.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No bookings currently in the action queue.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
              {actionQueue.map((contact) => {
                const workflow = getWorkflow(contact.id);
                return (
                  <article key={contact.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{contact.firstName} {contact.lastName}</p>
                        <p className="mt-0.5 text-xs text-gray-600">{contact.service}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${workflowStatusClass[workflow.status]}`}>
                        {STATUS_LABELS[workflow.status]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Submitted: {formatDate(contact.created_at)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openContactDetails(contact)}
                        className="inline-flex rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWorkflow(contact.id, { status: "follow_up" })}
                        className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                      >
                        Follow Up
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWorkflow(contact.id, { status: "booked" })}
                        className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        Mark Booked
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto">
              <button
                className={`inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
                  activeTab === "contacts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("contacts")}
              >
                Contacts
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{filteredContacts.length}</span>
              </button>
              <button
                className={`inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
                  activeTab === "subscribers" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("subscribers")}
              >
                Subscribers
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{filteredSubscribers.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <p className="hidden text-xs font-medium uppercase tracking-[0.12em] text-gray-500 sm:block">
                Showing {activeTab === "contacts" ? filteredContacts.length : filteredSubscribers.length} records
              </p>
              <button
                onClick={() => (activeTab === "contacts" ? handleExportContacts() : handleExportSubscribers())}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative xl:min-w-0 xl:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === "contacts" ? "Search by name or email..." : "Search subscriber email..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[24rem]">
              {activeTab === "contacts" && (
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="min-w-0 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Services</option>
                  {Object.keys(serviceOptions).map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                className="min-w-0 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>
          </div>

          {activeTab === "contacts" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { key: "all", label: "All Bookings", count: contacts.length },
                { key: "needs_action", label: "Needs Action", count: needsActionCount },
                { key: "booked", label: "Booked", count: workflowCounts.booked },
                { key: "follow_up", label: "Follow Up", count: workflowCounts.follow_up },
                { key: "completed", label: "Completed", count: workflowCounts.completed },
              ] as Array<{ key: WorkflowFilter; label: string; count: number }>).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setWorkflowFilter(item.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    workflowFilter === item.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={areAllVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Select all visible
              </label>
              <span className="text-xs text-gray-600">{selectedVisibleCount} selected</span>
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as BookingStatus)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">Set: New</option>
                <option value="in_review">Set: In Review</option>
                <option value="follow_up">Set: Follow Up</option>
                <option value="booked">Set: Booked</option>
                <option value="completed">Set: Completed</option>
                <option value="archived">Set: Archived</option>
              </select>
              <button
                type="button"
                onClick={applyBulkStatus}
                disabled={selectedVisibleCount === 0}
                className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply to Selected
              </button>
              <button
                type="button"
                onClick={clearVisibleSelection}
                disabled={selectedVisibleCount === 0}
                className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <div>
            {activeTab === "contacts" && (
              <>
                <div className="divide-y divide-gray-200 2xl:hidden md:grid md:grid-cols-2 md:gap-4 md:divide-y-0 md:p-4">
                  {filteredContacts.map((c) => {
                    const workflow = getWorkflow(c.id);
                    const isSelected = selectedIdSet.has(c.id);
                    return (
                      <article
                        key={c.id}
                        className={`space-y-3 px-4 py-4 md:rounded-xl md:border md:border-gray-200 md:px-4 ${isSelected ? "bg-blue-50/40 md:border-blue-200" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleContactSelection(c.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`Select ${c.firstName} ${c.lastName}`}
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{`${c.firstName} ${c.lastName}`}</p>
                              <p className="mt-0.5 text-xs text-gray-500">{formatDate(c.created_at)}</p>
                            </div>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${serviceBadgeClass(c.service)}`}>{c.service}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${workflowStatusClass[workflow.status]}`}>
                            {STATUS_LABELS[workflow.status]}
                          </span>
                        </div>
                        {renderAIState(c.id)}
                        <a className="block text-sm text-blue-600 hover:underline" href={`mailto:${c.email}`}>
                          {c.email}
                        </a>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openContactDetails(c)}
                            className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
                          >
                            View Details
                          </button>
                          <a href={`mailto:${c.email}`} className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
                            Email
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto 2xl:block">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={areAllVisibleSelected}
                            onChange={toggleSelectAllVisible}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            aria-label="Select all visible contacts"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Submitted</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredContacts.map((c) => {
                        const workflow = getWorkflow(c.id);
                        const isSelected = selectedIdSet.has(c.id);
                        return (
                          <tr key={c.id} className={`align-top transition-colors hover:bg-gray-50 ${isSelected ? "bg-blue-50/40" : ""}`}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleContactSelection(c.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                aria-label={`Select ${c.firstName} ${c.lastName}`}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-gray-900">{`${c.firstName} ${c.lastName}`}</p>
                              <a href={`mailto:${c.email}`} className="mt-1 block text-sm text-blue-600 hover:underline">
                                {c.email}
                              </a>
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="mt-1 block text-sm text-gray-600 hover:text-gray-800">
                                  {c.phone}
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${serviceBadgeClass(c.service)}`}>{c.service}</span>
                              {c.service_tier && <p className="mt-2 text-xs text-gray-600">{c.service_tier}</p>}
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${workflowStatusClass[workflow.status]}`}>
                                  {STATUS_LABELS[workflow.status]}
                                </span>
                              </div>
                              {renderAIState(c.id)}
                              {workflow.assignedTo && <p className="mt-2 text-xs text-gray-600">Assigned: {workflow.assignedTo}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{formatDate(c.created_at)}</td>
                            <td className="px-6 py-4 text-sm">
                              <button
                                type="button"
                                onClick={() => openContactDetails(c)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 2xl:hidden"
                              >
                                <span>▶</span>
                                <span>View Details</span>
                              </button>
                              <details
                                className="group hidden max-w-full cursor-pointer 2xl:block"
                                onToggle={(event) => handleDesktopDetailToggle(c.id, event.currentTarget.open)}
                              >
                                <summary className="inline-flex list-none items-center gap-1 text-blue-600 hover:text-blue-800 [&::-webkit-details-marker]:hidden">
                                  <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                                  <span>View Details</span>
                                </summary>
                                <div className="mt-3 w-[min(100%,calc(100vw-22rem))] max-w-[68rem] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-6 text-gray-800 [overflow-wrap:anywhere] break-words">
                                  <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                                    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3.5">
                                      <div className="mb-2.5">
                                        <p className="text-xs font-medium uppercase tracking-[0.1em] text-gray-500">Inquiry Details</p>
                                        <p className="mt-0.5 text-sm text-gray-500">Original client submission and request context.</p>
                                      </div>
                                      <div className="space-y-2">{renderContactDetails(c)}</div>
                                    </div>
                                    <div className="min-w-0 space-y-3">
                                      <div className="rounded-lg border border-gray-200 bg-white p-3">{renderWorkflowEditor(c)}</div>
                                      <AdminAIInsightSection
                                        detail={aiDetailById[c.id] ?? null}
                                        loading={Boolean(aiDetailLoadingById[c.id])}
                                        error={aiDetailErrorById[c.id] ?? null}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </details>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "subscribers" && (
              <>
                <div className="divide-y divide-gray-200 sm:hidden">
                  {filteredSubscribers.map((s) => (
                    <article key={s.id} className="space-y-2 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">{formatDate(s.created_at)}</p>
                      <a href={`mailto:${s.email}`} className="block text-sm font-medium text-blue-600 hover:underline">
                        {s.email}
                      </a>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredSubscribers.map((s) => (
                        <tr key={s.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">{formatDate(s.created_at)}</td>
                          <td className="px-6 py-4 text-sm">
                            <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline">
                              {s.email}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {((activeTab === "contacts" && filteredContacts.length === 0) || (activeTab === "subscribers" && filteredSubscribers.length === 0)) && (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-gray-500">No matching records</p>
                <p className="mt-2 text-sm text-gray-600">Try adjusting search keywords or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedContact && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 pt-6 sm:items-center sm:justify-center sm:p-6 2xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-contact-title"
          onClick={() => setSelectedContact(null)}
        >
          <div
            className="flex h-[calc(100dvh-1.5rem)] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:h-[min(90dvh,56rem)] sm:max-w-4xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center pt-2">
              <span className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-4 py-3">
              <div>
                <h3 id="mobile-contact-title" className="text-lg font-semibold text-gray-900">
                  {selectedContact.firstName} {selectedContact.lastName}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{selectedContact.service}</p>
                {selectedWorkflow && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${workflowStatusClass[selectedWorkflow.status]}`}>
                      {STATUS_LABELS[selectedWorkflow.status]}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close booking details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="sticky top-[73px] z-10 flex flex-wrap gap-2 border-b border-gray-200 bg-white px-4 py-3">
              <a
                href={`mailto:${selectedContact.email}`}
                className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
              >
                Email Client
              </a>
              {selectedContact.phone && (
                <a
                  href={`tel:${selectedContact.phone}`}
                  className="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  Call Client
                </a>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-sm leading-6 text-gray-800">
              <div className="space-y-4 pb-6">
              <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">{renderWorkflowEditor(selectedContact, true)}</section>
              <AdminAIInsightSection detail={selectedAIDetail} loading={selectedAILoading} error={selectedAIError} />
              <section className="space-y-2">{renderContactDetails(selectedContact)}</section>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminData;
