'use client';
import React from 'react';
import styles from './page.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <div>
          <h1>Platform Settings</h1>
          <p className={styles.subtitle}>Configure IntelliManager preferences and team access.</p>
        </div>
        <button className={styles.btnPrimary}>Save Changes</button>
      </div>

      <div className={styles.settingsLayout}>
        <div className={styles.navMenu}>
          <button className={`${styles.navItem} ${styles.navActive}`}>
            <span className="material-symbols-outlined">domain</span> Venue Profile
          </button>
          <button className={styles.navItem}>
            <span className="material-symbols-outlined">group</span> Team & Roles
          </button>
          <button className={styles.navItem}>
            <span className="material-symbols-outlined">notifications</span> Notifications
          </button>
          <button className={styles.navItem}>
            <span className="material-symbols-outlined">integration_instructions</span> Integrations
          </button>
          <button className={styles.navItem}>
            <span className="material-symbols-outlined">security</span> Security
          </button>
        </div>

        <div className={styles.contentArea}>
          <div className={styles.card}>
            <h3>Venue Information</h3>
            <p className={styles.cardDesc}>Update your venue&apos;s public details and contact information.</p>

            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Venue Name</label>
                <input type="text" className={styles.input} defaultValue="Grand Regency Banquets" />
              </div>
              <div className={styles.inputGroup}>
                <label>Registration Number (GST/CIN)</label>
                <input type="text" className={styles.input} defaultValue="27AADCB2230M1Z4" />
              </div>
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label>Registered Address</label>
                <input type="text" className={styles.input} defaultValue="45, Linking Road, Santacruz West, Mumbai, 400054" />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Brand Assets</h3>
            <div className={styles.uploadArea}>
              <div className={styles.logoPreview}>
                <span className="material-symbols-outlined">spa</span>
              </div>
              <div className={styles.uploadInfo}>
                <strong>Venue Logo</strong>
                <p>Used on invoices, contracts, and guest portals. Recommended: 512x512px PNG.</p>
                <button className={styles.btnOutline}>Change Logo</button>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Platform Preferences</h3>
            <div className={styles.toggleList}>
              <div className={styles.toggleItem}>
                <div>
                  <strong>Strict Booking AI</strong>
                  <p>Prevent manual overrides on double-bookings (Red Zones).</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.toggleItem}>
                <div>
                  <strong>WhatsApp Auto-Replies</strong>
                  <p>Send automated AI responses to common venue queries outside business hours.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.toggleItem}>
                <div>
                  <strong>Dark Mode Standard</strong>
                  <p>Force "Verdant Intelligence" dark mode across all team dashboards.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
