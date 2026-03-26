'use client';
import React from 'react';
import styles from './page.module.css';

export default function WhatsAppPage() {
  return (
    <div className={styles.waPage}>
      <div className={styles.header}>
        <div>
          <h1>WhatsApp Comms</h1>
          <p className={styles.subtitle}>Manage banquet communications & templates</p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.templateCol}>
          <h3>Template Library</h3>
          <div className={styles.templateGrid}>
            {[
              { title: 'Purchase Order', desc: 'Formal procurement document for venue supplies and third-party vendors.' },
              { title: 'Function Prospectus', desc: 'Detailed event breakdown sent to client for final approval of the floor plan.' },
              { title: 'Payment Reminder', desc: 'Automatic follow-up for pending invoices or upcoming installments.' },
              { title: 'Booking Confirmation', desc: 'Welcome message sent once the initial deposit is verified and event is locked.' },
              { title: 'Event Day Reminder', desc: 'Last-minute check-in message for the host on the morning of the event.' },
              { title: 'Post-Event Thank You', desc: 'Feedback request and appreciation message sent 24 hours after completion.' }
            ].map((tpl, i) => (
              <div key={i} className={styles.templateCard}>
                <div className={styles.tplHeader}>
                  <span className="material-symbols-outlined">description</span>
                  <h4>{tpl.title}</h4>
                </div>
                <p>{tpl.desc}</p>
                <button className={styles.btnGhost}>Use Template</button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.composerCol}>
          <h3>Quick Composer</h3>
          <div className={styles.composerCard}>
            <div className={styles.composerTools}>
              <button className={styles.toolBtn}>
                <span className="material-symbols-outlined">database</span>
                Dynamic Variables
              </button>
            </div>
            <div className={styles.editor}>
              <p>Namaste <strong>{"{client_name}"}</strong>! 🙏</p>
              <br/>
              <p>We are thrilled to confirm your booking for the <strong>{"{event_name}"}</strong> scheduled for <strong>{"{event_date}"}</strong>.</p>
              <br/>
              <p>Our team is already preparing to make it spectacular. You can track all details in your dashboard link below.</p>
            </div>
            <div className={styles.composerFooter}>
              <button className={styles.btnOutline}>Cancel</button>
              <button className={styles.btnPrimary}>
                <span className="material-symbols-outlined">send</span> Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
