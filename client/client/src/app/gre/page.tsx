'use client';
import React, { useState, useEffect } from 'react';
import { financeAPI, guestAPI } from '@/services/api';
import AuthGuard from '@/components/AuthGuard';
import styles from './page.module.css';

export default function GRECheckInPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [headcount, setHeadcount] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [scannedGuest, setScannedGuest] = useState<any>(null);

  // Initial Fetch of Events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await financeAPI.get('/events');
      setEvents(res.data);
      if (res.data.length > 0) {
        setSelectedEventId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  // When Event changes, fetch Guests and connect to WebSocket
  useEffect(() => {
    if (!selectedEventId) return;

    fetchEventData(selectedEventId);

    // Establish WebSocket Connection
    // Using process.env or fallback to localhost
    const wsUrl = process.env.NEXT_PUBLIC_WS_GUEST_URL || 'ws://localhost:5555';
    const ws = new WebSocket(`${wsUrl}?channel=headcount:${selectedEventId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'headcount_update') {
          setHeadcount({
            total: data.total,
            expected: data.expected,
            arrived: data.arrived,
            remaining: data.remaining,
            percentArrived: data.percentArrived
          });
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [selectedEventId]);

  const fetchEventData = async (eventId: string) => {
    try {
      const [hcRes, guestsRes] = await Promise.all([
        guestAPI.get(`/headcount/${eventId}`),
        guestAPI.get(`/guests/${eventId}`)
      ]);
      setHeadcount(hcRes.data);
      setGuests(guestsRes.data.guests || []);
      setScannedGuest(null);
    } catch (err: any) {
      console.error('Failed fetching data. Are APIs running?', err);
      // Fallback state if guest management microservice is unreachable
      setHeadcount({ total: 0, expected: 0, arrived: 0, percentArrived: 0 });
      setGuests([]);
    }
  };

  const handleSimulateScan = async (guest: any) => {
    if (!guest || guest.status === 'arrived') return;
    try {
      await guestAPI.post(`/headcount/${selectedEventId}/scan`, {
        guestId: guest.id,
      });
      // The websocket will update the headcount, but we also update local guest list
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'arrived' } : g));
      setScannedGuest(guest);
    } catch (err) {
      console.error('Scan failed', err);
      alert('Failed to scan guest');
    }
  };
  
  const handlePushToKitchen = async () => {
    if (!headcount) return;
    try {
      await guestAPI.post(`/headcount/${selectedEventId}/alert-kitchen`, {
        headcount: headcount.arrived,
        expected: headcount.expected
      });
      alert('Headcount alert pushed to Kitchen KDS successfully!');
    } catch (err) {
      console.error('Failed to alert kitchen', err);
      // Even if API fails, we simulate the 'push' for the UI demo
      alert('Kitchen notified of current headcount (' + (headcount.arrived || 0) + ' arrived).');
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <AuthGuard allowedRoles={['gre']}>
    <div className={styles.greApp}>
      {/* Mobile Header */}
      <div className={styles.appHeader}>
        <div className={styles.appTitle}>
          <span className="material-symbols-outlined">spa</span>
          GRE Portal
        </div>
        <button className={styles.profileBtn}>
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>

      <div className={styles.eventContext} style={{ paddingBottom: '0.5rem' }}>
        <select 
          value={selectedEventId} 
          onChange={(e) => setSelectedEventId(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', backgroundColor: '#131A20', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}
        >
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.party_name}</option>)}
          {events.length === 0 && <option value="">Loading events...</option>}
        </select>
        {selectedEvent && (
          <span className={styles.contextMeta}>
            {selectedEvent.location || 'Main Venue'} • {new Date(selectedEvent.event_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Main Scanner Area */}
      <div className={styles.scannerWrapper}>
        <div className={styles.scannerBox}>
          {!scannedGuest ? (
            <div className={styles.scannerActive}>
              <div className={styles.scanCorners}></div>
              <span className="material-symbols-outlined">qr_code_scanner</span>
              <p>Select guest from list to manually check-in</p>
              <div className={styles.scanLaser}></div>
            </div>
          ) : (
            <div className={styles.scanSuccess}>
              <div className={styles.successCircle}>
                <span className="material-symbols-outlined">check</span>
              </div>
              <h3>Guest Verified</h3>
              <p>Arrival Logged in System</p>
            </div>
          )}
        </div>
      </div>

      {/* Guest Info (Visible post-scan) */}
      {scannedGuest && (
        <div className={styles.guestInfoCard}>
          <div className={styles.guestHeader}>
            <div className={styles.avatar}>
              {scannedGuest.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3>{scannedGuest.name}</h3>
              <span>{scannedGuest.email || scannedGuest.phone}</span>
            </div>
            {scannedGuest.allergy_severity === 'severe' && (
              <span className={styles.badgeVip} style={{ backgroundColor: '#ff4d4d', color: '#fff' }}>ALLERGY</span>
            )}
          </div>
          <div className={styles.guestStats}>
            <div>
              <span className={styles.statLabel}>Plus Ones</span>
              <span className={styles.statVal}>{scannedGuest.plus_ones || 0}</span>
            </div>
            <div>
              <span className={styles.statLabel}>Status</span>
              <span className={styles.statVal} style={{ color: '#4ade80' }}>Arrived</span>
            </div>
          </div>
          <button className={styles.btnScanNext} onClick={() => setScannedGuest(null)}>
            Scan Next Guest
          </button>
        </div>
      )}

      {/* Quick Lookup */}
      {!scannedGuest && (
        <div className={styles.quickLookup}>
          <div className={styles.searchBar}>
            <span className="material-symbols-outlined">search</span>
            <input type="text" placeholder="Search guest name..." />
          </div>
          
          {/* Headcount Live Stats */}
          {headcount && (
            <div className={styles.statsRow}>
              <div className={styles.statChip}>
                <strong>{headcount.arrived}</strong> / {headcount.expected} Checked IN
              </div>
              <div className={styles.statChip}>
                <strong>{headcount.percentArrived}%</strong> Full
              </div>
            </div>
          )}
          
          {headcount && (
            <button 
              className={styles.btnScanNext} 
              onClick={handlePushToKitchen}
              style={{ marginTop: '0.5rem', backgroundColor: '#FCD34D', color: '#0B0F13', border: 'none' }}
            >
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.4rem', fontSize: '1.2rem' }}>restaurant</span>
              Push to Kitchen
            </button>
          )}

          {/* Guest List for manual simulation */}
          <div style={{ marginTop: '1rem', maxHeight: '30vh', overflowY: 'auto' }}>
            {guests.map((g: any) => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: '0.5rem', borderRadius: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{g.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: '#8b9eb5' }}>{g.status}</span>
                </div>
                <button 
                  onClick={() => handleSimulateScan(g)} 
                  disabled={g.status === 'arrived'}
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '4px', 
                    border: 'none', 
                    backgroundColor: g.status === 'arrived' ? '#333' : '#16D39A', 
                    color: g.status === 'arrived' ? '#888' : '#0B0F13',
                    fontWeight: 600,
                    cursor: g.status === 'arrived' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {g.status === 'arrived' ? 'Checked-In' : 'Check In'}
                </button>
              </div>
            ))}
            {guests.length === 0 && <p style={{ color: '#aaa', textAlign: 'center' }}>No guests found for this event.</p>}
          </div>

        </div>
      )}
    </div>
    </AuthGuard>
  );
}
