import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, TrendingUp, Users, Calendar, Mail, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase, supabaseAnonKey } from "../lib/supabase";
import { BASE, getContactSubmissions, getNewsletterSubscribers } from "../lib/services";
import { Contact } from "../utils";
import { serviceOptions } from "../utils";
import { dedupeByIdentity, isLocalEnvironment, toContactList, toSubscriberList, type AdminSubscriber } from "../utils/adminHelpers";
import type { Session } from "@supabase/supabase-js";

type DateFilterOption = "all" | "7days" | "30days" | "90days";
type Subscriber = AdminSubscriber;

const edgeSyncEnabled = (import.meta.env.VITE_ENABLE_EDGE_SYNC ?? "false") === "true";

const AdminData: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeTab, setActiveTab] = useState<"contacts" | "subscribers">("contacts");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [selectedService, setSelectedService] = useState<string>("All");
  const [session, setSession] = useState<Session | null>(null);

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
        }
      }
    };

    fetchProtectedData();

    return () => {
      cancelled = true;
    };
  }, [session]);

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

  const filteredContacts = filterByDate(
    contacts.filter((c) => {
      const matchesSearch = `${c.firstName} ${c.lastName} ${c.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const norm = (s?: string) => (s || "").toLowerCase().trim();
      const matchesService = selectedService === "All" || norm(c.service) === norm(selectedService);
      return matchesSearch && matchesService;
    })
  );

  const labelize = (key: string) => {
    const map: Record<string, string> = {
      peopleCount: "Number of people",
      parking: "Parking available",
      hours: "Estimated hours",
      indoorOutdoor: "Indoor/Outdoor",
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

  const exportToExcel = (data: Array<Record<string, string>>, filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleExportContacts = () => {
    const exportData = filteredContacts.map((c) => ({
      "Submitted At": formatDate(c.created_at),
      Name: `${c.firstName} ${c.lastName}`,
      Email: c.email,
      Service: c.service,
      Occasion: c.occasion || "N/A",
      Date: c.date || "N/A",
      Time: c.time || "N/A",
      Location: c.location || "N/A",
      Instagram: c.instagram || "N/A",
      "Referral Source": c.referralSource || "N/A",
      "Add-ons": c.add_ons?.join(", ") || "N/A",
      Questions: c.questions || "N/A",
    }));
    exportToExcel(exportData, "contacts-export");
  };

  const handleExportSubscribers = () => {
    const exportData = filteredSubscribers.map((s) => ({
      "Subscribed At": formatDate(s.created_at),
      Email: s.email,
    }));
    exportToExcel(exportData, "subscribers-export");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Contacts</p>
              <p className="text-3xl font-bold mt-2">{stats.totalContacts}</p>
            </div>
            <Users className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Recent (7 days)</p>
              <p className="text-3xl font-bold mt-2">{stats.recentContacts}</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Subscribers</p>
              <p className="text-3xl font-bold mt-2">{stats.totalSubscribers}</p>
            </div>
            <Mail className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Top Service</p>
              <p className="text-xl sm:text-2xl font-bold mt-2">{Object.entries(stats.serviceBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"}</p>
            </div>
            <Calendar className="w-12 h-12 opacity-80" />
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 sm:p-6">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "contacts" ? "bg-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("contacts")}
              >
                Contact Submissions
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === "subscribers" ? "bg-blue-600 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("subscribers")}
              >
                Subscribers
              </button>
            </div>

            <button
              onClick={() => (activeTab === "contacts" ? handleExportContacts() : handleExportSubscribers())}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export to Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>

          <div className="px-4 sm:px-6 pb-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {activeTab === "contacts" && (
                <div className="flex gap-3">
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Services</option>
                    {Object.keys(serviceOptions).map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "contacts" && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 sm:px-6 text-sm text-gray-900">{formatDate(c.created_at)}</td>
                      <td className="py-4 px-4 sm:px-6 text-sm font-medium text-gray-900">{`${c.firstName} ${c.lastName}`}</td>
                      <td className="py-4 px-4 sm:px-6 text-sm hidden sm:table-cell">
                        <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">
                          {c.email}
                        </a>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-sm">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{c.service}</span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-sm hidden lg:table-cell">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">View Details</summary>
                          <div className="mt-2 space-y-1 text-xs bg-gray-50 p-3 rounded-lg">
                            {c.service_tier && (
                              <p>
                                <strong>Tier:</strong> {c.service_tier}
                              </p>
                            )}
                            {c.location && (
                              <p>
                                <strong>Location:</strong> {c.location}
                              </p>
                            )}
                            {c.occasion && (
                              <p>
                                <strong>Occasion:</strong> {c.occasion}
                              </p>
                            )}
                            {c.date && (
                              <p>
                                <strong>Date:</strong> {c.date}
                              </p>
                            )}
                            {c.time && (
                              <p>
                                <strong>Time:</strong> {c.time}
                              </p>
                            )}
                            {c.instagram && (
                              <p>
                                <strong>Instagram:</strong> {c.instagram}
                              </p>
                            )}
                            {c.referralSource && (
                              <p>
                                <strong>Referral Source:</strong> {c.referralSource}
                              </p>
                            )}
                            {c.pinterestInspo && (
                              <p>
                                <strong>Pinterest:</strong> <a className="text-blue-600 hover:underline" href={c.pinterestInspo} target="_blank" rel="noopener noreferrer">View board</a>
                              </p>
                            )}
                            {c.add_ons?.length ? (
                              <div>
                                <strong>Add-ons:</strong> {c.add_ons.join(", ")}
                              </div>
                            ) : null}
                            {c.extra_questions && Object.keys(c.extra_questions).length > 0 && (
                              <div>
                                <strong>Extra Details:</strong>
                                <ul className="list-disc ml-5 mt-1">
                                  {Object.entries(c.extra_questions).map(([k, v]) => (
                                    <li key={k}>
                                      {labelize(k)}: {String(v)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {c.questions && (
                              <p>
                                <strong>Questions:</strong> {c.questions}
                              </p>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "subscribers" && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 sm:px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 sm:px-6 text-sm text-gray-900">{formatDate(s.created_at)}</td>
                      <td className="py-4 px-4 sm:px-6 text-sm">
                        <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline">
                          {s.email}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {((activeTab === "contacts" && filteredContacts.length === 0) || (activeTab === "subscribers" && filteredSubscribers.length === 0)) && (
              <div className="text-center py-12">
                <p className="text-gray-500">No data found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminData;
