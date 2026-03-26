'use client';
import React, { useState, useEffect } from 'react';
import { financeAPI, opsAPI } from '@/services/api';
import styles from './page.module.css';

export default function FinancePage() {
  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UTR Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ ledger_id: '', utr_number: '', amount_paid: '' });

  // Vendor Bill Modal State
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({ vendor_name: '', bill_amount: '', description: '', bill_image: null as File | null });
  const [isUploadingBill, setIsUploadingBill] = useState(false);

  // FP Modal State
  const [showFpModal, setShowFpModal] = useState(false);
  const [fpContent, setFpContent] = useState('');
  const [isGeneratingFp, setIsGeneratingFp] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await financeAPI.get('/dashboard');
      setDashboardData(res.data);
      if (res.data.length > 0 && !selectedEventId) {
        handleSelectEvent(res.data[0].event_id);
      }
    } catch (err) {
      console.error('Error fetching finance dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    try {
      const res = await financeAPI.get(`/ledger/${eventId}`);
      setLedgerData(res.data);
    } catch (err: any) {
      console.error('Error fetching ledger', err);
      // Backend returns 404 if ledger not initialized
      setLedgerData([]);
    }
  };

  const handleInitPlan = async (eventId: string) => {
    try {
      await financeAPI.post('/init-plan', { event_id: eventId });
      handleSelectEvent(eventId);
      fetchDashboard();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to initialize plan';
      if (msg.includes('CSV')) alert('Cannot initialize plan: Please upload Menu CSV first via Menu endpoints.');
      else alert(msg);
    }
  };

  const handleConfirm = async (eventId: string) => {
    try {
      await financeAPI.post('/confirm', { event_id: eventId });
      alert('Event confirmed and BOOOKED successfully! WhatsApp PO sent.');
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to confirm. Fix pending deposits first.');
    }
  };

  const handleVerifyOpen = (ledgerId: string, amountDue: string) => {
    setVerifyForm({ ledger_id: ledgerId, utr_number: '', amount_paid: amountDue });
    setShowVerifyModal(true);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeAPI.patch('/verify-utr', {
        ledger_id: verifyForm.ledger_id,
        utr_number: verifyForm.utr_number,
        amount_paid: Number(verifyForm.amount_paid)
      });
      setShowVerifyModal(false);
      if (selectedEventId) handleSelectEvent(selectedEventId);
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'UTR Verification failed');
    }
  };

  const handleVendorBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setIsUploadingBill(true);
    const formData = new FormData();
    formData.append('event_id', selectedEventId);
    formData.append('vendor_name', billForm.vendor_name);
    formData.append('bill_amount', billForm.bill_amount);
    formData.append('description', billForm.description);
    if (billForm.bill_image) {
      formData.append('bill_image', billForm.bill_image);
    }

    try {
      const res = await opsAPI.post('/vendor-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.discrepancy_flag) {
        alert(`WARNING AI DISCREPANCY!\n\nYou claimed: ₹${billForm.bill_amount}\n${res.data.discrepancy_note}`);
      } else {
        alert(`Success! AI Fraud Guard verified exact amount: ₹${res.data.ai_verified_amount}`);
      }
      setShowBillModal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit vendor bill');
    } finally {
      setIsUploadingBill(false);
    }
  };

  const handleGenerateFp = async () => {
    if (!selectedEventId) return;
    setIsGeneratingFp(true);
    try {
      const res = await opsAPI.get(`/docs/generate-fp/${selectedEventId}`);
      if (res.data.success) {
        setFpContent(res.data.fp_content);
        setShowFpModal(true);
      } else {
         alert(res.data.message); // Shown when <70% revenue
      }
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate FP');
    } finally {
      setIsGeneratingFp(false);
    }
  };

  // Calculate Metrics
  const totalRevenue = dashboardData.reduce((acc, ev) => acc + (Number(ev.total_quoted) || 0), 0);
  const totalCollected = dashboardData.reduce((acc, ev) => acc + (Number(ev.total_paid) || 0), 0);
  const totalOutstanding = dashboardData.reduce((acc, ev) => acc + (Number(ev.total_due) || 0), 0);
  const collectedPct = totalRevenue ? (totalCollected / totalRevenue) * 100 : 0;
  const outstandingPct = totalRevenue ? (totalOutstanding / totalRevenue) * 100 : 0;

  const getStatusBadge = (status: string) => {
    if (status === 'enquiry') return styles.badgePending;
    if (status === 'booked' || status === 'operating') return styles.badgeWarn;
    return styles.badgeSuccess;
  };

  return (
    <div className={styles.financePage}>
      <div className={styles.header}>
        <div>
          <h1>Finance Manager</h1>
          <p className={styles.subtitle}>Oversee financial health with real-time tracking and AI verification.</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: '#fff', padding: '2rem' }}>Loading financial data...</div>
      ) : (
        <>
          {/* Revenue Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Pipeline Revenue</span>
              <span className={styles.metricValue}>₹ {totalRevenue.toLocaleString()}</span>
              <div className={`${styles.progressBar} ${styles.bgPrimary}`} style={{ width: '100%' }}></div>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Collected (Verified UTR)</span>
              <span className={styles.metricValue}>₹ {totalCollected.toLocaleString()}</span>
              <div className={`${styles.progressBar} ${styles.bgSecondary}`} style={{ width: `${Math.min(collectedPct, 100)}%` }}></div>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Outstanding Balance</span>
              <span className={styles.metricValue}>₹ {totalOutstanding.toLocaleString()}</span>
              <div className={`${styles.progressBar} ${styles.bgWarn}`} style={{ width: `${Math.min(outstandingPct, 100)}%` }}></div>
            </div>
          </div>

          <div className={styles.mainGrid}>
            {/* Payment Tracking (Events List) */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Payment Tracking</h3>
              </div>
              <div className={styles.trackingList}>
                {dashboardData.map((ev) => (
                  <div 
                    key={ev.event_id} 
                    className={styles.trackRow} 
                    style={{ cursor: 'pointer', backgroundColor: selectedEventId === ev.event_id ? 'rgba(255,255,255,0.05)' : '' }}
                    onClick={() => handleSelectEvent(ev.event_id)}
                  >
                    <div className={styles.trackInfo}>
                      <h4>{ev.party_name}</h4>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {ev.client_name} • {new Date(ev.event_date).toLocaleDateString()} • {ev.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                        <span className={getStatusBadge(ev.status)}>
                        {ev.total_due > 0 ? (ev.total_paid > 0 ? 'Partial' : 'Pending') : 'Paid'}
                        </span>
                    </div>
                  </div>
                ))}
                {dashboardData.length === 0 && <span style={{color: '#aaa', padding: '1rem'}}>No events in the pipeline.</span>}
              </div>
            </div>

            {/* Right Column: Ledger / Installment Planner */}
            <div className={styles.sideCol}>
               {/* ACTION HUB for the active event */}
               <div className={styles.card} style={{ border: '1px solid rgba(22, 211, 154, 0.3)', backgroundColor: 'rgba(22, 211, 154, 0.02)' }}>
                  <div className={styles.cardHeader}>
                    <h3 style={{ color: '#16D39A' }}><span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}>hub</span> Operations Hub</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {(userRole === 'finance_manager' || userRole === 'admin') && (
                      <button 
                         className={styles.btnPrimary} 
                         disabled={!selectedEventId}
                         onClick={() => handleConfirm(selectedEventId!)}
                         style={{ flex: 1 }}
                      >
                        Confirm Booking
                      </button>
                    )}
                    <button 
                       className={styles.btnGhost} 
                       disabled={!selectedEventId || isGeneratingFp}
                       onClick={handleGenerateFp}
                       style={{ flex: 1, border: '1px solid #16D39A', color: '#16D39A' }}
                    >
                      {isGeneratingFp ? 'Generating...' : 'Generate AI FP'}
                    </button>
                    <button 
                       className={styles.btnGhost} 
                       disabled={!selectedEventId}
                       onClick={() => setShowBillModal(true)}
                       style={{ width: '100%', marginTop: '0.5rem', border: '1px solid #FCD34D', color: '#FCD34D' }}
                    >
                      <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.3rem', fontSize: '1.2rem' }}>receipt_long</span>
                      Submit Vendor Bill (AI Fraud Guard)
                    </button>
                  </div>
               </div>

              <div className={styles.card}>
                <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Ledger Details</h3>
                </div>
                
                {!selectedEventId && <p style={{ padding: '1rem', color: '#aaa' }}>Select an event to view planner.</p>}
                
                {selectedEventId && ledgerData.length === 0 && (
                   <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                     <p style={{ color: '#aaa', marginBottom: '1rem' }}>No installment plan found for this enquiry.</p>
                     <button className={styles.btnPrimary} onClick={() => handleInitPlan(selectedEventId)}>
                       Initialize 30/40/30 Plan
                     </button>
                   </div>
                )}

                {selectedEventId && ledgerData.length > 0 && (
                  <div className={styles.timeline}>
                    {ledgerData.map((entry) => (
                       <div key={entry.id} className={`${styles.timelineNode} ${entry.payment_status === 'verified' ? styles.nodeComplete : styles.nodeActive}`}>
                         <div className={styles.nodeDot}></div>
                         <div className={styles.nodeContent} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                           <div>
                             <strong>{entry.milestone.replace('_', ' ').toUpperCase()} ({entry.percentage}%)</strong>
                             <span>Due: {new Date(entry.due_date).toLocaleDateString()}</span>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                             <div style={{ fontWeight: 600, color: entry.payment_status === 'verified' ? '#4ade80' : '#fff' }}>
                               ₹ {entry.amount_due}
                             </div>
                             {entry.payment_status === 'verified' ? (
                               <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Verified: {entry.utr_number}</span>
                             ) : (
                               (userRole === 'finance_manager' || userRole === 'admin') && (
                                 <button 
                                   onClick={() => handleVerifyOpen(entry.id, entry.amount_due)}
                                   style={{ background: 'transparent', border: '1px solid #16D39A', color: '#16D39A', borderRadius: '4px', padding: '0.1rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.2rem' }}
                                 >
                                   Verify UTR
                                 </button>
                               )
                             )}
                           </div>
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automated Reminders */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3><span className="material-symbols-outlined text-primary-color" style={{ fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '0.5rem', color: '#16D39A' }}>notifications_active</span> AI Reminders</h3>
                </div>
                <div className={styles.reminderList}>
                  <div className={styles.reminderItem}>
                    <span className={styles.remDate}>System Config</span>
                    <strong>Automated Scheduling Active</strong>
                    <p>Background CRON job is configured to automatically dispatch WhatsApp reminders 3 days before any outstanding milestone.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VERIFY UTR MODAL */}
      {showVerifyModal && (
         <>
           <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99 }} onClick={() => setShowVerifyModal(false)}></div>
           <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#131A20', padding: '2rem', borderRadius: '12px', zIndex: 100, width: '400px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ marginBottom: '1rem', color: '#fff' }}>Record Payment (UTR)</h2>
              <form onSubmit={handleVerifySubmit}>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b9eb5', fontSize: '0.9rem' }}>Bank UTR / Ref Number</label>
                   <input type="text" required value={verifyForm.utr_number} onChange={e => setVerifyForm({...verifyForm, utr_number: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#0B0F13', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b9eb5', fontSize: '0.9rem' }}>Amount Deposited</label>
                   <input type="number" required value={verifyForm.amount_paid} onChange={e => setVerifyForm({...verifyForm, amount_paid: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#0B0F13', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                   <button type="button" onClick={() => setShowVerifyModal(false)} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                   <button type="submit" style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', backgroundColor: '#16D39A', color: '#0B0F13', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Verify Payment</button>
                </div>
              </form>
           </div>
         </>
      )}

      {/* VENDOR BILL OCR MODAL */}
      {showBillModal && (
         <>
           <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99 }} onClick={() => setShowBillModal(false)}></div>
           <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#131A20', padding: '2rem', borderRadius: '12px', zIndex: 100, width: '450px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ marginBottom: '0.5rem', color: '#FCD34D' }}><span className="material-symbols-outlined" style={{ verticalAlign: 'middle' }}>document_scanner</span> AI Fraud Guard OCR</h2>
              <p style={{ color: '#8b9eb5', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Upload the vendor invoice. Featherless.ai Vision will cross-verify the claimed amount against the physical receipt.</p>
              <form onSubmit={handleVendorBillSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b9eb5', fontSize: '0.9rem' }}>Vendor Name</label>
                   <input type="text" required value={billForm.vendor_name} onChange={e => setBillForm({...billForm, vendor_name: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#0B0F13', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b9eb5', fontSize: '0.9rem' }}>Amount Claimed</label>
                   <input type="number" required value={billForm.bill_amount} onChange={e => setBillForm({...billForm, bill_amount: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#0B0F13', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem', color: '#8b9eb5', fontSize: '0.9rem' }}>Invoice Image (Required for AI)</label>
                   <input type="file" required accept="image/*" onChange={e => setBillForm({...billForm, bill_image: e.target.files ? e.target.files[0] : null})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', backgroundColor: '#0B0F13', color: '#fff', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                   <button type="button" onClick={() => setShowBillModal(false)} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                   <button type="submit" disabled={isUploadingBill} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', backgroundColor: '#FCD34D', color: '#0B0F13', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                     {isUploadingBill ? 'Scanning...' : 'Verify Invoice'}
                   </button>
                </div>
              </form>
           </div>
         </>
      )}

      {/* SMART FP MODAL */}
      {showFpModal && (
         <>
           <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99 }} onClick={() => setShowFpModal(false)}></div>
           <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#131A20', padding: '2.5rem', borderRadius: '12px', zIndex: 100, width: '600px', maxHeight: '80vh', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#16D39A', margin: 0 }}><span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.3rem' }}>description</span> AI Function Prospectus</h2>
                <button onClick={() => setShowFpModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0B0F13', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {fpContent}
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button style={{ padding: '0.8rem 2rem', borderRadius: '8px', backgroundColor: '#16D39A', color: '#0B0F13', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined">send</span> Dispatch to Operations
                </button>
              </div>
           </div>
         </>
      )}

    </div>
  );
}
