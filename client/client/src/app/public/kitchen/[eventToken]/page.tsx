'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { liveAPI } from '@/services/api';

export default function KitchenDashboard() {
  const params = useParams();
  const eventToken = params?.eventToken as string;

  const [eventId, setEventId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeAllergies, setActiveAllergies] = useState<string[]>([]);
  const [error, setError] = useState('');

  // 1. Fetch Event ID
  useEffect(() => {
    if (!eventToken) return;
    const initBoard = async () => {
      try {
        const baseUrl = liveAPI.defaults.baseURL?.replace('/live', '') || 'http://localhost:5555';
        const res = await fetch(`${baseUrl}/kitchen/${eventToken}`);
        if (!res.ok) throw new Error('Invalid or expired Kitchen link');
        const data = await res.json();
        setEventId(data?.event?.id ?? null);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize Kitchen board');
      }
    };
    initBoard();
  }, [eventToken]);

  // 2. Fetch Dashboard & Connect WebSocket
  useEffect(() => {
    if (!eventId) return;

    fetchDashboard();

    const wsUrl = process.env.NEXT_PUBLIC_WS_LIVE_URL || 'ws://localhost:5555';
    const ws = new WebSocket(`${wsUrl}?channel=kitchen:${eventId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'allergy_alert') {
          const allergyText = data.dietaryPreferences
            ? `${data.guestName}: ${data.dietaryPreferences}`
            : `${data.guestName}`;
          setActiveAllergies(prev => [allergyText, ...prev].slice(0, 5));
          setAlerts(prev => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), message: data.message, level: 'warn' },
            ...prev
          ].slice(0, 5));
        } else if (data.type === 'kitchen_alert') {
          setAlerts(prev => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), message: data.message, level: 'warn' },
            ...prev
          ].slice(0, 5));
        } else if (data.type === 'course_started' || data.type === 'staff_notified') {
          setAlerts(prev => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), message: data.message, level: 'info' },
            ...prev
          ].slice(0, 5));
          fetchDashboard(); // refresh milestones
        }
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    return () => ws.close();
  }, [eventId]);

  const fetchDashboard = async () => {
    try {
      const res = await liveAPI.get(`/kitchen/${eventId}/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      console.error('Failed to fetch kitchen dashboard', err);
    }
  };

  const startMilestone = async (milestoneId: string) => {
    try {
      await liveAPI.patch(`/kitchen/milestone/${milestoneId}/start`);
      fetchDashboard(); // refresh after state transition
    } catch (err) {
      alert('Failed to start milestone');
    }
  };

  const notifyStaff = async (milestoneId: string) => {
    try {
      await liveAPI.patch(`/kitchen/milestone/${milestoneId}/notify`);
      fetchDashboard(); // refresh after state transition
    } catch (err) {
      alert('Failed to notify staff');
    }
  };

  if (error) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.errorBox}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ff4d4d' }}>error</span>
          <h2>Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!eventId || !dashboard) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '1rem', color: '#FCD34D' }}>Initializing Kitchen Intelligence...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#FCD34D' }}>restaurant_menu</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Kitchen Dispach System</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={styles.timeClock}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontSize: '0.9rem', color: '#8b9eb5' }}>Event: {eventToken.substring(0,8).toUpperCase()}</div>
        </div>
      </header>

      <div style={styles.grid}>
        {/* Left Column: Service Flow */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Service Flow & Milestones</h2>
          <div style={styles.milestoneList}>
            {dashboard.milestones?.map((course: any) => {
              const isStarted = Boolean(course.actual_start_time);
              const isNotified = Boolean(course.staff_notified);
              const status =
                !isStarted ? 'preparing' : !isNotified ? 'ready' : 'served';

              return (
              <div
                key={course.id}
                style={{ ...styles.courseRow, ...(status === 'preparing' ? styles.activeCourseBoard : {}) }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.2rem' }}>{course.course_name}</h3>
                  <span style={status === 'preparing' ? styles.statusPreparing : status === 'ready' ? styles.statusReady : styles.statusServed}>
                    {status.toUpperCase()}
                  </span>
                </div>
                
                <div style={styles.actions}>
                  {!isStarted && (
                    <button style={styles.btnAction} onClick={() => startMilestone(String(course.id))}>
                      Start Prep
                    </button>
                  )}
                  {isStarted && !isNotified && (
                    <button
                      style={{ ...styles.btnAction, backgroundColor: '#FCD34D', color: '#000' }}
                      onClick={() => notifyStaff(String(course.id))}
                    >
                      Mark Ready
                    </button>
                  )}
                  {isNotified && (
                    <span style={{ color: '#16D39A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="material-symbols-outlined">done_all</span> Completed
                    </span>
                  )}
                </div>
              </div>
              );
            })}
            {(!dashboard.milestones || dashboard.milestones.length === 0) && (
              <p style={{ color: '#8b9eb5' }}>No courses configured for this event.</p>
            )}
          </div>
        </div>

        {/* Right Column: Alerts and Allergies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ ...styles.card, borderLeft: '4px solid #ff4d4d' }}>
            <h2 style={{ ...styles.cardTitle, color: '#ff4d4d' }}>Critical Allergies</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {activeAllergies.map((allergy, idx) => (
                <span key={idx} style={styles.allergyBadge}>⚠️ {allergy.toUpperCase()}</span>
              ))}
              {activeAllergies.length === 0 && (
                <span style={{ color: '#8b9eb5' }}>No critical allergies reported.</span>
              )}
            </div>
          </div>

          <div style={{ ...styles.card, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={styles.cardTitle}>Live Ops Alerts</h2>
              <div style={styles.pulsingDot}></div>
            </div>
            
            <div style={styles.alertLog}>
              {alerts.length === 0 ? (
                <p style={{ color: '#555', textAlign: 'center', marginTop: '2rem' }}>Monitoring channel...</p>
              ) : (
                alerts.map(a => (
                  <div key={a.id} style={{ ...styles.alertRow, borderLeftColor: a.level === 'warn' ? '#FCD34D' : '#3B82F6' }}>
                    <span style={{ color: '#8b9eb5', fontSize: '0.8rem', minWidth: '70px' }}>{a.time}</span>
                    <strong style={{ color: '#fff' }}>{a.message}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#05070A',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    padding: '2rem 4rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '1rem'
  },
  timeClock: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '0.4rem 1rem',
    borderRadius: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(600px, 1.5fr) 1fr',
    gap: '1.5rem',
    height: 'calc(100vh - 120px)'
  },
  card: {
    backgroundColor: '#0B0F13',
    borderRadius: '16px',
    padding: '2rem',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#8b9eb5',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    fontWeight: 500
  },
  milestoneList: {
    marginTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto'
  },
  courseRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid transparent',
    transition: 'all 0.2s'
  },
  activeCourseBoard: {
    backgroundColor: 'rgba(252, 211, 77, 0.05)',
    border: '1px solid rgba(252, 211, 77, 0.3)',
  },
  statusPending: { color: '#8b9eb5', fontSize: '0.85rem', fontWeight: 600 },
  statusPreparing: { color: '#FCD34D', fontSize: '0.85rem', fontWeight: 600 },
  statusReady: { color: '#fff', fontSize: '0.85rem', fontWeight: 600, backgroundColor: '#FCD34D', padding: '0.2rem 0.6rem', borderRadius: '4px', color: '#000' },
  statusServed: { color: '#16D39A', fontSize: '0.85rem', fontWeight: 600 },
  actions: {
    display: 'flex',
    gap: '1rem'
  },
  btnAction: {
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1C252E',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.5px'
  },
  allergyBadge: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    color: '#ff4d4d',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem'
  },
  alertLog: {
    marginTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem'
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    borderLeft: '4px solid'
  },
  pulsingDot: {
    width: '10px',
    height: '10px',
    backgroundColor: '#FCD34D',
    borderRadius: '50%',
    boxShadow: '0 0 10px #FCD34D',
    animation: 'pulse 1.5s infinite running'
  },
  fullscreenCenter: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070A'
  },
  errorBox: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    border: '1px solid rgba(255, 77, 77, 0.3)',
    borderRadius: '16px',
    padding: '3rem',
    textAlign: 'center',
    color: '#fff'
  },
  loader: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(252, 211, 77, 0.3)',
    borderTopColor: '#FCD34D',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
