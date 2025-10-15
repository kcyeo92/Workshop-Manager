import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: {
    name: string
    email: string
    picture: string
  } | null
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

  // Load Google Identity Services script
  useEffect(() => {
    // Check if user was previously logged in (do this immediately)
    const savedUser = sessionStorage.getItem('google_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        sessionStorage.removeItem('google_user')
      }
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      setIsLoading(false)
    }

    script.onerror = () => {
      console.error('Failed to load Google Identity Services')
      setIsLoading(false)
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const login = async (): Promise<void> => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured')
    }

    return new Promise((resolve, reject) => {
      if (!(window as any).google) {
        reject(new Error('Google Identity Services not loaded'))
        return
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            reject(response)
            return
          }

          try {
            // Get user info
            const userInfoResponse = await fetch(
              'https://www.googleapis.com/oauth2/v2/userinfo',
              {
                headers: {
                  Authorization: `Bearer ${response.access_token}`
                }
              }
            )
            
            if (!userInfoResponse.ok) {
              throw new Error('Failed to get user info')
            }

            const userInfo = await userInfoResponse.json()
            
            // Check if email is whitelisted
            const allowedEmails = import.meta.env.VITE_ALLOWED_EMAIL?.split(',').map((email: string) => email.trim()) || []
            
            if (allowedEmails.length > 0 && !allowedEmails.includes(userInfo.email)) {
              alert(`Access denied. Your email (${userInfo.email}) is not whitelisted.`)
              reject(new Error('Email not whitelisted'))
              return
            }

            const userData = {
              name: userInfo.name,
              email: userInfo.email,
              picture: userInfo.picture
            }

            setUser(userData)
            setIsAuthenticated(true)
            
            // Save user data to session storage
            sessionStorage.setItem('google_user', JSON.stringify(userData))

            resolve()
          } catch (error) {
            console.error('Error during login:', error)
            reject(error)
          }
        },
      })

      // Request access token
      client.requestAccessToken()
    })
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    sessionStorage.removeItem('google_user')
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
