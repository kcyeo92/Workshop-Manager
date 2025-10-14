import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { initializeGoogleAPI, initializeGIS, setTokenExpiration, stopBackgroundRefresh } from '../services/googleDrive'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: {
    name: string
    email: string
    picture: string
  } | null
  accessToken: string | null
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ name: string; email: string; picture: string } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenClient, setTokenClient] = useState<any>(null)

  // Initialize Google APIs on mount
  useEffect(() => {
    const initGoogle = async () => {
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || !import.meta.env.VITE_GOOGLE_API_KEY) {
        console.error('Google credentials not configured')
        setIsLoading(false)
        return
      }

      try {
        await initializeGoogleAPI()
        const client = await initializeGIS()
        setTokenClient(client)
        
        // Check if user was previously logged in
        const savedToken = sessionStorage.getItem('google_access_token')
        const savedUser = sessionStorage.getItem('google_user')
        const savedExpiresAt = sessionStorage.getItem('google_token_expires_at')
        
        if (savedToken && savedUser) {
          setAccessToken(savedToken)
          setUser(JSON.parse(savedUser))
          setIsAuthenticated(true)
          
          // Set token in gapi client
          ;(window as any).gapi.client.setToken({ access_token: savedToken })
          
          // Restore token expiration time if available
          if (savedExpiresAt) {
            const expiresAt = parseInt(savedExpiresAt, 10)
            const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
            setTokenExpiration(remainingSeconds)
          }
        }
      } catch (error) {
        console.error('Failed to initialize Google APIs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initGoogle()
  }, [])

  const login = async (): Promise<void> => {
    if (!tokenClient) {
      throw new Error('Google APIs not initialized')
    }

    return new Promise((resolve, reject) => {
      tokenClient.callback = async (response: any) => {
        if (response.error !== undefined) {
          reject(response)
          return
        }

        const token = response.access_token
        setAccessToken(token)
        
        // Set token in gapi client
        ;(window as any).gapi.client.setToken({ access_token: token })
        
        // Store token expiration time (tokens typically expire in 3600 seconds)
        const expiresIn = response.expires_in || 3600
        setTokenExpiration(expiresIn)
        
        // Store expiration time in session storage for persistence
        sessionStorage.setItem('google_token_expires_at', (Date.now() + expiresIn * 1000).toString())

        try {
          // Get user info
          const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          )
          
          const userInfo = await userInfoResponse.json()
          const userData = {
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture
          }
          
          // Check if email is allowed
          const allowedEmailsEnv = import.meta.env.VITE_ALLOWED_EMAIL
          if (allowedEmailsEnv) {
            // Split by comma and trim whitespace
            const allowedEmails = allowedEmailsEnv.split(',').map((email: string) => email.trim())
            
            if (!allowedEmails.includes(userData.email)) {
              // Revoke token and reject
              ;(window as any).google.accounts.oauth2.revoke(token, () => {
                console.log('Token revoked for unauthorized user')
              })
              ;(window as any).gapi.client.setToken(null)
              reject(new Error(`Access denied. Your email (${userData.email}) is not authorized to access this application.`))
              return
            }
          }
          
          setUser(userData)
          setIsAuthenticated(true)
          
          // Save to session storage
          sessionStorage.setItem('google_access_token', token)
          sessionStorage.setItem('google_user', JSON.stringify(userData))
          
          console.log('User logged in:', userData)
          resolve()
        } catch (error) {
          console.error('Failed to get user info:', error)
          reject(error)
        }
      }

      // Request access token (only prompts if necessary)
      tokenClient.requestAccessToken({ prompt: '' })
    })
  }

  const logout = () => {
    const token = (window as any).gapi.client.getToken()
    if (token !== null) {
      (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
        console.log('Token revoked')
      })
      ;(window as any).gapi.client.setToken(null)
    }
    
    // Stop background token refresh
    stopBackgroundRefresh()
    
    setIsAuthenticated(false)
    setUser(null)
    setAccessToken(null)
    
    sessionStorage.removeItem('google_access_token')
    sessionStorage.removeItem('google_user')
    sessionStorage.removeItem('google_token_expires_at')
    
    console.log('User logged out')
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

