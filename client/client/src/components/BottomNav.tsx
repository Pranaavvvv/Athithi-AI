'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';

const navItems = [
  { icon: 'home', label: 'Home', href: '/dashboard', roles: ['event_manager', 'finance_manager', 'admin', 'kitchen', 'dj'] },
  { icon: 'person', label: 'Guests', href: '/dashboard/clients', roles: ['event_manager', 'admin'] },
  { icon: 'event', label: 'Events', href: '/dashboard/events', roles: ['event_manager', 'admin', 'finance_manager'] },
  { icon: 'chat', label: 'WhatsApp', href: '/dashboard/whatsapp', roles: ['event_manager', 'finance_manager', 'admin'] },
  { icon: 'more_horiz', label: 'More', href: '/dashboard/settings', roles: ['admin'] },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  const visibleItems = navItems.filter(item => 
    userRole ? item.roles.includes(userRole) : false
  );

  return (
    <nav className={styles.bottomNav}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>
              {item.icon}
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
