'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const steps = [
  { num: 1, label: 'Venue Profile', icon: 'location_city' },
  { num: 2, label: 'Hall Setup', icon: 'meeting_room' },
  { num: 3, label: 'Team', icon: 'group' },
  { num: 4, label: 'WhatsApp', icon: 'chat' },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className={styles.onboarding}>
      {/* Sidebar Progress */}
      <div className={styles.progressPanel}>
        <div className={styles.logoGroup}>
          <div className={styles.logoIcon}>
            <span className="material-symbols-outlined">spa</span>
          </div>
          <span className={styles.logoText}>IntelliManager</span>
        </div>

        <div className={styles.stepList}>
          {steps.map((step) => (
            <button
              key={step.num}
              className={`${styles.stepItem} ${currentStep === step.num ? styles.stepActive : ''} ${currentStep > step.num ? styles.stepDone : ''}`}
              onClick={() => setCurrentStep(step.num)}
            >
              <div className={styles.stepCircle}>
                {currentStep > step.num ? (
                  <span className="material-symbols-outlined icon-filled">check</span>
                ) : (
                  <span>{step.num}</span>
                )}
              </div>
              <div className={styles.stepInfo}>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepHint}>Step {step.num} of 4</span>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.insightQuote}>
          <span className="material-symbols-outlined">format_quote</span>
          <p>Premium venues with detailed hall capacities see a <strong>24% higher</strong> inquiry conversion rate.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainPanel}>
        <div className={styles.formArea}>
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <h1>Establish Your Domain</h1>
              <p className={styles.stepDesc}>
                Let&apos;s define the essence of your venue. This information will power your automated contracts, guest invitations, and kitchen work-orders.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Venue Name</label>
                  <input type="text" placeholder="e.g. Grand Regency Banquets" className={styles.input} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Business Type</label>
                  <select className={styles.input}>
                    <option>Banquet Hall</option>
                    <option>Hotel</option>
                    <option>Resort</option>
                    <option>Convention Center</option>
                  </select>
                </div>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label>Address</label>
                  <input type="text" placeholder="Full venue address" className={styles.input} />
                </div>
                <div className={styles.inputGroup}>
                  <label>City</label>
                  <input type="text" placeholder="City" className={styles.input} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Contact Phone</label>
                  <input type="tel" placeholder="+91 XXXXX XXXXX" className={styles.input} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <h1>Configure Your Halls</h1>
              <p className={styles.stepDesc}>Define each hall with its capacity, type, and amenities for smart booking conflict detection.</p>
              <div className={styles.hallCards}>
                {[
                  { name: 'Grand Ballroom A', cap: 500, type: 'Indoor' },
                  { name: 'Skyline Suite', cap: 200, type: 'Indoor' },
                  { name: 'Garden Terrace', cap: 300, type: 'Outdoor' },
                ].map((hall, idx) => (
                  <div key={idx} className={styles.hallCard}>
                    <div className={styles.hallHeader}>
                      <span className="material-symbols-outlined">meeting_room</span>
                      <h3>{hall.name}</h3>
                    </div>
                    <div className={styles.hallMeta}>
                      <span><span className="material-symbols-outlined">group</span> {hall.cap} Pax</span>
                      <span className={styles.hallBadge}>{hall.type}</span>
                    </div>
                  </div>
                ))}
                <button className={styles.addHallBtn}>
                  <span className="material-symbols-outlined">add</span>
                  Add Another Hall
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <h1>Team Management</h1>
              <p className={styles.stepDesc}>Invite your department heads to the platform.</p>
              <div className={styles.teamGrid}>
                {[
                  { role: 'General Manager', email: '', icon: 'admin_panel_settings' },
                  { role: 'Sales Head', email: '', icon: 'trending_up' },
                  { role: 'Executive Chef', email: '', icon: 'restaurant' },
                  { role: 'Finance Manager', email: '', icon: 'account_balance' },
                ].map((member, idx) => (
                  <div key={idx} className={styles.teamCard}>
                    <div className={styles.teamIcon}>
                      <span className="material-symbols-outlined">{member.icon}</span>
                    </div>
                    <span className={styles.teamRole}>{member.role}</span>
                    <input type="email" placeholder="Email address" className={styles.input} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <h1>WhatsApp Connection</h1>
              <p className={styles.stepDesc}>Connect WhatsApp for automated guest notifications, reminders, and feedback surveys.</p>
              <div className={styles.whatsappCard}>
                <div className={styles.whatsappIcon}>
                  <span className="material-symbols-outlined">chat</span>
                </div>
                <h3>Automated guest notifications</h3>
                <p>Connect your WhatsApp Business API to enable booking confirmations, event reminders, and post-event feedback messages.</p>
                <button className={styles.connectBtn}>
                  <span className="material-symbols-outlined">link</span>
                  Connect WhatsApp Business
                </button>
              </div>
              <div className={styles.launchNote}>
                <span className="material-symbols-outlined">info</span>
                By launching, you agree to our <strong>Terms of Excellence</strong> and <strong>Data Security</strong> protocols.
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className={styles.stepActions}>
            {currentStep > 1 && (
              <button className={styles.btnBack} onClick={() => setCurrentStep(currentStep - 1)}>
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {currentStep < 4 ? (
              <button className={styles.btnNext} onClick={() => setCurrentStep(currentStep + 1)}>
                Continue
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            ) : (
              <Link href="/dashboard" className={styles.btnNext}>
                <span className="material-symbols-outlined">rocket_launch</span>
                Launch IntelliManager
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.onboardingFooter}>
        <p>Elevating Hospitality Intelligence with botanical precision and digital foresight. © 2024 IntelliManager.</p>
        <div className={styles.onboardingFooterLinks}>
          <div>
            <h5>Resources</h5>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Documentation</a>
          </div>
          <div>
            <h5>Support</h5>
            <a href="#">Help Center</a>
            <a href="#">Contact Concierge</a>
            <a href="#">Service Status</a>
          </div>
        </div>
      </div>
    </div>
  );
}
