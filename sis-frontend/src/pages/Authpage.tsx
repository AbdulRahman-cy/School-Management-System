/**
 * src/pages/AuthPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Ibn al-Hitham University Portal — Authentication Page
 *
 * After cookie-auth refactor:
 *  • login()/register() return an AuthUser (via /api/auth/me/)
 *  • This component passes the user up via onLoginSuccess
 *  • No tokens are ever handled in JS
 */

import { useState, useEffect, useCallback } from 'react';
import {
  login,
  register,
  type ParsedFieldErrors,
  type UserRole,
  type AuthUser,
} from '../api/auth';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'signin' | 'register';

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

// ─── Role Selector ────────────────────────────────────────────────────────────

function RoleSelect({
  value,
  onChange,
  error,
}: {
  value: UserRole;
  onChange: (v: UserRole) => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none',
          opacity: focused ? 1 : 0.45,
        }}>🎓</span>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value as UserRole)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 38px 11px 42px', borderRadius: 10,
            border: `1.5px solid ${hasError ? '#fca5a5' : focused ? '#7c3aed' : '#e8e3f8'}`,
            background: focused ? '#faf7ff' : '#f8f6ff',
            fontFamily: "'Sora', sans-serif", fontSize: 13, color: '#1e1b4b',
            outline: 'none', appearance: 'none', cursor: 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
          }}
        >
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher / Lecturer</option>
        </select>

        <span style={{
          position: 'absolute', right: 14, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          fontSize: 10, opacity: 0.4, color: '#1e1b4b',
        }}>▾</span>
      </div>
      {hasError && (
        <div style={{ fontSize: 11, color: '#dc2626', fontFamily: "'Sora', sans-serif", paddingLeft: 4 }}>
          ⚠ {error}
        </div>
      )}
    </div>
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

