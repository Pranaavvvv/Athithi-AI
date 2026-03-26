'use client';
import React, { useState, useEffect } from 'react';
import { menuAPI } from '@/services/api';
import styles from './page.module.css';

export default function MenuPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await menuAPI.get('/tier-summary');
      setTiers(res.data);
    } catch (err) {
      console.error('Failed to fetch menu tiers', err);
      setTiers([]); // Could be 404 if no items exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace_existing', 'true');

    try {
      const res = await menuAPI.post('/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Success: ${res.data.items_loaded} items loaded!`);
      fetchTiers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'CSV Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.header}>
        <div>
          <h1>Gastronomy & Menus</h1>
          <p className={styles.subtitle}>Curate your exquisite culinary offerings and banquet packages.</p>
        </div>
        <div>
          <input 
             type="file" 
             id="csv-upload" 
             accept=".csv" 
             style={{ display: 'none' }} 
             onChange={handleFileUpload}
          />
          <button 
             className={styles.btnPrimary} 
             onClick={() => document.getElementById('csv-upload')?.click()}
             disabled={isUploading}
          >
            <span className="material-symbols-outlined">upload_file</span>
            {isUploading ? 'Uploading CSV...' : 'Upload Pricing CSV'}
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>Tier Summaries</button>
        <button className={styles.tab}>Live Counters</button>
        <button className={styles.tab}>Beverages</button>
      </div>

      {isLoading ? (
        <div style={{ color: '#fff', padding: '2rem' }}>Loading menu tiers...</div>
      ) : tiers.length === 0 ? (
        <div style={{ color: '#aaa', padding: '2rem', textAlign: 'center', backgroundColor: '#131A20', borderRadius: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem' }}>restaurant</span>
          <p>No menu data found in the database. Please upload your master Pricing CSV to generate tiers.</p>
        </div>
      ) : (
        <div className={styles.menuGrid}>
          {tiers.map((tier, idx) => (
            <div key={idx} className={styles.menuCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 style={{ textTransform: 'capitalize' }}>{tier.tier} Feast</h3>
                  <span className={styles.menuType}>{tier.tier.toUpperCase()} TIER</span>
                </div>
                <button className={styles.iconBtn}><span className="material-symbols-outlined">more_vert</span></button>
              </div>
              
              <div className={styles.priceRow}>
                <span className={styles.price}>₹ {Number(tier.base_rate_per_guest).toLocaleString()} / Pax</span>
                <span className={styles.badge}>{tier.total_items} Items</span>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.highlights}>
                <h4 style={{ marginBottom: '0.8rem', color: '#8b9eb5' }}>Category Breakdown</h4>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(tier.categories).map(([cat, val]: [string, any], i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ textTransform: 'capitalize', color: '#fff' }}>
                         <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.5rem', color: '#16D39A' }}>check_circle</span>
                         {cat}
                      </span>
                      <strong style={{ color: '#FCD34D' }}>₹{Number(val).toLocaleString()}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                 <button className={styles.btnGhost} style={{ width: '100%' }}>View Full Menu</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
