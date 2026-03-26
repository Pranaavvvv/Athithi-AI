'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function GuestGallery() {
  const params = useParams();
  const eventToken = params?.eventToken as string;

  // Mocking Live State
  const [photos, setPhotos] = useState<any[]>([
    { id: '1', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500', author: 'Rahul', time: '10 mins ago' },
    { id: '2', url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500', author: 'Neha', time: '15 mins ago' },
    { id: '3', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=500', author: 'Amit', time: '20 mins ago' },
  ]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    
    // Simulate File Uploading
    setTimeout(() => {
      const newPhoto = {
        id: Date.now().toString(),
        url: URL.createObjectURL(e.target.files![0]),
        author: 'You',
        time: 'Just now'
      };
      setPhotos([newPhoto, ...photos]);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span className="material-symbols-outlined" style={{ color: '#16D39A', fontSize: '2rem' }}>photo_library</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Event Snapshots</h1>
            <p style={{ margin: 0, color: '#8b9eb5', fontSize: '0.8rem' }}>Token: {eventToken}</p>
          </div>
        </div>
        
        <div>
          <input 
             type="file" 
             id="photo-upload" 
             accept="image/*" 
             style={{ display: 'none' }} 
             onChange={handleUpload}
          />
          <button 
            style={styles.uploadBtn} 
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Share Photo'}
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>add_a_photo</span>
          </button>
        </div>
      </header>

      <div style={styles.content}>
        <p style={{ textAlign: 'center', color: '#8b9eb5', marginBottom: '2rem' }}>
          Capture the memories! Photos uploaded here are shared with all guests and subject to Admin Moderation (Featherless AI SafeFilter).
        </p>

        <div style={styles.masonryGrid}>
          {photos.map(photo => (
            <div key={photo.id} style={styles.photoCard}>
              <img src={photo.url} alt="Guest Upload" style={styles.image} />
              <div style={styles.overlay}>
                 <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{photo.author}</span>
                 <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{photo.time}</span>
              </div>
            </div>
          ))}
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
  },
  header: {
    padding: '1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(5, 7, 10, 0.8)',
    backdropFilter: 'blur(10px)',
    zIndex: 10
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem'
  },
  uploadBtn: {
    backgroundColor: '#16D39A',
    color: '#000',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '24px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  masonryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  photoCard: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    aspectRatio: '3/4',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: '1rem',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    color: '#fff'
  }
};
