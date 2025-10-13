import { useEffect, useRef, useState } from 'react'

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null
    if (existing) {
      if ((existing as any)._loaded) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    ;(script as any)._loaded = false
    script.onload = () => {
      ;(script as any)._loaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
}

export default function Login() {
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await loadGoogleScript()

        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
        if (!clientId) {
          setError('Missing VITE_GOOGLE_CLIENT_ID. Set it in your environment.')
          return
        }

        if (cancelled) return

        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            // The credential is a JWT ID token. Send it to your backend to verify.
            console.log('Google credential:', response.credential)
            alert('Signed in! Check the console for the credential.')
          }
        })

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with'
          })
        }

        // Optionally show One Tap
        window.google.accounts.id.prompt()
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize Google Login')
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: 360, maxWidth: '90vw', display: 'grid', gap: 16 }}>
        <h1 style={{ margin: 0, textAlign: 'center' }}>Sign in</h1>
        {error ? (
          <div style={{ color: 'crimson', fontSize: 14, textAlign: 'center' }}>{error}</div>
        ) : null}
        <div ref={buttonRef} style={{ display: 'grid', placeItems: 'center', paddingTop: 8 }} />
      </div>
    </div>
  )
}


