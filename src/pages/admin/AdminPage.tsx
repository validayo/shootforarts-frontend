import React, { useState, useEffect, useRef } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useLocation } from "react-router-dom";

import { motion } from "framer-motion";
import { X } from "lucide-react";

import { supabase, supabaseAnonKey } from "../../lib/supabase";
import { BASE, getContactSubmissions } from "../../lib/api/services";
import { useAuth } from "../../contexts/AuthContext";
import AdminLogin from "../../components/admin/AdminLogin";
import AdminUpload from "../../components/admin/AdminUpload";
import AdminData from "../../components/admin/AdminData";
import AdminShellLayout from "../../components/admin/AdminShellLayout";
import { Contact, CalendarEvent, Tab, parseInspirationLinks } from "../../utils";
import { serviceOptions } from "../../utils";
import { dedupeByIdentity, isLocalEnvironment, toContactList } from "../../utils/admin/helpers";
import type { Session } from "@supabase/supabase-js";
import { logAdminAction, logAdminError, logAdminWarning } from "../../lib/observability/logger";
import { ROUTES } from "../../config/routes";


const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const edgeSyncEnabled = (import.meta.env.VITE_ENABLE_EDGE_SYNC ?? "false") === "true";
const normalizeTabFromPath = (pathname: string): Tab => {
  if (pathname === ROUTES.admin.calendar || pathname === ROUTES.admin.calendarAlias) return "calendar";
  if (pathname === ROUTES.admin.upload) return "upload";
  return "dashboard";
};

