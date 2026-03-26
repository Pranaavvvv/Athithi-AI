'use client';
import React from 'react';
import styles from './page.module.css';

export default function ClientsPage() {
  return (
    <div className={styles.pageWrap}>
      <div className={styles.header}>
        <div>
          <h1>Client Directory</h1>
          <p className={styles.subtitle}>Manage your high-value relationships and guest profiles.</p>
        </div>
        <button className={styles.btnPrimary}>
          <span className="material-symbols-outlined">person_add</span>
          New Client
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Search by name, phone, or event..." />
        </div>
        <div className={styles.filters}>
          <button className={styles.btnOutline}>
            <span className="material-symbols-outlined">filter_list</span> Filter
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Contact Info</th>
              <th>Recent Event</th>
              <th>Total Value</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Sarah Peterson', phone: '+91 98XXX XXXXX', email: 'sarah.p@example.com', event: 'Wedding Reception', val: '₹ 8,45,000', status: 'Active' },
              { name: 'Marcus Chen', phone: '+91 97XXX XXXXX', email: 'm.chen@techcorp.com', event: 'TechCorp Summit', val: '₹ 12,20,000', status: 'Lead' },
              { name: 'Dr. Aditi Verma', phone: '+91 96XXX XXXXX', email: 'aditi.v@hospital.org', event: 'Baby Shower', val: '₹ 1,50,000', status: 'Upcoming' },
              { name: 'Rajesh Sharma', phone: '+91 99XXX XXXXX', email: 'r.sharma@biz.in', event: 'Sharma Wedding', val: '₹ 15,00,000', status: 'Completed' },
            ].map((client, idx) => (
              <tr key={idx}>
                <td>
                  <div className={styles.clientCell}>
                    <div className={styles.avatar}>{client.name.charAt(0)}</div>
                    <strong>{client.name}</strong>
                  </div>
                </td>
                <td>
                  <div className={styles.contactCell}>
                    <span>{client.phone}</span>
                    <span className={styles.muted}>{client.email}</span>
                  </div>
                </td>
                <td>{client.event}</td>
                <td className="font-data">{client.val}</td>
                <td>
                  <span className={`${styles.badge} ${
                    client.status === 'Active' ? styles.badgeActive :
                    client.status === 'Lead' ? styles.badgeLead :
                    client.status === 'Completed' ? styles.badgeCompleted : styles.badgeUpcoming
                  }`}>
                    {client.status}
                  </span>
                </td>
                <td>
                  <button className={styles.iconBtn}>
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
