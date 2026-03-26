'use client';
import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const [isLoading, setIsLoading] = useState(true);

  // MOCK DATA (Fallback since Backend API doesn't exist)
  const [data, setData] = useState({
    menu_optimization: [
      { item: 'Live Sushi Boat', tier: 'Elite', requests: 450, wastage_pct: '2%', roi_score: 98 },
      { item: 'Shahi Tukda Bar', tier: 'Premium', requests: 380, wastage_pct: '5%', roi_score: 92 },
      { item: 'Standard Dal Makhani', tier: 'Standard', requests: 650, wastage_pct: '14%', roi_score: 85 },
      { item: 'Molecular Garnish', tier: 'Elite', requests: 80, wastage_pct: '32%', roi_score: 64 }, // High waste
    ],
    post_mortem: {
      total_lost_leads: 18,
      reasons: [
        { cause: 'Price Sensitive', count: 10, pct: '55%' },
        { cause: 'Date Unavailable (Overlap)', count: 5, pct: '28%' },
        { cause: 'Competitor Venue (Hall B)', count: 3, pct: '17%' },
      ],
      estimated_revenue_loss: '₹ 4,500,000'
    },
    synergy: [
      { date: '2026-11-14', events: ['Event ID: 902', 'Event ID: 914'], saving_opportunity: '₹ 45,000 Staff Pooling' },
      { date: '2026-12-05', events: ['Event ID: 940', 'Event ID: 941'], saving_opportunity: '₹ 80,000 Vendor Bulk Order (Flower Decor)' }
    ]
  });

  useEffect(() => {
    // Simulate API fetch to analytics service
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <div className={styles.pageWrap} style={{ padding: '2rem' }}>
      <header className={styles.header} style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#fff' }}>Strategic Audit Sandbox</h1>
          <p style={{ margin: '0.2rem 0', color: '#8b9eb5' }}>Post-event intelligence, menu optimization, and cancellation post-mortems.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: '#131A20', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>Export PDF</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
         <button onClick={() => setActiveTab('menu')} style={{ padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'menu' ? '2px solid #16D39A' : 'none', color: activeTab === 'menu' ? '#16D39A' : '#8b9eb5', cursor: 'pointer', fontWeight: 600 }}>Menu Optimization</button>
         <button onClick={() => setActiveTab('mortem')} style={{ padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'mortem' ? '2px solid #ff4d4d' : 'none', color: activeTab === 'mortem' ? '#fff' : '#8b9eb5', cursor: 'pointer', fontWeight: 600 }}>Cancellation Post-Mortem</button>
         <button onClick={() => setActiveTab('synergy')} style={{ padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'synergy' ? '2px solid #FCD34D' : 'none', color: activeTab === 'synergy' ? '#FCD34D' : '#8b9eb5', cursor: 'pointer', fontWeight: 600 }}>Operational Synergy</button>
      </div>

      {isLoading ? (
         <div style={{ textAlign: 'center', padding: '4rem', color: '#16D39A' }}>
           <span className="material-symbols-outlined" style={{ fontSize: '3rem', animation: 'spin 1.5s linear infinite' }}>analytics</span>
           <p>Aggregating strategic intelligence...</p>
         </div>
      ) : (
        <div style={{ minHeight: '600px' }}>
          
          {/* MENU OPTIMIZATION */}
          {activeTab === 'menu' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ backgroundColor: '#0B0F13', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff' }}>Highest ROI Dishes</h3>
                     {data.menu_optimization.map((item, idx) => (
                       <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: '0.5rem', borderRadius: '8px' }}>
                         <div>
                           <strong style={{ display: 'block', color: '#fff' }}>{item.item}</strong>
                           <span style={{ fontSize: '0.8rem', color: '#16D39A' }}>{item.tier} Tier</span>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                           <span style={{ display: 'block', color: '#FCD34D', fontWeight: 'bold' }}>ROI Score: {item.roi_score}</span>
                           <span style={{ fontSize: '0.8rem', color: '#8b9eb5' }}>Wastage: {item.wastage_pct}</span>
                         </div>
                       </div>
                     ))}
                  </div>
                  <div style={{ backgroundColor: '#0B0F13', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                     <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#ff4d4d', marginBottom: '1rem' }}>delete_sweep</span>
                     <h2 style={{ color: '#fff', margin: 0 }}>Action Required</h2>
                     <p style={{ color: '#8b9eb5', textAlign: 'center', maxWidth: '300px' }}>"Molecular Garnish" shows 32% food waste across the last 5 events. AI recommends dropping this from the Elite tier to save ₹120,000 annually.</p>
                     <button style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', backgroundColor: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '8px' }}>Refine Menu CSV</button>
                  </div>
                </div>
             </div>
          )}

          {/* CANCELLATION POST-MORTEM */}
          {activeTab === 'mortem' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ flex: 1, backgroundColor: '#0B0F13', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff4d4d' }}>Lost Pipeline Revenue</h3>
                     <h1 style={{ fontSize: '3rem', margin: '0 0 1.5rem 0', color: '#fff' }}>{data.post_mortem.estimated_revenue_loss}</h1>
                     <p style={{ color: '#8b9eb5' }}>Total <strong>{data.post_mortem.total_lost_leads}</strong> leads were lost at the "Temporary Enquiry" phase.</p>
                  </div>
                  <div style={{ flex: 2, backgroundColor: '#0B0F13', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff' }}>Root Cause Analysis</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                       {data.post_mortem.reasons.map((reason, idx) => (
                         <div key={idx}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                             <span style={{ color: '#fff' }}>{reason.cause}</span>
                             <strong style={{ color: '#8b9eb5' }}>{reason.count} Leads ({reason.pct})</strong>
                           </div>
                           <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                             <div style={{ width: reason.pct, height: '100%', backgroundColor: idx === 0 ? '#ff4d4d' : idx === 1 ? '#FCD34D' : '#3B82F6', borderRadius: '4px' }}></div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
             </div>
          )}

          {/* OPERATIONAL SYNERGY */}
          {activeTab === 'synergy' && (
             <div style={{ backgroundColor: '#0B0F13', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#FCD34D' }}>AI Scheduling Synergy</h3>
                <p style={{ color: '#8b9eb5', marginBottom: '2rem' }}>By running adjacent events on identical dates, operations can pool resources to massively slash overhead.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.synergy.map((syn, idx) => (
                     <div key={idx} style={{ padding: '1.5rem', border: '1px solid rgba(252, 211, 77, 0.3)', backgroundColor: 'rgba(252, 211, 77, 0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <strong style={{ color: '#fff', fontSize: '1.1rem', display: 'block' }}>Date: {new Date(syn.date).toLocaleDateString()}</strong>
                         <span style={{ color: '#8b9eb5', fontSize: '0.9rem' }}>Linked Bookings: {syn.events.join(' & ')}</span>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                         <span style={{ display: 'block', color: '#16D39A', fontWeight: 600, fontSize: '1.2rem' }}>+{syn.saving_opportunity}</span>
                         <button style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: '#FCD34D', cursor: 'pointer', textDecoration: 'underline' }}>View Aggregated PO</button>
                       </div>
                     </div>
                  ))}
                </div>
             </div>
          )}

        </div>
      )}
    </div>
  );
}