const AdminPage: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const activeTab = normalizeTabFromPath(location.pathname);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedService, setSelectedService] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const selectedContactCloseRef = useRef<HTMLButtonElement | null>(null);
  const selectedContactFocusReturnRef = useRef<HTMLElement | null>(null);

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
    if (!currentUser) {
      setContacts([]);
      return;
    }

    let cancelled = false;

    const fetchSupabaseContacts = async () => {
      try {
        const contactsData = await getContactSubmissions();
        if (!cancelled) {
          setContacts(contactsData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching contacts from Supabase:", err);
        }
      }
    };

    fetchSupabaseContacts();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!edgeSyncEnabled || !currentUser || !session || isLocalEnvironment()) return;

    let cancelled = false;

    const fetchProtectedContacts = async () => {
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` };
        if (supabaseAnonKey) {
          headers.apikey = supabaseAnonKey;
        }
        const response = await fetch(`${BASE}/contact-submissions?limit=50&offset=0`, { headers });
        if (!response.ok) {
          throw new Error(`Request failed (${response.status}): ${response.statusText}`);
        }
        const backend = await response.json();
        if (cancelled) return;
        const backendList = toContactList(backend);
        setContacts((prev) => dedupeByIdentity([...prev, ...backendList]));
      } catch (err) {
        if (!cancelled && edgeSyncEnabled) {
          console.warn("Protected backend sync failed for calendar; using Supabase only", err);
          logAdminWarning("calendar.sync_fallback_supabase", { reason: String(err) });
        }
      }
    };

    fetchProtectedContacts();

    return () => {
      cancelled = true;
    };
  }, [currentUser, session]);

  useEffect(() => {
    if (!selectedContact) return;

    selectedContactFocusReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      selectedContactCloseRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedContact(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      selectedContactFocusReturnRef.current?.focus();
    };
  }, [selectedContact]);

  const parseDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return null;
    try {
      // Parse YYYY-MM-DD explicitly as local time to avoid timezone and locale ambiguities
      let year: number | undefined, month: number | undefined, day: number | undefined;
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        year = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10) - 1; // 0-based
        day = parseInt(isoMatch[3], 10);
      }

      let hour = 0;
      let minute = 0;
      if (timeStr) {
        const m = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i);
        if (m) {
          hour = parseInt(m[1], 10);
          minute = parseInt(m[2] || "0", 10);
          const ampm = m[3].toUpperCase();
          if (ampm === "PM" && hour < 12) hour += 12;
          if (ampm === "AM" && hour === 12) hour = 0;
        }
      }

      const d = typeof year === 'number' ? new Date(year, month!, day!, hour, minute, 0, 0) : new Date(dateStr);
      if (!timeStr) return d; // all-day at local midnight
      return d;
    } catch {
      return dateStr ? new Date(dateStr) : null;
    }
  };

  const toGCalDateParam = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${y}${m}${day}T${hh}${mm}${ss}Z`;
  };

  const buildGoogleCalUrl = (c: Contact) => {
    const title = encodeURIComponent(`${c.service} - ${c.firstName} ${c.lastName}`);
    const details = encodeURIComponent(
      [
        c.email ? `Email: ${c.email}` : "",
        c.service_tier ? `Tier: ${c.service_tier}` : "",
        c.questions ? `Notes: ${c.questions}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const location = encodeURIComponent(c.location || "");

    const start = parseDateTime(c.date, c.time);
    if (!start) return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`;

    // If time provided, make 1 hour event; else all-day
    if (c.time) {
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const dates = `${toGCalDateParam(start)}/${toGCalDateParam(end)}`;
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    } else {
      const allDayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const allDayEnd = new Date(allDayStart.getTime() + 24 * 60 * 60 * 1000);
      const dates = `${toGCalDateParam(allDayStart).slice(0, 8)}/${toGCalDateParam(allDayEnd).slice(0, 8)}`;
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logAdminAction("auth.logout");
      window.location.href = ROUTES.admin.login;
    } catch (error) {
      console.error("Error logging out:", error);
      logAdminError("auth.logout_failed", { message: String(error) });
    }
  };

  const calendarEvents: CalendarEvent[] = contacts
    .map((contact) => {
      const start = parseDateTime(contact.date, contact.time) || (contact.date ? new Date(contact.date) : null);
      if (!start) return null;
      const end = contact.time ? new Date(start.getTime() + 60 * 60 * 1000) : start;
      return {
        title: `${contact.service} - ${contact.firstName} ${contact.lastName}`,
        start,
        end,
        resource: contact,
      } as CalendarEvent;
    })
    .filter(Boolean) as CalendarEvent[];

  const filteredEvents = calendarEvents.filter((event) => {
    const norm = (s?: string) => (s || "").toLowerCase().trim();
    const serviceMatch = selectedService === "All" || norm(event.resource.service) === norm(selectedService);
    const dateMatch = (!dateRange.start || event.start >= dateRange.start) && (!dateRange.end || event.end <= dateRange.end);
    const nameMatch = `${event.resource.firstName} ${event.resource.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    return serviceMatch && dateMatch && nameMatch;
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const upcomingEvents = [...filteredEvents]
    .filter((event) => event.end >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 8);

  const eventsThisWeek = filteredEvents.filter((event) => event.start >= weekStart && event.start <= weekEnd).length;
  const eventsThisMonth = filteredEvents.filter((event) => event.start >= monthStart && event.start <= monthEnd).length;

  const panelCopy: Record<Tab, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Track inquiries, service demand, and subscriber growth.",
    },
    calendar: {
      title: "Booking Calendar",
      subtitle: "Review sessions by date and open client details quickly.",
    },
    upload: {
      title: "Content Uploads",
      subtitle: "Manage images and update portfolio assets.",
    },
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );

  if (!currentUser) return <AdminLogin />;

  return (
    <AdminShellLayout
      title={panelCopy[activeTab].title}
      subtitle={panelCopy[activeTab].subtitle}
      activeNav={activeTab}
      onLogout={handleLogout}
    >
      {activeTab === "dashboard" && <AdminData />}

      {activeTab === "calendar" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        >
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Visible Bookings</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{filteredEvents.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">This Week</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{eventsThisWeek}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">This Month</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{eventsThisMonth}</p>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Service</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Services</option>
                  {Object.keys(serviceOptions).map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Search Name</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(280px,1fr)]">
            <div className="h-[500px] sm:h-[600px] lg:h-[700px]">
              <BigCalendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor={(event: CalendarEvent) => event.start}
                endAccessor={(event: CalendarEvent) => event.end}
                style={{ height: "100%" }}
                views={["month", "week", "day"]}
                tooltipAccessor={(event: CalendarEvent) => {
                  const contact = event.resource;
                  return `${contact.firstName} ${contact.lastName} • ${contact.service}`;
                }}
                eventPropGetter={(event: CalendarEvent) => {
                  const contact = event.resource;
                  const serviceColors: Record<string, string> = {
                    "Base Photoshoot": "#90EE90",
                    "Creative Photoshoot": "#ADD8E6",
                    "Event Photography": "#FFD700",
                    "Wedding Photography": "#FFB6C1",
                    "Prom / HOCO": "#D8BFD8",
                    "Grad Photoshoots": "#FFA07A",
                    Other: "#D3D3D3",
                  };

                  const backgroundColor = serviceColors[contact.service] || "#D3D3D3";
                  return {
                    style: {
                      backgroundColor,
                      borderRadius: "4px",
                      color: "#000",
                      border: "none",
                      padding: "2px",
                    },
                  };
                }}
                onSelectEvent={(event: CalendarEvent) => {
                  const contact = event.resource;
                  setSelectedContact(contact);
                }}
              />
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-700">Upcoming</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                  {upcomingEvents.length}
                </span>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming bookings in the current filter.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingEvents.map((event) => {
                    const contact = event.resource;
                    return (
                      <li key={`${contact.id}-${event.start.toISOString()}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedContact(contact)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:bg-gray-100"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="text-xs text-gray-600">{contact.service}</p>
                          <p className="mt-1 text-xs text-gray-500">{format(event.start, "EEE, MMM d • h:mm a")}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>
          </div>

          {selectedContact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative max-h-[90vh] w-full max-w-2xl overflow-x-hidden overflow-y-auto rounded-2xl bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="selected-contact-title"
              >
                <div className="sticky top-0 flex items-start justify-between border-b border-gray-200 bg-white p-4 sm:p-6">
                  <div>
                    <h3 id="selected-contact-title" className="text-xl font-bold text-gray-900 sm:text-2xl">
                      {selectedContact.service}
                    </h3>
                    <p className="mt-1 text-gray-600">
                      {selectedContact.firstName} {selectedContact.lastName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={selectedContact ? buildGoogleCalUrl(selectedContact) : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                    >
                      Add to Google Calendar
                    </a>
                    <button
                      ref={selectedContactCloseRef}
                      onClick={() => setSelectedContact(null)}
                      aria-label="Close selected contact details"
                      className="rounded text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline">
                        {selectedContact.email}
                      </a>
                    </div>
                    {selectedContact.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <a href={`tel:${selectedContact.phone}`} className="text-blue-600 hover:underline">
                          {selectedContact.phone}
                        </a>
                      </div>
                    )}
                    {selectedContact.service_tier && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Service Tier</p>
                        <p className="text-gray-900">{selectedContact.service_tier}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-500">Occasion</p>
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-900">{selectedContact.occasion}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date</p>
                      <p className="text-gray-900">{selectedContact.date}</p>
                    </div>
                    {selectedContact.time && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Time</p>
                        <p className="text-gray-900">{selectedContact.time}</p>
                      </div>
                    )}
                    {selectedContact.location && (
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-900">{selectedContact.location}</p>
                      </div>
                    )}
                    {selectedContact.instagram && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Instagram</p>
                        <p className="break-words [overflow-wrap:anywhere] text-gray-900">{selectedContact.instagram}</p>
                      </div>
                    )}
                    {selectedContact.referralSource && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Referral Source</p>
                        <p className="break-words [overflow-wrap:anywhere] text-gray-900">{selectedContact.referralSource}</p>
                      </div>
                    )}
                  </div>
                  {selectedContact.add_ons && selectedContact.add_ons.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-500">Add-ons</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedContact.add_ons.map((addon: string, i: number) => (
                          <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                            {addon}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedContact.pinterestInspo &&
                    (() => {
                      const links = parseInspirationLinks(selectedContact.pinterestInspo).validUrls;
                      return (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Inspiration Links</p>
                          {links.length > 0 ? (
                            <ul className="ml-5 mt-1 list-disc space-y-1">
                              {links.map((link) => (
                                <li key={link}>
                                  <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 hover:underline">
                                    {link}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-900">
                              {selectedContact.pinterestInspo}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  {selectedContact.extra_questions && Object.keys(selectedContact.extra_questions).length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-sm font-medium text-gray-500">Extra Details</p>
                      <ul className="ml-5 mt-1 list-disc space-y-1 break-words [overflow-wrap:anywhere] text-gray-900">
                        {Object.entries(selectedContact.extra_questions).map(([key, value]) => (
                          <li key={key}>
                            {key
                              .replace(/([a-z])([A-Z])/g, "$1 $2")
                              .replace(/_/g, " ")
                              .replace(/^\w/, (c) => c.toUpperCase())}
                            : {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedContact.questions && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-500">Comments</p>
                      <p className="rounded-lg bg-gray-50 p-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-900">
                        {selectedContact.questions}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "upload" && <AdminUpload />}
    </AdminShellLayout>
  );
};

export default AdminPage;