function SignInForm({
  onSwitch,
  onSuccess,
}: {
  onSwitch: () => void;
  onSuccess: (user: AuthUser) => void;
}) {
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
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#7c3aed', fontFamily: "'Sora', sans-serif", fontWeight: 600, padding: 0,
          }}>
            Forgot password?
          </button>
        </div>
      </div>

      <ErrorBanner message={errors._general} />

      <PrimaryButton loading={loading} onClick={handleSubmit}>
        {loading ? 'Signing in…' : 'Sign in to Portal'}
      </PrimaryButton>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#ede9fe' }} />
        <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: "'Sora',sans-serif" }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: '#ede9fe' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {([
          {
            label: 'Google',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            ),
          },
          {
            label: 'GitHub',
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1e1b4b">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            ),
          },
        ] as const).map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px', borderRadius: 10, border: '1.5px solid #ede9fe',
              background: '#faf8ff', cursor: 'pointer', fontFamily: "'Sora', sans-serif",
              fontSize: 12, fontWeight: 600, color: '#1e1b4b', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#c4b5fd';
              e.currentTarget.style.background  = '#f3f0ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ede9fe';
              e.currentTarget.style.background  = '#faf8ff';
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', fontFamily: "'Sora', sans-serif", margin: 0 }}>
        New to the portal?{' '}
        <button onClick={onSwitch} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#7c3aed', fontWeight: 700, fontSize: 12,
          fontFamily: "'Sora', sans-serif", padding: 0,
        }}>
          Create an account
        </button>
      </p>
    </div>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({
  onSwitch,
  onSuccess,
}: {
  onSwitch: () => void;
  onSuccess: (user: AuthUser) => void;
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    password: '', password2: '', role: 'STUDENT' as Exclude<UserRole, 'ADMIN'>,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<ParsedFieldErrors>({ _general: '' });
  const [strength, setStrength] = useState(0);

  const update = useCallback(<K extends keyof typeof form>(field: K) => (val: typeof form[K]) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (field === 'password') setStrength(calcStrength(val as string));
  }, []);

  function calcStrength(pw: string): number {
    return (
      (pw.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(pw) ? 1 : 0) +
      (/[0-9]/.test(pw) ? 1 : 0) +
      (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0)
    );
  }

  const strengthMeta = [
    null,
    { label: 'Weak',   color: '#ef4444' },
    { label: 'Fair',   color: '#f59e0b' },
    { label: 'Good',   color: '#10b981' },
    { label: 'Strong', color: '#059669' },
  ] as const;

  const handleSubmit = useCallback(async () => {
    setErrors({ _general: '' });

    const clientErrors: ParsedFieldErrors = { _general: '' };
    if (!form.firstName.trim()) clientErrors.first_name = 'First name is required.';
    if (!form.lastName.trim())  clientErrors.last_name  = 'Last name is required.';
    if (!form.email.trim())     clientErrors.email      = 'Email is required.';
    if (!form.password)         clientErrors.password   = 'Password is required.';
    if (!form.password2)        clientErrors.password2  = 'Please confirm your password.';
    if (form.password && form.password2 && form.password !== form.password2)
      clientErrors.password2 = 'Passwords do not match.';
    if (strength < 2 && form.password)
      clientErrors.password = 'Password is too weak. Add uppercase, numbers, or symbols.';

    if (Object.keys(clientErrors).filter((k) => k !== '_general').length > 0) {
      setErrors(clientErrors); return;
    }

    setLoading(true);
    try {
      const user = await register({
        email:      form.email.trim(),
        first_name: form.firstName.trim(),
        last_name:  form.lastName.trim(),
        role:       form.role,
        password:   form.password,
        password2:  form.password2,
      });
      onSuccess(user);
    } catch (err) {
      setErrors(err as ParsedFieldErrors);
    } finally {
      setLoading(false);
    }
  }, [form, strength, onSuccess]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>First name</Label>
          <Field icon="👤" placeholder="Ahmed" value={form.firstName}
            onChange={update('firstName')} error={errors.first_name} autoComplete="given-name" />
        </div>
        <div>
          <Label>Last name</Label>
          <Field icon="👤" placeholder="Hassan" value={form.lastName}
            onChange={update('lastName')} error={errors.last_name} autoComplete="family-name" />
        </div>
      </div>

      <div>
        <Label>University email</Label>
        <Field icon="✉" type="email"
          placeholder="s12345678@student.ibnh.edu.eg"
          value={form.email} onChange={update('email')}
          error={errors.email} autoComplete="email" />
      </div>

      <div>
        <Label>Role</Label>
        <RoleSelect value={form.role} onChange={update('role')} error={errors.role} />
      </div>

      <div>
        <Label>Password</Label>
        <Field
          icon="🔒" type={showPass ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          value={form.password} onChange={update('password')}
          error={errors.password}
          action={{ icon: showPass ? '🙈' : '👁', onClick: () => setShowPass((s) => !s) }}
          autoComplete="new-password"
        />
        {form.password.length > 0 && (
          <div style={{ marginTop: 7 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} style={{
                  flex: 1, height: 3, borderRadius: 99, transition: 'background 0.3s',
                  background: n <= strength ? (strengthMeta[strength]?.color ?? '#ede9fe') : '#ede9fe',
                }} />
              ))}
            </div>
            {strengthMeta[strength] && (
              <span style={{
                fontSize: 10, fontWeight: 700, display: 'block', marginTop: 4,
                color: strengthMeta[strength].color, fontFamily: "'Sora', sans-serif",
              }}>
                {strengthMeta[strength].label}
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        <Label>Confirm password</Label>
        <Field
          icon="🔑" type={showPass ? 'text' : 'password'}
          placeholder="Repeat your password"
          value={form.password2} onChange={update('password2')}
          error={errors.password2}
          autoComplete="new-password"
        />
      </div>

      <ErrorBanner message={errors._general} />

      <PrimaryButton loading={loading} onClick={handleSubmit}>
        {loading ? 'Creating account…' : 'Create Account'}
      </PrimaryButton>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', fontFamily: "'Sora', sans-serif", margin: 0 }}>
        Already have an account?{' '}
        <button onClick={onSwitch} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#7c3aed', fontWeight: 700, fontSize: 12,
          fontFamily: "'Sora', sans-serif", padding: 0,
        }}>
          Sign in
        </button>
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

interface AuthPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [mode, setMode]       = useState<Mode>('signin');
  const [animOut, setAnimOut] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setAnimOut(true);
    setTimeout(() => { setMode(next); setAnimOut(false); }, 220);
  };

  const handleSuccess = (user: AuthUser) => {
    onLoginSuccess(user);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp      { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes formOut     { from { opacity:1; transform:translateY(0);     } to { opacity:0; transform:translateY(-10px); } }
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
        .form-inner.out { animation: formOut 0.22s ease forwards; }

        .tab-bar {
          display: flex;
          background: #f5f3ff;
          border: 1.5px solid #ede9fe;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 28px;
          width: 100%;
        }

        .tab-btn {
          flex: 1; padding: 8px 0;
          border: none; border-radius: 9px; cursor: pointer;
          font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 600;
          transition: all 0.2s;
        }
        .tab-btn.active   { background: #7c3aed; color: #fff; box-shadow: 0 2px 10px rgba(124,58,237,0.3); }
        .tab-btn.inactive { background: transparent; color: #94a3b8; }
        .tab-btn.inactive:hover { color: #7c3aed; }

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

            <div className="tab-bar">
              {([
                { key: 'signin',   label: 'Sign In'        },
                { key: 'register', label: 'Create Account' },
              ] as { key: Mode; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  className={`tab-btn ${mode === key ? 'active' : 'inactive'}`}
                  onClick={() => switchMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.5px' }}>
                {mode === 'signin' ? 'Welcome back' : 'Join the portal'}
              </h1>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>
                {mode === 'signin'
                  ? 'Sign in to access your academic dashboard.'
                  : 'Create your account to get started today.'}
              </p>
            </div>

            <div className={`form-inner${animOut ? ' out' : ''}`}>
              {mode === 'signin'
                ? <SignInForm  onSwitch={() => switchMode('register')} onSuccess={handleSuccess} />
                : <RegisterForm onSwitch={() => switchMode('signin')}  onSuccess={handleSuccess} />
              }
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
              Alexanderia Faculty of Engineering
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(196,181,253,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 3 }}>
              Alexanderia, Egypt · Est. 1942
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