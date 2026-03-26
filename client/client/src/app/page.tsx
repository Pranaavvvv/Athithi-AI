import styles from './page.module.css';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* ── Navigation ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-outlined">spa</span>
            </div>
            <span className={styles.logoText}>IntelliManager</span>
          </div>
          <nav className={styles.headerNav}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#roles">Roles</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/auth" className={styles.btnGhost}>Sign In</Link>
            <Link href="/auth" className={styles.btnPrimary}>Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="material-symbols-outlined">verified</span>
            Built for the Hospitality Industry
          </div>
          <h1 className={styles.heroTitle}>
            Every Great Celebration,<br />
            <span className={styles.heroAccent}>Flawlessly Managed.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Unify your team, finances, guests, and analytics in one calm platform
            designed for the world&apos;s most prestigious banquet operations.
          </p>
          <div className={styles.heroActions}>
            <Link href="/auth" className={styles.btnPrimary}>
              <span className="material-symbols-outlined">rocket_launch</span>
              Start Free Trial
            </Link>
            <Link href="#features" className={styles.btnGhost}>
              <span className="material-symbols-outlined">play_circle</span>
              Watch Demo
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroBadgeStat}>
              <span className={styles.statIcon}>📅</span>
              <div>
                <strong>Upcoming</strong>
                <span>12 Events This Week</span>
              </div>
            </div>
            <div className={styles.heroBadgeStat}>
              <span className={styles.statIcon}>💰</span>
              <div>
                <strong>Revenue</strong>
                <span>₹4.2L Collected</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.dashboardPreview}>
            <div className={styles.previewHeader}>
              <div className={styles.previewDots}>
                <span></span><span></span><span></span>
              </div>
              <span className={styles.previewLabel}>Dashboard Preview</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewCard}>
                <span className={styles.previewCardLabel}>Events This Month</span>
                <span className={styles.previewCardValue}>18</span>
              </div>
              <div className={styles.previewCard}>
                <span className={styles.previewCardLabel}>Revenue</span>
                <span className={styles.previewCardValue}>₹12.4L</span>
              </div>
              <div className={styles.previewCard}>
                <span className={styles.previewCardLabel}>Guests Today</span>
                <span className={styles.previewCardValue}>240</span>
              </div>
              <div className={styles.previewChart}>
                <div className={styles.chartBar} style={{ height: '40%' }}></div>
                <div className={styles.chartBar} style={{ height: '65%' }}></div>
                <div className={styles.chartBar} style={{ height: '45%' }}></div>
                <div className={styles.chartBar} style={{ height: '80%' }}></div>
                <div className={styles.chartBar} style={{ height: '60%' }}></div>
                <div className={styles.chartBar} style={{ height: '90%' }}></div>
                <div className={styles.chartBar} style={{ height: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className={styles.features} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Precision in Every Detail</h2>
          <p className={styles.sectionSubtitle}>
            IntelliManager replaces fragmented tools with a singular, intelligent ecosystem.
          </p>
          <div className={styles.featuresGrid}>
            {[
              { icon: 'event_available', title: 'Booking Engine', desc: 'Centralized availability calendar with instant contract generation and digital sign-offs.' },
              { icon: 'restaurant', title: 'Smart Menu', desc: 'Dynamic dietary tracking and kitchen-sync technology for seamless service flow.' },
              { icon: 'account_balance', title: 'Finance Control', desc: 'Automated invoicing, payment tracking, and real-time P&L visibility per event.' },
              { icon: 'smartphone', title: 'GRE Mobile', desc: 'Dedicated mobile app for on-ground staff to manage guest check-ins and live requests.' },
              { icon: 'forum', title: 'WhatsApp Automation', desc: 'Automated guest notifications, reminders, and feedback surveys via WhatsApp.' },
              { icon: 'insights', title: 'Post-Event Analytics', desc: 'Granular insights into profitability, staff performance, and guest satisfaction scores.' },
            ].map((feature, idx) => (
              <div key={idx} className={`${styles.featureCard} animate-fade-in-up stagger-${idx + 1}`}>
                <div className={styles.featureIcon}>
                  <span className="material-symbols-outlined">{feature.icon}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles Section ── */}
      <section className={styles.roles} id="roles">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Built for the Entire Team</h2>
          <div className={styles.roleContent}>
            <div className={styles.roleCard}>
              <h3>Empower Your Sales Machine</h3>
              <p>
                Close deals faster with instant quote generation and real-time
                inventory visibility. Never double-book a hall again.
              </p>
              <ul className={styles.roleChecklist}>
                <li>
                  <span className="material-symbols-outlined icon-filled text-primary-color">check_circle</span>
                  1-Click Proposal Generation
                </li>
                <li>
                  <span className="material-symbols-outlined icon-filled text-primary-color">check_circle</span>
                  CRM with Automated Follow-ups
                </li>
                <li>
                  <span className="material-symbols-outlined icon-filled text-primary-color">check_circle</span>
                  Hall Availability Heatmaps
                </li>
              </ul>
            </div>
            <div className={styles.roleSocial}>
              <div className={styles.socialCard}>
                <span className={styles.socialNumber}>2,400+</span>
                <span className={styles.socialLabel}>Events Managed Successfully</span>
              </div>
              <div className={styles.socialCard}>
                <span className={styles.socialNumber}>₹48 Cr+</span>
                <span className={styles.socialLabel}>Revenue Processed To Date</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className={styles.cta}>
        <div className={styles.sectionInner}>
          <h2>Elevating Hospitality Intelligence</h2>
          <p>for the world&apos;s most demanding banquet teams.</p>
          <Link href="/auth" className={styles.btnPrimary}>
            <span className="material-symbols-outlined">rocket_launch</span>
            Get Started Today
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.logoGroup}>
              <div className={styles.logoIcon}>
                <span className="material-symbols-outlined">spa</span>
              </div>
              <span className={styles.logoText}>IntelliManager</span>
            </div>
            <p>Elevating Hospitality Intelligence with botanical precision and digital foresight.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#">Updates</a>
              <a href="#">API Docs</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Contact Support</a>
              <a href="#">Press Kit</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2024 IntelliManager. Elevating Hospitality Intelligence.</span>
        </div>
      </footer>
    </div>
  );
}
