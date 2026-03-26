import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
