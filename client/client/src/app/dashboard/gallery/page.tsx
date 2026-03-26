'use client';
import React, { useState } from 'react';

export default function AdminGalleryModeration() {
  const [photos, setPhotos] = useState([
    {
      id: '1',
      event: 'Sharma Wedding (Token: EVT-902)',
      url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500',
      author: 'Rahul',
      uploaded_at: '2026-11-14 19:45',
      ai_status: 'safe',
      ai_confidence: '98%',
      status: 'pending'
    },
    {
      id: '2',
      event: 'TechCorp Gala (Token: EVT-914)',
      url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500',
      author: 'Neha',
      uploaded_at: '2026-11-14 20:15',
      ai_status: 'safe',
      ai_confidence: '95%',
      status: 'pending'
    },
    {
      id: '3',
      event: 'TechCorp Gala (Token: EVT-914)',
      url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=500',
      author: 'Unknown',
      uploaded_at: '2026-11-14 20:30',
      ai_status: 'flagged',
      ai_confidence: '89%',
      status: 'pending',
      flag_reason: 'Potential Alcohol/NSFW detected'
    }
  ]);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setPhotos(photos.map(p => p.id === id ? { ...p, status: action } : p));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#fff' }}>Gallery Moderation</h1>
          <p style={{ margin: '0.2rem 0', color: '#8b9eb5' }}>Review guest uploads. Powered by Featherless.ai SafeFilter.</p>
        </div>
        <div style={styles.statsRow}>
          <div style={styles.statBadge}>
            <span style={{ color: '#8b9eb5' }}>Pending</span>
            <strong style={{ color: '#FCD34D', fontSize: '1.2rem' }}>{photos.filter(p => p.status === 'pending').length}</strong>
          </div>
          <div style={styles.statBadge}>
            <span style={{ color: '#8b9eb5' }}>Flagged by AI</span>
            <strong style={{ color: '#ff4d4d', fontSize: '1.2rem' }}>{photos.filter(p => p.ai_status === 'flagged' && p.status === 'pending').length}</strong>
          </div>
        </div>
      </header>

      <div style={styles.grid}>
        {photos.map(photo => (
          <div key={photo.id} style={{ ...styles.card, opacity: photo.status !== 'pending' ? 0.5 : 1 }}>
            <div style={styles.imageWrapper}>
              <img src={photo.url} alt="Guest Upload" style={styles.image} />
              {photo.ai_status === 'flagged' && (
                <div style={styles.flagOverlay}>
                  <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>warning</span>
                  <strong>AI FLAGGED</strong>
                </div>
              )}
            </div>
            
            <div style={styles.cardContent}>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#fff', display: 'block' }}>{photo.event}</strong>
                <span style={{ color: '#8b9eb5', fontSize: '0.85rem' }}>By {photo.author} • {photo.uploaded_at}</span>
              </div>

              <div style={{ padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${photo.ai_status === 'flagged' ? 'rgba(255,77,77,0.3)' : 'rgba(22,211,154,0.3)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: photo.ai_status === 'flagged' ? '0.5rem' : '0' }}>
                  <span style={{ color: photo.ai_status === 'flagged' ? '#ff4d4d' : '#16D39A', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{photo.ai_status === 'flagged' ? 'gavel' : 'verified'}</span>
                    AI Assessment: {photo.ai_status.toUpperCase()}
                  </span>
                  <span style={{ color: '#8b9eb5', fontSize: '0.8rem' }}>{photo.ai_confidence} Confidence</span>
                </div>
                {photo.ai_status === 'flagged' && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#ff4d4d' }}>Reason: {photo.flag_reason}</p>
                )}
              </div>

              {photo.status === 'pending' ? (
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button onClick={() => handleAction(photo.id, 'approve')} style={styles.btnApprove}>Approve</button>
                  <button onClick={() => handleAction(photo.id, 'reject')} style={styles.btnReject}>Reject</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.8rem', color: photo.status === 'approve' ? '#16D39A' : '#ff4d4d', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  {photo.status === 'approve' ? 'APPROVED' : 'REJECTED'}
                </div>
              )}
            </div>
          </div>
        ))}
        {photos.length === 0 && (
           <p style={{ color: '#8b9eb5', gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>No pending photos for moderation.</p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    minHeight: '100vh',
    color: '#fff',
    fontFamily: "'Inter', sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  statsRow: {
    display: 'flex',
    gap: '1.5rem'
  },
  statBadge: {
    backgroundColor: '#131A20',
    padding: '0.8rem 1.5rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.3rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: '#0B0F13',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  imageWrapper: {
    position: 'relative',
    height: '240px',
    width: '100%'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  flagOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255, 77, 77, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    gap: '0.5rem'
  },
  cardContent: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  btnApprove: {
    flex: 1,
    padding: '0.8rem',
    backgroundColor: 'rgba(22, 211, 154, 0.1)',
    color: '#16D39A',
    border: '1px solid rgba(22, 211, 154, 0.3)',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  btnReject: {
    flex: 1,
    padding: '0.8rem',
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    color: '#ff4d4d',
    border: '1px solid rgba(255, 77, 77, 0.3)',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
