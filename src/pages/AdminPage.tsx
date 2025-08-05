import React, { useState, useEffect } from 'react';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
} from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';


import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { motion } from 'framer-motion';
import {
  Upload,
  Users,
  Mail,
  Calendar as CalendarIcon,
  Download,
  LogOut,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdminLogin from '../components/AdminLogin';
import AdminUpload from '../components/AdminUpload';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DragAndDropCalendar = withDragAndDrop(BigCalendar);

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  service: string;
  occasion: string;
  date: string;
  time?: string;
  instagram?: string;
  location?: string;
  referralSource?: string;
  questions?: string;
  add_ons: string[];
  pinterestInspo?: string;
  created_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: Contact;
}

type Tab = 'dashboard' | 'upload' | 'calendar';
type DashboardTab = 'contacts' | 'subscribers';
const AdminPage: React.FC = () => {
  const { currentUser, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedService, setSelectedService] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
  if (!currentUser) return;
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const BASE_URL = 'https://photo-backend-5gnqa1tvp-ayos-projects-9c5c5522.vercel.app';
      // Get the Supabase access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const [contactsRes, subsRes] = await Promise.all([
        fetch(`${BASE_URL}/contact-form/contacts`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(`${BASE_URL}/newsletter/subscribers`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);

      const contactData: Contact[] = await contactsRes.json();
      const subscriberData: Subscriber[] = await subsRes.json();
      console.log("✅ Contacts:", contactData);
      console.log("✅ Subscribers:", subscriberData);

      setContacts(contactData);
      setSubscribers(subscriberData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [currentUser]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleExportContacts = () => {
    const exportData = contacts.map(contact => ({
      'Submitted At': new Date(contact.created_at).toLocaleString(),
      'First Name': contact.firstName,
      'Last Name': contact.lastName,
      Email: contact.email,
      Instagram: contact.instagram || 'N/A',
      Service: contact.service,
      Occasion: contact.occasion,
      'Booking Date': contact.date,
      'Booking Time': contact.time || 'N/A',
      Location: contact.location || 'N/A',
      'Referral Source': contact.referralSource || 'N/A',
      'Add-ons': contact.add_ons.join(', '),
      'Pinterest Board': contact.pinterestInspo || 'N/A',
      'Questions/Comments': contact.questions || 'N/A',
    }));
    exportToExcel(exportData, 'contacts-export');
  };

  const handleExportSubscribers = () => {
    const exportData = subscribers.map(subscriber => ({
      'Submitted At': new Date(subscriber.created_at).toLocaleString(),
      Email: subscriber.email,
    }));
    exportToExcel(exportData, 'subscribers-export');
  };

  const handleExportCalendarEvents = () => {
    const exportData = filteredEvents.map(event => {
      const contact = event.resource;
      return {
        'Booking Date': contact.date,
        'Booking Time': contact.time || 'N/A',
        'First Name': contact.firstName,
        'Last Name': contact.lastName,
        Email: contact.email,
        Service: contact.service,
        Occasion: contact.occasion,
        Location: contact.location || 'N/A',
        Instagram: contact.instagram || 'N/A',
        'Referral Source': contact.referralSource || 'N/A',
        'Add-ons': contact.add_ons.join(', '),
        'Pinterest Board': contact.pinterestInspo || 'N/A',
        'Questions/Comments': contact.questions || 'N/A',
      };
    });
    exportToExcel(exportData, 'calendar-events-export');
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  };

  const calendarEvents: CalendarEvent[] = contacts.map(contact => ({
    title: `${contact.service} - ${contact.firstName} ${contact.lastName}`,
    start: new Date(contact.date),
    end: new Date(contact.date),
    resource: contact,
  }));

  const filteredEvents = calendarEvents.filter(event => {
    const serviceMatch = selectedService === 'All' || event.resource.service === selectedService;
    const dateMatch =
      (!dateRange.start || event.start >= dateRange.start) &&
      (!dateRange.end || event.end <= dateRange.end);
    const nameMatch = `${event.resource.firstName} ${event.resource.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return serviceMatch && dateMatch && nameMatch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AdminLogin />;
  }
    return (
    <div className="container-custom py-20 mt-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-serif">Admin Dashboard</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-300 ${
              activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-primary hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-300 ${
              activeTab === 'calendar' ? 'bg-primary text-white' : 'text-primary hover:bg-gray-100'
            }`}
          >
            <CalendarIcon className="w-5 h-5 mr-2" />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-300 ${
              activeTab === 'upload' ? 'bg-primary text-white' : 'text-primary hover:bg-gray-100'
            }`}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Photos
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-300"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-[700px]"
        >
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div>
              <label className="mr-2 font-medium">Filter by Service:</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              >
                <option value="All">All</option>
                <option value="Wedding">Wedding</option>
                <option value="Portrait">Portrait</option>
                <option value="Event">Event</option>
                <option value="Branding">Branding</option>
              </select>
            </div>
            <div>
              <label className="mr-2 font-medium">Start Date:</label>
              <input
                type="date"
                onChange={(e) =>
                  setDateRange(prev => ({
                    ...prev,
                    start: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="mr-2 font-medium">End Date:</label>
              <input
                type="date"
                onChange={(e) =>
                  setDateRange(prev => ({
                    ...prev,
                    end: e.target.value ? new Date(e.target.value) : null,
                  }))
                }
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="mr-2 font-medium">Search by Name:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <button
              onClick={handleExportCalendarEvents}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
            >
              Export Calendar View
            </button>
          </div>           <DndProvider backend={HTML5Backend}>
            <DragAndDropCalendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor={(event: object) => new Date((event as CalendarEvent).start)}
              endAccessor={(event) => new Date((event as CalendarEvent).start)}
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              tooltipAccessor={(event) => {
  const contact = (event as CalendarEvent).resource;
  return `${contact.firstName} ${contact.lastName} • ${contact.service}`;
}}
              eventPropGetter={(event: object) => {
  const calendarEvent = event as CalendarEvent;
  const contact = calendarEvent.resource;

  const serviceColors: Record<string, string> = {
    Wedding: '#FFB6C1',
    Portrait: '#ADD8E6',
    Event: '#90EE90',
    Branding: '#FFD700',
    Other: '#D3D3D3',
  };

  const backgroundColor = serviceColors[contact.service] || '#D3D3D3';

  return {
    style: {
      backgroundColor,
      borderRadius: '4px',
      color: '#000',
      border: 'none',
      padding: '2px',
    },
  };
}}
              onSelectEvent={(event: object) => {
  const contact = (event as CalendarEvent).resource;
  setSelectedContact(contact);
}}
              onEventDrop={({ event, start }) => {
  const contact = (event as CalendarEvent).resource;
  const dateObj = start instanceof Date ? start : new Date(start);
  const updatedDate = dateObj.toISOString().split('T')[0];

  const updatedContacts = contacts.map(c =>
    c.id === contact.id ? { ...c, date: updatedDate } : c
  );
  setContacts(updatedContacts);
}}
            />
          </DndProvider>

          {selectedContact && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-lg w-full shadow-lg relative">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="text-xl font-semibold mb-4">
                  {selectedContact.service} Inquiry — {selectedContact.firstName} {selectedContact.lastName}
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> {selectedContact.email}</p>
                  <p><strong>Date:</strong> {selectedContact.date}</p>
                  {selectedContact.time && <p><strong>Time:</strong> {selectedContact.time}</p>}
                  {selectedContact.location && <p><strong>Location:</strong> {selectedContact.location}</p>}
                  {selectedContact.instagram && <p><strong>Instagram:</strong> {selectedContact.instagram}</p>}
                  {selectedContact.pinterestInspo && (
                    <p>
                      <strong>Pinterest:</strong>{' '}
                      <a href={selectedContact.pinterestInspo} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View Board
                      </a>
                    </p>
                  )}
                  {selectedContact.add_ons.length > 0 && (
                    <div>
                      <strong>Add-ons:</strong>
                      <ul className="list-disc ml-4">
                        {selectedContact.add_ons.map((addon, i) => (
                          <li key={i}>{addon}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedContact.questions && <p><strong>Comments:</strong> {selectedContact.questions}</p>}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
            {activeTab === 'dashboard' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="border-b border-accent flex justify-between items-center">
              <div>
                <button
                  className={`px-4 py-2 mr-4 ${dashboardTab === 'contacts' ? 'border-b-2 border-primary' : ''}`}
                  onClick={() => setDashboardTab('contacts')}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  Contact Submissions
                </button>
                <button
                  className={`px-4 py-2 ${dashboardTab === 'subscribers' ? 'border-b-2 border-primary' : ''}`}
                  onClick={() => setDashboardTab('subscribers')}
                >
                  <Mail className="w-4 h-4 inline-block mr-2" />
                  Newsletter Subscribers
                </button>
              </div>
              <button
                onClick={() =>
                  dashboardTab === 'contacts' ? handleExportContacts() : handleExportSubscribers()
                }
                className="flex items-center px-4 py-2 text-primary hover:bg-gray-100 rounded-lg transition-colors duration-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="loader"></div>
            </div>
          ) : (
            <>
              {dashboardTab === 'contacts' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-accent">
                        <th className="text-left py-2 px-4">Submitted At</th>
                        <th className="text-left py-2 px-4">Name</th>
                        <th className="text-left py-2 px-4">Email</th>
                        <th className="text-left py-2 px-4">Service</th>
                        <th className="text-left py-2 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map(contact => (
                        <tr key={contact.id} className="border-b border-accent hover:bg-gray-50">
                          <td className="py-2 px-4">{formatDate(contact.created_at)}</td>
                          <td className="py-2 px-4">{`${contact.firstName} ${contact.lastName}`}</td>
                          <td className="py-2 px-4">
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                              {contact.email}
                            </a>
                          </td>
                          <td className="py-2 px-4">{contact.service}</td>
                          <td className="py-2 px-4">
                            <details className="cursor-pointer">
                              <summary>View Details</summary>
                              <div className="mt-2 text-sm space-y-2">
                                {contact.instagram && (
                                  <div><strong>Instagram:</strong> {contact.instagram}</div>
                                )}
                                <div>
                                  <strong>Session Details:</strong>
                                  <ul className="ml-4 mt-1">
                                    <li><strong>Service Type:</strong> {contact.service}</li>
                                    <li><strong>Vision/Occasion:</strong> {contact.occasion}</li>
                                    {contact.location && (
                                      <li><strong>Desired Location:</strong> {contact.location}</li>
                                    )}
                                  </ul>
                                </div>
                                <div>
                                  <strong>Scheduling:</strong>
                                  <ul className="ml-4 mt-1">
                                    <li><strong>Date:</strong> {contact.date}</li>
                                    {contact.time && (
                                      <li><strong>Preferred Time:</strong> {contact.time}</li>
                                    )}
                                  </ul>
                                </div>
                                {contact.add_ons.length > 0 && (
                                  <div>
                                    <strong>Selected Add-ons:</strong>
                                    <ul className="list-disc ml-4 mt-1">
                                      {contact.add_ons.map((addon, i) => (
                                        <li key={i}>{addon}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {contact.pinterestInspo && (
                                  <div>
                                    <strong>Pinterest Board:</strong>{' '}
                                    <a
                                      href={contact.pinterestInspo}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      View Board
                                    </a>
                                  </div>
                                )}
                                {contact.referralSource && (
                                  <div><strong>Found Through:</strong> {contact.referralSource}</div>
                                )}
                                {contact.questions && (
                                  <div>
                                    <strong>Questions/Comments:</strong>
                                    <p className="mt-1">{contact.questions}</p>
                                  </div>
                                )}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dashboardTab === 'subscribers' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-accent">
                        <th className="text-left py-2 px-4">Submitted At</th>
                        <th className="text-left py-2 px-4">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map(subscriber => (
                        <tr key={subscriber.id} className="border-b border-accent hover:bg-gray-50">
                          <td className="py-2 px-4">{formatDate(subscriber.created_at)}</td>
                          <td className="py-2 px-4">
                            <a href={`mailto:${subscriber.email}`} className="text-primary hover:underline">
                              {subscriber.email}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AdminUpload />
        </motion.div>
      )}
    </div>
  );
};

export default AdminPage;