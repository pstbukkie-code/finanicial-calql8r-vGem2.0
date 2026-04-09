import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { useAuth } from './features/auth/useAuth'

function Root() {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#070e16',
        color: '#5d7a96', fontFamily: "'DM Sans',sans-serif", fontSize: 14,
      }}>
        Loading…
      </div>
    )
  }

  return currentUser ? <App /> : <LoginPage />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
