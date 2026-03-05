import React, { useState, useEffect, useRef } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";

import { motion } from "framer-motion";
import { Upload, Users, Calendar as CalendarIcon, Image, LogOut, Menu, X } from "lucide-react";

import { supabase, supabaseAnonKey } from "../../lib/supabase";
import { BASE, getContactSubmissions } from "../../lib/api/services";
import { useAuth } from "../../contexts/AuthContext";
import AdminLogin from "../../components/admin/AdminLogin";
import AdminUpload from "../../components/admin/AdminUpload";
import AdminData from "../../components/admin/AdminData";
import { Contact, CalendarEvent, Tab } from "../../utils";
import { serviceOptions } from "../../utils";
import { dedupeByIdentity, isLocalEnvironment, toContactList } from "../../utils/admin/helpers";
import type { Session } from "@supabase/supabase-js";
import { logAdminAction, logAdminError, logAdminWarning } from "../../lib/observability/logger";


const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const edgeSyncEnabled = (import.meta.env.VITE_ENABLE_EDGE_SYNC ?? "false") === "true";

const AdminPage: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedService, setSelectedService] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      window.location.href = "/admin/login";
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

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );

  if (!currentUser) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h2>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden fixed top-4 right-4 z-50 bg-white p-2 rounded-lg shadow-lg">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div
            className={`${
              mobileMenuOpen ? "flex" : "hidden"
            } sm:flex flex-col sm:flex-row gap-2 sm:gap-3 fixed sm:relative top-16 sm:top-0 left-0 right-0 bg-white sm:bg-transparent p-4 sm:p-0 shadow-lg sm:shadow-none z-40`}
          >
            <a
              href="/"
              className="flex items-center justify-center sm:justify-start px-4 py-2.5 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-100"
            >
              Back to Site
            </a>
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center sm:justify-start px-4 py-2.5 rounded-lg transition-all duration-200 ${
                activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab("calendar");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center sm:justify-start px-4 py-2.5 rounded-lg transition-all duration-200 ${
                activeTab === "calendar" ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <CalendarIcon className="w-5 h-5 mr-2" />
              Calendar
            </button>
            <button
              onClick={() => {
                setActiveTab("upload");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center sm:justify-start px-4 py-2.5 rounded-lg transition-all duration-200 ${
                activeTab === "upload" ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload
            </button>
            <a
              href="/admin/gallery-manager"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center sm:justify-start px-4 py-2.5 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-100"
            >
              <Image className="w-5 h-5 mr-2" />
              Gallery Manager
            </a>
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center sm:justify-start px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {activeTab === "dashboard" && <AdminData />}

        {activeTab === "calendar" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value ? new Date(e.target.value) : null,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        end: e.target.value ? new Date(e.target.value) : null,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Name</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

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

            {selectedContact && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-y-auto overflow-x-hidden max-h-[90vh]"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="selected-contact-title"
                >
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex justify-between items-start">
                    <div>
                      <h3 id="selected-contact-title" className="text-xl sm:text-2xl font-bold text-gray-900">{selectedContact.service}</h3>
                      <p className="text-gray-600 mt-1">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={selectedContact ? buildGoogleCalUrl(selectedContact) : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        Add to Google Calendar
                      </a>
                      <button
                        ref={selectedContactCloseRef}
                        onClick={() => setSelectedContact(null)}
                        aria-label="Close selected contact details"
                        className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline">
                          {selectedContact.email}
                        </a>
                      </div>
                      {selectedContact.service_tier && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Service Tier</p>
                          <p className="text-gray-900">{selectedContact.service_tier}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500">Occasion</p>
                        <p className="text-gray-900 [overflow-wrap:anywhere] break-words whitespace-pre-wrap">{selectedContact.occasion}</p>
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
                          <p className="text-gray-900 [overflow-wrap:anywhere] break-words whitespace-pre-wrap">{selectedContact.location}</p>
                        </div>
                      )}
                      {selectedContact.instagram && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Instagram</p>
                          <p className="text-gray-900 [overflow-wrap:anywhere] break-words">{selectedContact.instagram}</p>
                        </div>
                      )}
                      {selectedContact.referralSource && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Referral Source</p>
                          <p className="text-gray-900 [overflow-wrap:anywhere] break-words">{selectedContact.referralSource}</p>
                        </div>
                      )}
                    </div>
                    {selectedContact.add_ons && selectedContact.add_ons.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Add-ons</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedContact.add_ons.map((addon: string, i: number) => (
                            <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                              {addon}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedContact.pinterestInspo && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Pinterest Board</p>
                        <a href={selectedContact.pinterestInspo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Inspiration Board
                        </a>
                      </div>
                    )}
                    {selectedContact.extra_questions && Object.keys(selectedContact.extra_questions).length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Extra Details</p>
                        <ul className="mt-1 list-disc ml-5 text-gray-900 space-y-1 [overflow-wrap:anywhere] break-words">
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
                        <p className="text-sm font-medium text-gray-500 mb-2">Comments</p>
                        <p className="text-gray-900 bg-gray-50 p-4 rounded-lg [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
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
      </div>
    </div>
  );
};

export default AdminPage;
