/**
 * src/pages/AuthPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Ibn al-Hitham University Portal — Authentication Page
 *
 * After cookie-auth refactor:
 *  • login() returns an AuthUser (via /api/auth/me/)
 *  • Sign-in only: accounts are issued by university staff (no public sign-up)
 *  • This component passes the user up via onLoginSuccess
 *  • No tokens are ever handled in JS
 */

import { useState, useEffect, useCallback } from 'react';
import {
  login,
  type ParsedFieldErrors,
  type AuthUser,
} from '../api/auth';
import { ComingSoon } from '../components/ComingSoon';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FieldProps {
  icon: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  action?: { icon: string; onClick: () => void };
  autoComplete?: string;
}

// ─── SVG: Ibn al-Hitham Logo (optics/lens motif) ─────────────────────────────

function IbnLogo({ size = 44, inverted = false }: { size?: number; inverted?: boolean }) {
  const main  = inverted ? '#fff'                  : '#7c3aed';
  const sub   = inverted ? 'rgba(255,255,255,0.45)' : '#c4b5fd';
  const pupil = inverted ? '#1e1b4b'               : '#fff';
  const cx = size / 2, cy = size / 2, r = size * 0.44;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={r} stroke={main} strokeWidth="1" opacity="0.3" />
      <path
        d={`M${cx - r * 0.85},${cy} C${cx - r * 0.4},${cy - r * 0.55} ${cx + r * 0.4},${cy - r * 0.55} ${cx + r * 0.85},${cy} C${cx + r * 0.4},${cy + r * 0.55} ${cx - r * 0.4},${cy + r * 0.55} ${cx - r * 0.85},${cy}Z`}
        stroke={main}
        strokeWidth="1.6"
      />
      <circle cx={cx} cy={cy} r={r * 0.24} fill={main} opacity="0.85" />
      <circle cx={cx} cy={cy} r={r * 0.11} fill={pupil} />
      {[-60, -30, 0, 30, 60].map((a) => {
        const rad = (a * Math.PI) / 180;
        const sx  = cx + r * 0.9;
        return (
          <line key={a} x1={sx} y1={cy} x2={sx + r * 0.55 * Math.cos(rad)} y2={cy + r * 0.55 * Math.sin(rad)}
            stroke={sub} strokeWidth="1" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

// ─── SVG: Right-Panel Abstract Geometry ───────────────────────────────────────

function PanelArt() {
  const W = 520, H = 720;
  const dots: [number, number][] = [
    [80,95],[430,60],[470,210],[340,320],[110,400],[490,460],[200,580],[380,650],
  ];
  const edges: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]];

  const hexPts = Array.from({ length: 6 }, (_, k) => {
    const a = (k * Math.PI) / 3 - Math.PI / 6;
    return `${W - 90 + 55 * Math.cos(a)},${H - 100 + 55 * Math.sin(a)}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" fill="none">
      {[240, 180, 120].map((r, i) => (
        <circle key={i} cx={W - 60} cy={60} r={r} stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
      ))}
      {[200, 140].map((r, i) => (
        <circle key={`bl${i}`} cx={60} cy={H - 60} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <ellipse cx={W/2} cy={H/2} rx={170} ry={68} stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" />
      <ellipse cx={W/2} cy={H/2} rx={100} ry={38} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <circle  cx={W/2} cy={H/2} r={26}  stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)" />
      <circle  cx={W/2} cy={H/2} r={8}   fill="rgba(255,255,255,0.12)" />
      {[-55, -28, 0, 28, 55].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line key={`ray${i}`} x1={W/2 + 28} y1={H/2}
            x2={W/2 + 28 + 200 * Math.cos(rad)} y2={H/2 + 200 * Math.sin(rad)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        );
      })}
      {[0, 60, 120].map((offset, i) => (
        <line key={`dg${i}`} x1={offset} y1={0} x2={offset + W} y2={H}
          stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
      ))}
      {dots.map(([x, y], i) => (
        <circle key={`dot${i}`} cx={x} cy={y} r={2.2} fill="rgba(255,255,255,0.35)" />
      ))}
      {edges.map(([a, b], i) => (
        <line key={`cl${i}`} x1={dots[a][0]} y1={dots[a][1]} x2={dots[b][0]} y2={dots[b][1]}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      ))}
      <path d={`M${W*0.55} 0 A${W*0.55} ${W*0.55} 0 0 1 ${W} ${W*0.35}`}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <polygon points={hexPts} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </svg>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Field Input ──────────────────────────────────────────────────────────────

function Field({ icon, type = 'text', placeholder, value, onChange, error, action, autoComplete }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, pointerEvents: 'none',
          opacity: hasError ? 0.7 : focused ? 1 : 0.4,
          transition: 'opacity 0.2s',
        }}>
          {icon}
        </span>

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: action ? '11px 44px 11px 42px' : '11px 14px 11px 42px',
            borderRadius: 10,
            border: `1.5px solid ${hasError ? '#fca5a5' : focused ? '#7c3aed' : '#e8e3f8'}`,
            background: hasError ? '#fff5f5' : focused ? '#faf7ff' : '#f8f6ff',
            fontFamily: "'Sora', sans-serif",
            fontSize: 13,
            color: '#1e1b4b',
            outline: 'none',
            transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
            boxShadow: hasError
              ? '0 0 0 3px rgba(239,68,68,0.08)'
              : focused
              ? '0 0 0 3px rgba(124,58,237,0.1)'
              : 'none',
          }}
        />

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, opacity: 0.4, padding: 4,
            }}
          >
            {action.icon}
          </button>
        )}
      </div>

      {hasError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: '#dc2626',
          fontFamily: "'Sora', sans-serif",
          animation: 'fadeSlideIn 0.15s ease',
          paddingLeft: 4,
        }}>
          <span style={{ fontSize: 10, flexShrink: 0 }}>⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Form Label ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700,
      color: '#6d28d9', letterSpacing: '0.6px',
      marginBottom: 5, textTransform: 'uppercase',
      fontFamily: "'Sora', sans-serif",
    }}>
      {children}
    </label>
  );
}

// ─── General Error Banner (non-field errors) ──────────────────────────────────

function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 9,
      padding: '10px 13px',
      background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 10,
      fontSize: 12, color: '#991b1b', fontFamily: "'Sora', sans-serif",
      lineHeight: 1.5, animation: 'fadeSlideIn 0.2s ease',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
      {message}
    </div>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────

function PrimaryButton({
  loading,
  onClick,
  children,
}: {
  loading: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '12px', borderRadius: 10, border: 'none',
        background: loading ? '#a78bfa' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
        color: '#fff', fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.3px',
        boxShadow: loading ? 'none' : '0 4px 14px rgba(124,58,237,0.35)',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%',
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ─── Sign-In Form ─────────────────────────────────────────────────────────────

function SignInForm({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<ParsedFieldErrors>({ _general: '' });

  const handleSubmit = useCallback(async () => {
    setErrors({ _general: '' });

    if (!email.trim()) { setErrors({ _general: '', email: 'Email is required.' }); return; }
    if (!password)     { setErrors({ _general: '', password: 'Password is required.' }); return; }

    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      onSuccess(user);
    } catch (err) {
      setErrors(err as ParsedFieldErrors);
    } finally {
      setLoading(false);
    }
  }, [email, password, onSuccess]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onKeyDown={handleKey}>
      <div>
        <Label>Email address</Label>
        <Field
          icon="✉" type="email"
          placeholder="you@university.edu.eg"
          value={email} onChange={setEmail}
          error={errors.email}
          autoComplete="email"
        />
      </div>

      <div>
        <Label>Password</Label>
        <Field
          icon="🔒" type={showPass ? 'text' : 'password'}
          placeholder="••••••••••"
          value={password} onChange={setPassword}
          error={errors.password}
          action={{ icon: showPass ? '🙈' : '👁', onClick: () => setShowPass((s) => !s) }}
          autoComplete="current-password"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <ComingSoon>
            <button type="button" disabled aria-disabled="true" style={{
              background: 'none', border: 'none',
              fontSize: 11, color: '#cbd5e1', fontFamily: "'Sora', sans-serif", fontWeight: 600, padding: 0,
            }}>
              Forgot password?
            </button>
          </ComingSoon>
        </div>
      </div>

      <ErrorBanner message={errors._general} />

      <PrimaryButton loading={loading} onClick={handleSubmit}>
        {loading ? 'Signing in…' : 'Sign in to Portal'}
      </PrimaryButton>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#ede9fe' }} />
        <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: "'Sora',sans-serif" }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#ede9fe' }} />
      </div>

      <ComingSoon block placement="top">
        <button
          type="button"
          disabled
          aria-disabled="true"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: '#f1f5f9', color: '#94a3b8', fontFamily: "'Sora', sans-serif",
            fontSize: 12.5, fontWeight: 600, letterSpacing: '0.2px',
          }}
        >
          <span style={{ fontSize: 14, filter: 'grayscale(1)', opacity: 0.7 }}>🏛</span>
          University SSO Login
        </button>
      </ComingSoon>

      <p style={{ textAlign: 'center', fontSize: 11.5, color: '#94a3b8', fontFamily: "'Sora', sans-serif", margin: 0, lineHeight: 1.5 }}>
        Accounts are issued by the registrar's office.
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

interface AuthPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleSuccess = (user: AuthUser) => {
    onLoginSuccess(user);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp      { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes formIn      { from { opacity:0; transform:translateY(10px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(-4px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes float       { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-8px); } }

        .auth-page {
          display: flex;
          height: 100vh;
          min-height: 600px;
          opacity: 0;
          transition: opacity 0.5s ease;
          font-family: 'Sora', sans-serif;
        }
        .auth-page.visible { opacity: 1; }

        .auth-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          background: #ffffff;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }

        .auth-right {
          flex: 1.1;
          position: relative;
          background: linear-gradient(155deg, #2d1b69 0%, #1e1b4b 35%, #0f0a2e 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 56px 52px;
          overflow: hidden;
        }

        .form-inner { animation: formIn 0.25s ease forwards; }

        .info-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px; padding: 22px 24px;
          backdrop-filter: blur(8px);
          animation: float 5s ease-in-out infinite;
        }

        .stat-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
        }

        @media (max-width: 800px) {
          .auth-right { display: none; }
          .auth-left  { padding: 28px 24px; }
        }
      `}</style>

      <div className={`auth-page${visible ? ' visible' : ''}`}>

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="auth-left">

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            marginBottom: 32, animation: 'fadeUp 0.5s ease 0.1s both',
          }}>
            <IbnLogo size={52} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.3px' }}>
                Ibn al-Hitham
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>
                Student Portal
              </div>
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 0.5s ease 0.2s both' }}>

            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.5px' }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>
                Sign in to access your academic dashboard.
              </p>
            </div>

            <div className="form-inner">
              <SignInForm onSuccess={handleSuccess} />
            </div>
          </div>

          <div style={{
            marginTop: 32, fontSize: 10, color: '#cbd5e1', textAlign: 'center',
            animation: 'fadeUp 0.5s ease 0.4s both',
          }}>
            © 2026 AbdelRahman Tamer (BodaZLabZ). All rights reserved.
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="auth-right">
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <PanelArt />
          </div>

          <div style={{ position: 'relative', animation: 'fadeUp 0.6s ease 0.3s both' }}>
            <IbnLogo size={42} inverted />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginTop: 12 }}>
              Alexandria Faculty of Engineering
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(196,181,253,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 3 }}>
              Alexandria, Egypt · Est. 1942
            </div>
          </div>

          <div style={{ position: 'relative', animation: 'fadeUp 0.6s ease 0.4s both' }}>
            <h2 style={{
              fontSize: 32, fontWeight: 700, color: '#fff',
              lineHeight: 1.2, letterSpacing: '-0.8px', maxWidth: 340,
            }}>
              Where knowledge meets innovation.
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(196,181,253,0.75)', marginTop: 12, lineHeight: 1.65, maxWidth: 320 }}>
              Access your grades, assignments, schedules, and faculty resources — all in one
              unified portal built for the modern student.
            </p>

            <div className="info-card" style={{ marginTop: 28, maxWidth: 320 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(196,181,253,0.7)',
                letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10,
              }}>
                What you get access to
              </div>
              {[
                { icon: '📊', text: 'Live grade & exam results'      },
                { icon: '📅', text: 'Timetable & attendance tracker'  },
                { icon: '📚', text: 'Course materials & library'      },
                { icon: '🔔', text: 'Faculty announcements'           },
              ].map(({ icon, text }) => (
                <div key={text} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            position: 'relative',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            animation: 'fadeUp 0.6s ease 0.5s both',
          }}>
            {[
              { label: 'Students', value: '10,000+', icon: '🎓' },
              { label: 'Courses',  value: '670+',    icon: '📖' },
              { label: 'Teachers', value: '1,000+',  icon: '👨‍🏫' },
              { label: 'Alumni',   value: '180k+',   icon: '🌍' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="stat-chip">
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
                  }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(196,181,253,0.65)', marginTop: 2 }}>
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}