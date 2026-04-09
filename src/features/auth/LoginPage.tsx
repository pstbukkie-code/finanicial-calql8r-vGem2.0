import { useState, type FormEvent } from 'react'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    const result = await login(username.trim(), password)
    setLoading(false)
    if (!result.ok) setError(result.error ?? 'Login failed')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / App name */}
        <div style={styles.header}>
          <div style={styles.logo}>CD</div>
          <h1 style={styles.appName}>CreditDesk Pro</h1>
          <p style={styles.subtitle}>Debt Portfolio Management</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="Enter your username"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              ...styles.button,
              opacity: loading || !username.trim() || !password ? 0.5 : 1,
              cursor: loading || !username.trim() || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          Contact your system administrator if you need access.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#070e16',
    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
  },
  card: {
    background: '#0a1520',
    border: '1px solid #1e3a5f',
    borderRadius: 12,
    padding: '40px 36px',
    width: 380,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 12,
    background: '#1e3a5f',
    color: '#c9a84c',
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  appName: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#c9a84c',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#5d7a96',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8aa8c8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    background: '#0d1e30',
    border: '1px solid #1e3a5f',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#e8f0fe',
    fontSize: 14,
    outline: 'none',
  },
  error: {
    background: 'rgba(220,53,69,0.15)',
    border: '1px solid rgba(220,53,69,0.4)',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#ff6b6b',
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    background: '#1e3a5f',
    color: '#c9a84c',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 14,
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#3d5a78',
  },
}
