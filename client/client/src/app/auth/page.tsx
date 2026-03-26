'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/services/api';
import styles from './page.module.css';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Auth State
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('event_manager');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    // If the user already has a role in localStorage, check if they are still authenticated
    const checkAuth = async () => {
      try {
        const res = await authAPI.get('/users/dashboard');
        if (res.data.user) {
          const role = res.data.user.role;
          if (role === 'gre') {
            router.push('/gre');
          } else {
            router.push('/dashboard/events');
          }
        }
      } catch (err) {
        // Not authenticated, stay on login page
      }
    };
    checkAuth();
  }, [router]);

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSent(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      setEmailSent(false);
    }, 3000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      if (mode === 'login') {
        const res = await authAPI.post('/users/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userRole', res.data.user?.role || 'event_manager');
        
        // Redirect based on role
        if (res.data.user?.role === 'gre') {
          router.push('/gre');
        } else {
          router.push('/dashboard/events');
        }
      } else {
        const res = await authAPI.post('/users/register', { name, email, password, role });
        // Auto-login after registration
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userRole', res.data.user?.role || role);
        
        if (res.data.user?.role === 'gre') {
          router.push('/gre');
        } else {
          router.push('/dashboard/events');
        }
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.message === 'Already authenticated') {
        // If already authenticated, just redirect to dashboard
        const storedRole = localStorage.getItem('userRole') || 'event_manager';
        if (storedRole === 'gre') {
          router.push('/gre');
        } else {
          router.push('/dashboard/events');
        }
        return;
      }
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      {/* Left Panel — Branding */}
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-outlined">spa</span>
            </div>
            <span className={styles.logoText}>IntelliManager</span>
          </div>
          <div className={styles.brandHero}>
            <h1>Elevating<br />Hospitality<br /><span>Intelligence</span></h1>
            <p>Manage your banquet operations with botanical precision and digital foresight.</p>
          </div>
          <div className={styles.brandStats}>
            <div className={styles.brandStat}>
              <span className={styles.brandStatNum}>2,400+</span>
              <span className={styles.brandStatLabel}>Events Managed</span>
            </div>
            <div className={styles.brandStat}>
              <span className={styles.brandStatNum}>98%</span>
              <span className={styles.brandStatLabel}>Client Satisfaction</span>
            </div>
          </div>
          <div className={styles.botanicalDecor}>
            <div className={styles.leaf1}></div>
            <div className={styles.leaf2}></div>
            <div className={styles.leaf3}></div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className={styles.formSubtitle}>
            {mode === 'login'
              ? 'Access your banquet intelligence dashboard.'
              : 'Start managing your banquet operations today.'}
          </p>

          <form className={styles.form} onSubmit={handleAuth}>
            {errorMsg && (
              <div style={{ color: errorMsg.includes('success') ? '#4ade80' : '#ff4d4d', marginBottom: '1rem', fontSize: '0.9rem', padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                {errorMsg}
              </div>
            )}
            
            {mode === 'signup' && (
              <>
                <div className={styles.inputGroup}>
                  <label>Full Name</label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">person</span>
                    <input type="text" placeholder="Enter your full name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Role</label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">badge</span>
                    <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}>
                      <option value="event_manager">Event Manager / Sales Team</option>
                      <option value="finance_manager">Finance Manager (Gatekeeper)</option>
                      <option value="gre">GRE (Guest Relations Executive)</option>
                      <option value="kitchen">Kitchen / Operations Team</option>
                      <option value="dj">DJ / Live Artist</option>
                      <option value="admin">Admin / Moderator</option>
                      <option value="client">Client / Host</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className={styles.inputGroup}>
              <label>Email Address</label>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">mail</span>
                <input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Password</label>
              <div className={styles.inputWrapper}>
                <span className="material-symbols-outlined">lock</span>
                <input type="password" placeholder="Enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            {mode === 'login' && (
              <div className={styles.formOptions}>
                <label className={styles.checkbox}>
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={isLoading} className={styles.submitBtn} style={{ width: '100%', border: 'none', cursor: 'pointer' }}>
              <span className="material-symbols-outlined">login</span>
              {isLoading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>

            <div className={styles.divider}>
              <span>or continue with</span>
            </div>

            <div className={styles.socialBtns}>
              <button className={styles.socialBtn} type="button">
                <span className="material-symbols-outlined">g_translate</span>
                Google
              </button>
              <button className={styles.socialBtn} type="button">
                <span className="material-symbols-outlined">business</span>
                Microsoft
              </button>
            </div>
          </form>

          <p className={styles.toggleMode}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>

          <div className={styles.footerLinks}>
            <span>© 2024 IntelliManager</span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className={styles.modalOverlay} onClick={() => setShowForgotPassword(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {emailSent ? (
              <div className={styles.modalSuccess}>
                <div className={styles.successIcon}>
                  <span className="material-symbols-outlined icon-filled">check_circle</span>
                </div>
                <h4>Email Sent!</h4>
                <p>Check your inbox for a reset link. It might take a few minutes.</p>
              </div>
            ) : (
              <>
                <h3>Reset Password</h3>
                <p>Enter your email address and we&apos;ll send you a reset link.</p>
                <form onSubmit={handleForgotPassword}>
                  <div className={styles.inputGroup}>
                    <div className={styles.inputWrapper}>
                      <span className="material-symbols-outlined">mail</span>
                      <input type="email" placeholder="you@example.com" required />
                    </div>
                  </div>
                  <button type="submit" className={styles.submitBtn}>Send Reset Link</button>
                </form>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setShowForgotPassword(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
