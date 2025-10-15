import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect to home if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, location])

  const handleLogin = async () => {
    setIsLoggingIn(true)
    setError(null)

    try {
      await login()
      // Redirect to the page they were trying to access, or home if none
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err: any) {
      console.error('Login failed:', err)
      setError(err.message || 'Failed to login. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: '48px 40px',
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16
        }}>
          🚗
        </div>
        
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 8
        }}>
          Workshop Manager
        </h1>
        
        <p style={{
          fontSize: 14,
          color: '#666',
          marginBottom: 32
        }}>
          Sign in with your Google account to continue
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: 12,
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          style={{
            width: '100%',
            padding: '14px 24px',
            fontSize: 16,
            fontWeight: 600,
            color: 'white',
            backgroundColor: isLoggingIn ? '#999' : '#4285f4',
            border: 'none',
            borderRadius: 8,
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            if (!isLoggingIn) {
              e.currentTarget.style.backgroundColor = '#3367d6'
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoggingIn) {
              e.currentTarget.style.backgroundColor = '#4285f4'
            }
          }}
        >
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fillRule="evenodd">
              <path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4"/>
              <path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853"/>
              <path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05"/>
              <path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335"/>
            </g>
          </svg>
          {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <p style={{
          fontSize: 12,
          color: '#999',
          marginTop: 24,
          lineHeight: 1.5
        }}>
          Secure access with your Google account
        </p>
      </div>
    </div>
  )
}

