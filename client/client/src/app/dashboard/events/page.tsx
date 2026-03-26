'use client';
import React, { useState, useEffect } from 'react';
import { financeAPI } from '@/services/api';
import styles from './page.module.css';

export default function EventsPage() {
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // New Event Form State
  const [formData, setFormData] = useState({
    party_name: '',
    client_name: '',
    client_phone: '',
    event_date: '',
    location: 'Grand Ballroom A',
    guest_count: 100,
    menu_tier: 'premium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await financeAPI.get('/events');
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateBooking = async () => {
    setIsSubmitting(true);
    try {
      await financeAPI.post('/events', {
        ...formData,
        addons_amount: 0,
        gst_percentage: 18,
        event_date: new Date(formData.event_date).toISOString(),
      });
      setShowNewBooking(false);
      fetchEvents(); // Refresh grid
    } catch (err) {
      console.error('Failed to create booking', err);
      alert('Failed to create booking. Please check console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derive summary metrics
  const confirmedCount = events.filter((e) => e.status === 'booked' || e.status === 'operating').length;
  const enquiryCount = events.filter((e) => e.status === 'enquiry').length;
  const totalRevenue = events.reduce((acc, e) => acc + (parseFloat(e.total_quoted_amount) || 0), 0);

  return (
    <div className={styles.eventsPage}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>Events & Bookings</h1>
          <p className={styles.subtitle}>Manage your banquet schedule and availability.</p>
        </div>
        {(userRole === 'event_manager' || userRole === 'admin') && (
          <button className={styles.btnPrimary} onClick={() => setShowNewBooking(true)}>
            <span className="material-symbols-outlined">add</span>
            New Booking
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Confirmed</span>
          <span className={styles.summaryValue}>{confirmedCount}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Pipeline Value</span>
          <span className={styles.summaryValue}>₹{totalRevenue.toLocaleString()}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Events</span>
          <span className={styles.summaryValue}>{events.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>New Enquiries</span>
          <span className={styles.summaryValue}>{enquiryCount}</span>
          {enquiryCount > 0 && <span className={styles.summaryBadge}>Action Req</span>}
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div style={{ color: '#fff', padding: '2rem' }}>Loading events...</div>
      ) : (
        <div className={styles.eventsGrid}>
          {events.map((event) => (
            <div key={event.id} className={styles.eventCard}>
              <div className={styles.eventCardTop}>
                <span className={`${styles.statusBadge} ${event.status === 'enquiry' ? styles.statusEnquiry : ''}`}>
                  {event.status.toUpperCase()}
                </span>
                <button className={styles.iconBtn}><span className="material-symbols-outlined">more_vert</span></button>
              </div>
              <h3>{event.party_name}</h3>
              <span className={styles.eventType}>{event.menu_tier?.toUpperCase()} TIER</span>

              <div className={styles.eventDetails}>
                <div className={styles.detailRow}>
                  <span className="material-symbols-outlined">person</span>
                  <span>{event.client_name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className="material-symbols-outlined">calendar_today</span>
                  <span>{new Date(event.event_date).toLocaleDateString()}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className="material-symbols-outlined">location_on</span>
                  <span>{event.location || 'Main Hall'}</span>
                </div>
              </div>
              <div className={styles.eventActions}>
                <button className={styles.btnGhost}>View Details</button>
                {event.status === 'enquiry' && <button className={styles.btnOutline}>Send Quote</button>}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div style={{ color: '#aaa', gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', backgroundColor: '#131A20', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              No events found. Start by creating a new booking enquiry.
            </div>
          )}
        </div>
      )}

      {/* New Booking Sliding Panel */}
      {showNewBooking && (
        <>
          <div className={styles.panelOverlay} onClick={() => setShowNewBooking(false)}></div>
          <div className={styles.bookingPanel}>
            <div className={styles.panelHeader}>
              <h2>New Booking Enquiry</h2>
              <button className={styles.iconBtn} onClick={() => setShowNewBooking(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.panelContent}>
              <div className={styles.formSection}>
                <h3>Section A: Contact Intelligence</h3>
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label>Party / Event Name</label>
                    <input type="text" name="party_name" className={styles.input} placeholder="e.g. Peterson Wedding" value={formData.party_name} onChange={handleInputChange} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Client Name</label>
                    <input type="text" name="client_name" className={styles.input} placeholder="John Doe" value={formData.client_name} onChange={handleInputChange} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Phone Number</label>
                    <input type="tel" name="client_phone" className={styles.input} placeholder="+91" value={formData.client_phone} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Section B: Space & Time</h3>
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label>Event Date</label>
                    <input type="datetime-local" name="event_date" className={styles.input} value={formData.event_date} onChange={handleInputChange} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Venue Preferred</label>
                    <select name="location" className={styles.input} value={formData.location} onChange={handleInputChange}>
                      <option value="Grand Ballroom A">Grand Ballroom A</option>
                      <option value="Skyline Suite">Skyline Suite</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Expected Pax</label>
                    <input type="number" name="guest_count" className={styles.input} placeholder="100" value={formData.guest_count} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>Section C: Gastronomy</h3>
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label>Menu Tier</label>
                    <select name="menu_tier" className={styles.input} value={formData.menu_tier} onChange={handleInputChange}>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="elite">Elite</option>
                    </select>
                  </div>
                </div>
                <div className={styles.financialSummary} style={{ marginTop: '1rem' }}>
                   <p style={{ fontSize: '0.85rem', color: '#8b9eb5' }}>
                     Pricing will be automatically calculated via the Financial AI engine upon initialization of the installment plan.
                   </p>
                </div>
              </div>
            </div>

            <div className={styles.panelFooter}>
              <button className={styles.btnGhost} onClick={() => setShowNewBooking(false)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={handleCreateBooking} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Enquiry'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
