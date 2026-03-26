'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { liveAPI } from '@/services/api';

export default function DJDashboard() {
  const params = useParams();
  const eventToken = params?.eventToken as string;

  const [eventId, setEventId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [error, setError] = useState('');

  // 1. Fetch Event ID using the Public Token
  useEffect(() => {
    if (!eventToken) return;
    const initDJBoard = async () => {
      try {
        const baseUrl = liveAPI.defaults.baseURL?.replace('/live', '') || 'http://localhost:5555';
        const res = await fetch(`${baseUrl}/dj/${eventToken}`);
        if (!res.ok) throw new Error('Invalid or expired DJ link');
        const data = await res.json();
        setEventId(data?.event?.id ?? null);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize DJ board');
      }
    };
    initDJBoard();
  }, [eventToken]);

  // 2. Fetch Leaderboard & Connect WebSocket once Event ID is known
  useEffect(() => {
    if (!eventId) return;

    fetchLeaderboard();

    const wsUrl = process.env.NEXT_PUBLIC_WS_LIVE_URL || 'ws://localhost:5555';
    const ws = new WebSocket(`${wsUrl}?channel=dj:${eventId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'leaderboard_update') {
          fetchLeaderboard(); // refresh leaderboard
        } else if (data.type === 'now_playing') {
          setNowPlaying(data.song);
        }
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    return () => ws.close();
  }, [eventId]);

  const fetchLeaderboard = async () => {
    try {
      const res = await liveAPI.get(`/dj/${eventId}/leaderboard`);
      setLeaderboard(res.data?.leaderboard ?? []);
      setNowPlaying(res.data?.now_playing ?? null);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    }
  };

  const markAsPlaying = async (requestId: string, songObj: any) => {
    try {
      // Mark as "now playing" (kitchen/DJ flow typically transitions to played later).
      await liveAPI.patch(`/dj/playing/${requestId}`);
      setNowPlaying(songObj);
      fetchLeaderboard();
    } catch (err) {
      alert('Failed to mark as now playing');
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

  if (!eventId) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '1rem', color: '#16D39A' }}>Initializing Vibe-Sync Engine...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.pulsingDot}></div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Live DJ Action Board</h1>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#8b9eb5' }}>Event Token: {eventToken}</div>
      </header>

      <div style={styles.grid}>
        {/* Left Column: Now Playing */}
        <div style={styles.nowPlayingCard}>
          <h2 style={styles.cardTitle}>Now Playing</h2>
          {nowPlaying ? (
            <div style={styles.nowPlayingContent}>
               <div style={styles.discIcon}>
                 <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#16D39A' }}>album</span>
               </div>
              <h3 style={{ fontSize: '2rem', margin: '1rem 0 0.5rem 0' }}>{nowPlaying.song_name}</h3>
              <p style={{ fontSize: '1.2rem', color: '#8b9eb5', margin: 0 }}>{nowPlaying.artist_name || nowPlaying.requested_by}</p>
               
               <div style={styles.visualizer}>
                 <div style={styles.bar}></div><div style={styles.bar}></div><div style={styles.bar}></div>
                 <div style={styles.bar}></div><div style={styles.bar}></div>
               </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#555' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>queue_music</span>
              <p>Nothing currently playing. Select a track from the queue.</p>
            </div>
          )}
        </div>

        {/* Right Column: Leaderboard Queue */}
        <div style={styles.queueCard}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2 style={styles.cardTitle}>Guest Request Queue</h2>
             <span style={{ backgroundColor: 'rgba(22, 211, 154, 0.1)', color: '#16D39A', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>LIVE SYNC</span>
           </div>

           <div style={styles.queueList}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  Queue is empty. Guests haven't requested any songs yet!
                </div>
              ) : (
                leaderboard.map((song: any, index: number) => (
                  <div key={song.id} style={{ ...styles.queueItem, borderLeft: index === 0 ? '4px solid #16D39A' : 'none' }}>
                    <div style={styles.rankBadge}>{index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{song.song_name}</h4>
                      <span style={{ fontSize: '0.85rem', color: '#8b9eb5' }}>{song.artist_name || song.requested_by}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={styles.votePill}>
                         <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>favorite</span>
                         {song.upvotes}
                      </div>
                      <button 
                         style={styles.playBtn}
                         onClick={() => markAsPlaying(song.id, song)}
                      >
                        <span className="material-symbols-outlined">play_arrow</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
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
    marginBottom: '3rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '1.5rem'
  },
  pulsingDot: {
    width: '12px',
    height: '12px',
    backgroundColor: '#ff4d4d',
    borderRadius: '50%',
    boxShadow: '0 0 10px #ff4d4d'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '2rem',
    height: 'calc(100vh - 150px)'
  },
  nowPlayingCard: {
    backgroundColor: '#0B0F13',
    borderRadius: '24px',
    padding: '2.5rem',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  queueCard: {
    backgroundColor: '#0B0F13',
    borderRadius: '24px',
    padding: '2.5rem',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column'
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#8b9eb5',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    fontWeight: 500
  },
  nowPlayingContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  discIcon: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'rgba(22, 211, 154, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'spin 4s linear infinite',
  },
  visualizer: {
    display: 'flex',
    gap: '4px',
    alignItems: 'flex-end',
    height: '40px',
    marginTop: '2rem'
  },
  bar: {
    width: '6px',
    backgroundColor: '#16D39A',
    borderRadius: '3px',
    animation: 'bounce 1s ease-in-out infinite alternate',
    // We would ideally stagger the animations using class names, but inline style limits it.
    height: '100%'
  },
  queueList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  queueItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1.5rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    transition: 'transform 0.2s',
    gap: '1.5rem'
  },
  rankBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    color: '#8b9eb5'
  },
  votePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    color: '#ff4d4d',
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    fontWeight: 600
  },
  playBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#16D39A',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    cursor: 'pointer',
    transition: 'transform 0.1s'
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
    border: '3px solid rgba(22, 211, 154, 0.3)',
    borderTopColor: '#16D39A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
