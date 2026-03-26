'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard', roles: ['event_manager', 'finance_manager', 'admin', 'kitchen'] },
  { icon: 'calendar_month', label: 'Events', href: '/dashboard/events', roles: ['event_manager', 'admin', 'finance_manager'] },
  { icon: 'group', label: 'Clients', href: '/dashboard/clients', roles: ['event_manager', 'admin'] },
  { icon: 'restaurant_menu', label: 'Menu', href: '/dashboard/menu', roles: ['event_manager', 'admin'] },
  { icon: 'payments', label: 'Finance', href: '/dashboard/finance', roles: ['finance_manager', 'admin'] },
  { icon: 'person_check', label: 'GRE', href: '/gre', roles: ['gre', 'admin'] },
  { icon: 'restaurant', label: 'Kitchen KDS', href: '/dashboard/kitchen', roles: ['kitchen', 'admin'] },
  { icon: 'queue_music', label: 'DJ Booth', href: '/dashboard/dj', roles: ['dj', 'admin'] },
  { icon: 'chat', label: 'WhatsApp', href: '/dashboard/whatsapp', roles: ['event_manager', 'finance_manager', 'admin'] },
  { icon: 'analytics', label: 'Analytics', href: '/dashboard/analytics', roles: ['event_manager', 'finance_manager', 'admin'] },
  { icon: 'photo_library', label: 'Gallery Mod', href: '/dashboard/gallery', roles: ['event_manager', 'admin'] },
  { icon: 'settings', label: 'Settings', href: '/dashboard/settings', roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  const visibleItems = navItems.filter(item => 
    userRole ? item.roles.includes(userRole) : false
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <span className="material-symbols-outlined">spa</span>
        </div>
        <div className={styles.logoText}>
          <h1>IntelliManager</h1>
          <span>Premium Banquet Intelligence</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>
                {item.icon}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.userProfile}>
        <div className={styles.avatar}>
          <span>JD</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Julianne Deville</span>
          <span className={styles.userRole}>Senior Manager</span>
        </div>
      </div>
    </aside>
  );
}
