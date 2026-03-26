'use client';
import React, { useState, useEffect } from 'react';
import { emaAPI, financeAPI } from '@/services/api';

export default function EMADashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [opsData, setOpsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSourcing, setIsSourcing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchOpsData(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const res = await financeAPI.get('/events');
      const bookedEvents = res.data.filter((e: any) => e.status !== 'enquiry'); // AI sources for booked events
      setEvents(bookedEvents);
      if (bookedEvents.length > 0) {
        setSelectedEventId(bookedEvents[0].id || bookedEvents[0].event_id);
      }
    } catch (err) {
      console.error('Failed to fetch events for EMA', err);
    }
  };

  const fetchOpsData = async (eventId: string) => {
    setIsLoading(true);
    setOpsData(null);
    try {
      const res = await emaAPI.get(`/ops/${eventId}`);
      setOpsData(res.data);
    } catch (err) {
      console.error('Failed to fetch ops data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSource = async () => {
    if (!selectedEventId) return;
    setIsSourcing(true);
    try {
      await emaAPI.get(`/source-vendors?eventId=${selectedEventId}`);
      alert('AI Sourcing sequence triggered successfully (Featherless.ai backend running)');
      fetchOpsData(selectedEventId);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to trigger AI Sourcing');
    } finally {
      setIsSourcing(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
             <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#16D39A' }}>smart_toy</span>
             Event Manager Agent (EMA)
          </h1>
          <p style={styles.subtitle}>AI-Driven Vendor Sourcing & Operations Intelligence</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={styles.selectInput}
          >
            {events.map((ev) => (
              <option key={ev.id || ev.event_id} value={ev.id || ev.event_id}>
                {ev.party_name} ({new Date(ev.event_date).toLocaleDateString()})
              </option>
            ))}
            {events.length === 0 && <option value="">No Booked Events Found</option>}
          </select>
        </div>
      </header>

      <div style={styles.grid}>
        {/* Left Column: Vendor Recommendations */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
             <h2 style={styles.cardTitle}>Featherless.AI Vendor Ranker</h2>
             <button 
                style={isSourcing ? styles.btnDisabled : styles.btnPrimary} 
                onClick={handleManualSource}
                disabled={isSourcing || !selectedEventId}
             >
               {isSourcing ? 'AI is Thinking...' : 'Force Source Vendors'}
             </button>
          </div>

          <div style={styles.cardContent}>
             {isLoading ? (
               <div style={styles.loaderContainer}>
                 <span className="material-symbols-outlined" style={styles.spinningIcon}>sync</span>
                 <p>Analyzing Requirements...</p>
               </div>
             ) : opsData?.recommended_vendors && opsData.recommended_vendors.length > 0 ? (
               <div style={styles.vendorList}>
                 {opsData.recommended_vendors.map((v: any, idx: number) => (
                   <div key={idx} style={styles.vendorCard}>
                     <div style={styles.vendorTop}>
                       <h3 style={{ margin: 0 }}>{v.name}</h3>
                       <span style={styles.badgeScore}>{v.ai_match_score || 95}% Match</span>
                     </div>
                     <span style={styles.vendorCat}>{v.category.toUpperCase()}</span>
                     <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#8b9eb5' }}>
                       Budget: {v.budget_tier} • Rating: {v.rating}⭐
                     </p>
                     <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                       <button style={styles.btnAction}>Send RFP</button>
                       <button style={styles.btnActionOutline}>View Profile</button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div style={styles.emptyState}>
                 <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem' }}>robot_2</span>
                 <p>No vendors sourced yet. The automated AI worker polls every 30s for new bookings, or you can force a manual source.</p>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Operations Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={styles.card}>
             <h2 style={styles.cardTitle}>Event Brief</h2>
             {opsData?.event_details ? (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={styles.briefRow}>
                    <span>Client:</span> <strong>{opsData.event_details.client_name}</strong>
                  </div>
                  <div style={styles.briefRow}>
                    <span>Guest Count:</span> <strong>{opsData.event_details.guest_count}</strong>
                  </div>
                  <div style={styles.briefRow}>
                    <span>Menu Tier:</span> <strong>{opsData.event_details.menu_tier?.toUpperCase()}</strong>
                  </div>
                  <div style={styles.briefRow}>
                    <span>Total Quoted:</span> <strong>₹{opsData.event_details.total_quoted_amount}</strong>
                  </div>
                </div>
             ) : (
               <p style={{ color: '#8b9eb5', marginTop: '1rem' }}>Sourcing data...</p>
             )}
          </div>

          <div style={{ ...styles.card, flex: 1 }}>
             <h2 style={styles.cardTitle}>Logistics Timeline</h2>
             <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={styles.timelineItem}>
                   <div style={styles.tlDotComplete}></div>
                   <div>
                     <strong>Event Verified in Ledger</strong>
                     <span style={styles.tlSub}>Finance Manager approved the UTR</span>
                   </div>
                </div>
                <div style={styles.timelineItem}>
                   <div style={styles.tlDotComplete}></div>
                   <div>
                     <strong>AI Sourcing Initialized</strong>
                     <span style={styles.tlSub}>System analyzed event scale and tier</span>
                   </div>
                </div>
                <div style={styles.timelineItem}>
                   <div style={styles.tlDotActive}></div>
                   <div>
                     <strong>Vendor Selection Pending</strong>
                     <span style={styles.tlSub}>Awaiting Event Manager confirmation</span>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 600,
    color: '#fff'
  },
  subtitle: {
    margin: '0.2rem 0 0 0',
    color: '#8b9eb5',
    fontSize: '1rem'
  },
  selectInput: {
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    backgroundColor: '#131A20',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    minWidth: '250px',
    fontSize: '0.95rem'
  },
  btnPrimary: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#16D39A',
    color: '#0B0F13',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  },
  btnDisabled: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#333',
    color: '#888',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'not-allowed'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(500px, 1.5fr) 1fr',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: '#0B0F13',
    borderRadius: '16px',
    padding: '2rem',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#fff',
    fontWeight: 500
  },
  cardContent: {
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column'
  },
  loaderContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#16D39A'
  },
  spinningIcon: {
    fontSize: '3rem',
    animation: 'spin 1.5s linear infinite',
    marginBottom: '1rem'
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b9eb5',
    textAlign: 'center',
    padding: '0 2rem'
  },
  vendorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  vendorCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  vendorTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.3rem'
  },
  badgeScore: {
    backgroundColor: 'rgba(22, 211, 154, 0.1)',
    color: '#16D39A',
    padding: '0.3rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  vendorCat: {
    color: '#FCD34D',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  btnAction: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1C252E',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  btnActionOutline: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  briefRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    color: '#8b9eb5'
  },
  timelineItem: {
    display: 'flex',
    gap: '1rem'
  },
  tlDotComplete: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#16D39A',
    marginTop: '5px'
  },
  tlDotActive: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#FCD34D',
    boxShadow: '0 0 8px #FCD34D',
    marginTop: '5px'
  },
  tlSub: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#8b9eb5',
    marginTop: '0.2rem'
  }
};
