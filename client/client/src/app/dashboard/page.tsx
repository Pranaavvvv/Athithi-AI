import styles from './page.module.css';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Good Morning, Rajesh</h1>
          <p className={styles.greetingSub}>Here is what&apos;s happening at the Grand Regency today.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn}>
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className={styles.iconBtn}>
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Events This Month</span>
            <span className={`material-symbols-outlined ${styles.kpiIcon}`}>calendar_month</span>
          </div>
          <span className={styles.kpiValue}>18</span>
          <div className={styles.kpiTrend}>
            <span className={`material-symbols-outlined ${styles.trendUp}`}>trending_up</span>
            <span className={styles.trendUp}>+12% vs last month</span>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Revenue Collected</span>
            <span className={`material-symbols-outlined ${styles.kpiIcon}`}>payments</span>
          </div>
          <span className={styles.kpiValue}>₹12,40,000</span>
          <div className={styles.kpiTrend}>
            <span className={`material-symbols-outlined ${styles.trendUp}`}>check_circle</span>
            <span className={styles.trendUp}>On track</span>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Pending Payments</span>
            <span className={`material-symbols-outlined ${styles.kpiIcon}`}>account_balance</span>
          </div>
          <span className={styles.kpiValue}>₹3,20,000</span>
          <div className={styles.kpiTrend}>
            <span className={`material-symbols-outlined ${styles.trendWarn}`}>warning</span>
            <span className={styles.trendWarn}>4 Invoices overdue</span>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Guests Today</span>
            <span className={`material-symbols-outlined ${styles.kpiIcon}`}>group</span>
          </div>
          <span className={styles.kpiValue}>290</span>
          <div className={styles.kpiTrend}>
            <span className={`material-symbols-outlined ${styles.trendUp}`}>trending_up</span>
            <span className={styles.trendUp}>2 events active</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        {/* Upcoming Events */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Upcoming Events</h3>
            <Link href="/dashboard/events" className={styles.viewAll}>View All</Link>
          </div>
          <div className={styles.eventList}>
            {[
              { date: '24 Oct', day: 'Thursday', name: 'Kapoor Sangeet Night', venue: 'Grand Ballroom', pax: 150 },
              { date: '25 Oct', day: 'Friday', name: 'TechVision Corporate Meet', venue: 'Emerald Wing', pax: 80 },
              { date: '28 Oct', day: 'Monday', name: "Ananya's 1st Birthday", venue: 'Garden Terrace', pax: 200 },
              { date: '22 Oct', day: 'Tuesday', name: 'Modern Art Auction', venue: 'Grand Ballroom', pax: 120 },
            ].map((event, idx) => (
              <div key={idx} className={styles.eventRow}>
                <div className={styles.eventDate}>
                  <span className={styles.eventDateNum}>{event.date.split(' ')[0]}</span>
                  <span className={styles.eventDateMonth}>{event.date.split(' ')[1]}</span>
                  <span className={styles.eventDay}>{event.day}</span>
                </div>
                <div className={styles.eventInfo}>
                  <span className={styles.eventName}>{event.name}</span>
                  <span className={styles.eventMeta}>{event.venue} • {event.pax} Pax</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Today&apos;s Schedule</h3>
          </div>
          <div className={styles.scheduleList}>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleTime}>11:00 AM - 04:00 PM</span>
              <div className={styles.scheduleEvent}>
                <h4>Annual Educators Meet</h4>
                <span>Convention Center • 240 Guests</span>
              </div>
            </div>
            <div className={styles.scheduleItem}>
              <span className={styles.scheduleTime}>07:00 PM - 11:30 PM</span>
              <div className={styles.scheduleEvent}>
                <h4>Mehta Silver Jubilee</h4>
                <span>Terrace Lounge • 50 Guests</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Recent Activity Feed</h3>
          </div>
          <div className={styles.activityList}>
            {[
              { text: 'Payment of ₹2,50,000 received for Mehra Wedding', time: '14 minutes ago', dept: 'Finance Dept', icon: 'payments' },
              { text: 'Menu updated for Corp Gala 2024', time: '2 hours ago', dept: 'Executive Chef', icon: 'restaurant' },
              { text: 'New enquiry from Dr. Aditi Verma for Baby Shower', time: '5 hours ago', dept: 'Reception', icon: 'mail' },
            ].map((activity, idx) => (
              <div key={idx} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  <span className="material-symbols-outlined">{activity.icon}</span>
                </div>
                <div className={styles.activityContent}>
                  <p>{activity.text}</p>
                  <span>{activity.time} • {activity.dept}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Alerts */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              <span className="material-symbols-outlined text-error">error</span>
              Payment Alerts
            </h3>
          </div>
          <div className={styles.alertList}>
            <div className={styles.alertItem}>
              <div>
                <span className={styles.alertName}>Skyline Global Corp</span>
                <span className={styles.alertAmount}>₹85,000</span>
              </div>
              <span className={styles.alertBadge}>Overdue by 3 days</span>
            </div>
            <div className={styles.alertItem}>
              <div>
                <span className={styles.alertName}>Roy Engagement</span>
                <span className={styles.alertAmount}>₹1,20,000</span>
              </div>
              <span className={styles.alertBadge}>Overdue by 1 day</span>
            </div>
          </div>
        </div>

        {/* Booking Analytics Chart */}
        <div className={`${styles.card} ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h3>Booking Analytics</h3>
          </div>
          <div className={styles.chartArea}>
            <div className={styles.chartBars}>
              {[65, 80, 45, 90, 70, 55, 85, 60, 75, 95, 50, 72].map((h, i) => (
                <div key={i} className={styles.chartCol}>
                  <div className={styles.bar} style={{ height: `${h}%` }}></div>
                  <span className={styles.barLabel}>{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.dashFooter}>
        <span>© 2024 IntelliManager. Elevating Hospitality Intelligence.</span>
        <div className={styles.dashFooterLinks}>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
        </div>
      </div>
    </div>
  );
}
