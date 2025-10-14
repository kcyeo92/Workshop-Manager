/* eslint-disable @typescript-eslint/no-explicit-any */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']

let gapiInited = false
let gisInited = false
let tokenClient: any = null
let tokenExpiresAt: number | null = null
let refreshInterval: number | null = null

// Initialize the Google API
export const initializeGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if ((window as any).gapi) {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          })
          gapiInited = true
          console.log('Google API (gapi) initialized')
          resolve()
        } catch (error) {
          console.error('Failed to init gapi client:', error)
          reject(error)
        }
      })
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.async = true
    script.defer = true
    script.onload = () => {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          })
          gapiInited = true
          console.log('Google API (gapi) initialized')
          resolve()
        } catch (error) {
          console.error('Failed to init gapi client:', error)
          reject(error)
        }
      })
    }
    script.onerror = () => {
      console.error('Failed to load gapi script')
      reject(new Error('Failed to load Google API script'))
    }
    document.body.appendChild(script)
  })
}

// Initialize Google Identity Services
export const initializeGIS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if ((window as any).google?.accounts?.oauth2) {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      })
      gisInited = true
      console.log('Google Identity Services (GIS) initialized')
      resolve(tokenClient)
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      })
      gisInited = true
      console.log('Google Identity Services (GIS) initialized')
      resolve(tokenClient)
    }
    script.onerror = () => {
      console.error('Failed to load GIS script')
      reject(new Error('Failed to load Google Identity Services script'))
    }
    document.body.appendChild(script)
  })
}

// Check if token is valid (not expired)
const isTokenValid = (): boolean => {
  const existingToken = (window as any).gapi?.client?.getToken()
  if (!existingToken || !existingToken.access_token) {
    console.log('No token found in gapi client')
    return false
  }

  // If we don't have an expiration time stored, assume token might be expired
  if (!tokenExpiresAt) {
    console.log('No token expiration time stored, assuming expired')
    return false
  }

  // Check if token has expired (with 5 minute buffer)
  if (Date.now() >= tokenExpiresAt - 5 * 60 * 1000) {
    console.log('Token expired or about to expire')
    return false
  }

  return true
}

// Set token expiration time (called from AuthContext)
export const setTokenExpiration = (expiresIn: number): void => {
  tokenExpiresAt = Date.now() + expiresIn * 1000
  console.log('Token expiration set to:', new Date(tokenExpiresAt).toLocaleTimeString())
  
  // Start background refresh - refresh token 10 minutes before expiry
  startBackgroundRefresh()
}

// Start background token refresh
const startBackgroundRefresh = (): void => {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  
  // Check every minute if token needs refresh
  refreshInterval = window.setInterval(async () => {
    if (!tokenExpiresAt) return
    
    const timeUntilExpiry = tokenExpiresAt - Date.now()
    const tenMinutes = 10 * 60 * 1000
    
    // If token expires in less than 10 minutes, refresh it
    if (timeUntilExpiry <= tenMinutes && timeUntilExpiry > 0) {
      console.log('🔄 Proactively refreshing token (expires in', Math.floor(timeUntilExpiry / 60000), 'minutes)')
      try {
        await getAccessToken()
      } catch (error) {
        console.error('Background token refresh failed:', error)
      }
    }
  }, 60000) // Check every minute
  
  console.log('✅ Background token refresh started')
}

// Stop background token refresh
export const stopBackgroundRefresh = (): void => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
    console.log('🛑 Background token refresh stopped')
  }
}

// Ensure valid token before making API calls
export const ensureValidToken = async (): Promise<void> => {
  if (!isTokenValid()) {
    console.log('Refreshing token before API call...')
    await getAccessToken()
  }
}

// Request access token
export const getAccessToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!gapiInited || !gisInited) {
      console.error('APIs not initialized. gapiInited:', gapiInited, 'gisInited:', gisInited)
      reject(new Error('Google APIs not initialized'))
      return
    }

    // Check if we already have a valid token
    if (isTokenValid()) {
      const existingToken = (window as any).gapi.client.getToken()
      console.log('Using existing valid access token')
      resolve(existingToken.access_token)
      return
    }

    // Token is invalid or expired, request a new one
    console.log('Token invalid or expired, requesting new token...')
    tokenClient.callback = (response: any) => {
      if (response.error !== undefined) {
        console.error('Token request error:', response)
        reject(response)
        return
      }
      console.log('New access token received')
      
      const newToken = response.access_token
      const expiresIn = response.expires_in || 3600
      
      // Store expiration time
      tokenExpiresAt = Date.now() + expiresIn * 1000
      
      // Store in sessionStorage for persistence
      sessionStorage.setItem('google_access_token', newToken)
      sessionStorage.setItem('google_token_expires_at', tokenExpiresAt.toString())
      
      console.log('Token stored in sessionStorage, expires at:', new Date(tokenExpiresAt).toLocaleTimeString())
      
      resolve(newToken)
    }

    // Request token (prompt='' means no popup if already authorized)
    try {
      console.log('Requesting access token...')
      tokenClient.requestAccessToken({ prompt: '' })
    } catch (error) {
      console.error('Error requesting token:', error)
      reject(error)
    }
  })
}

// Create a folder in Google Drive
export const createDriveFolder = async (folderName: string, parentId?: string): Promise<string> => {
  await ensureValidToken()
  
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : []
  }

  const response = await (window as any).gapi.client.drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  })

  return response.result.id
}

// Find folder by name
export const findFolder = async (folderName: string, parentId?: string): Promise<string | null> => {
  await ensureValidToken()
  
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  if (parentId) {
    query += ` and '${parentId}' in parents`
  }

  const response = await (window as any).gapi.client.drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  })

  const files = response.result.files
  return files && files.length > 0 ? files[0].id : null
}

// Get or create the main app folder
export const getOrCreateAppFolder = async (): Promise<string> => {
  const appFolderName = 'Workshop Photos'
  let folderId = await findFolder(appFolderName)
  
  if (!folderId) {
    folderId = await createDriveFolder(appFolderName)
  }
  
  return folderId
}

// Upload file to Google Drive
export const uploadFileToDrive = async (
  file: File,
  folderId: string,
  fileName?: string
): Promise<string> => {
  await ensureValidToken()
  
  const metadata = {
    name: fileName || file.name,
    parents: [folderId]
  }

  const formData = new FormData()
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  formData.append('file', file)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${(window as any).gapi.client.getToken().access_token}`
      },
      body: formData
    }
  )

  const result = await response.json()
  return result.id
}

// Get file info including thumbnail link
export const getFileInfo = async (fileId: string): Promise<any> => {
  await ensureValidToken()
  
  const response = await (window as any).gapi.client.drive.files.get({
    fileId: fileId,
    fields: 'id,name,webViewLink,webContentLink,thumbnailLink,mimeType'
  })
  
  return response.result
}

// Get authenticated image URL with thumbnail size
export const getAuthenticatedImageUrl = (fileId: string, size: number = 400): string => {
  const token = (window as any).gapi.client.getToken()
  if (!token) {
    console.error('No token available for authenticated image URL')
    return ''
  }
  
  // Use thumbnail link with size parameter for better CORS handling
  return `https://lh3.googleusercontent.com/d/${fileId}=w${size}-h${size}-p-k-no-nd-mv`
}

// Fetch image as blob and return data URL
export const fetchImageAsDataUrl = async (fileId: string): Promise<string> => {
  try {
    await ensureValidToken()
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${(window as any).gapi.client.getToken().access_token}`
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error fetching image:', error)
    throw error
  }
}

// Upload multiple photos for a task
export interface PhotoUploadResult {
  fileId: string
  fileName: string
  thumbnailLink: string
  viewLink: string
}

export const uploadTaskPhotos = async (
  photos: File[],
  _taskId: number,
  customerName: string,
  plateNumber: string
): Promise<PhotoUploadResult[]> => {
  await ensureValidToken()
  
  // Get or create app folder: "Workshop Photos"
  const appFolderId = await getOrCreateAppFolder()
  
  // Get current date for year/month folders
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0') // 01-12
  
  // Create/get year folder
  let yearFolderId = await findFolder(year, appFolderId)
  if (!yearFolderId) {
    yearFolderId = await createDriveFolder(year, appFolderId)
  }
  
  // Create/get month folder
  let monthFolderId = await findFolder(month, yearFolderId)
  if (!monthFolderId) {
    monthFolderId = await createDriveFolder(month, yearFolderId)
  }
  
  // Create task folder: "CustomerName_PlateNumber"
  const taskFolderName = `${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}`
  let taskFolderId = await findFolder(taskFolderName, monthFolderId)
  
  if (!taskFolderId) {
    taskFolderId = await createDriveFolder(taskFolderName, monthFolderId)
  }
  
  // Upload all photos
  const uploadPromises = photos.map(async (photo, index) => {
    const fileName = `photo_${index + 1}_${Date.now()}.${photo.name.split('.').pop()}`
    const fileId = await uploadFileToDrive(photo, taskFolderId!, fileName)
    const fileInfo = await getFileInfo(fileId)
    
    return {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      thumbnailLink: fileInfo.thumbnailLink,
      viewLink: fileInfo.webViewLink
    }
  })
  
  return Promise.all(uploadPromises)
}

// Retrieve photos for a task
export const getTaskPhotos = async (
  customerName: string,
  plateNumber: string,
  year?: string,
  month?: string
): Promise<PhotoUploadResult[]> => {
  try {
    // Ensure token is valid before making API calls
    await ensureValidToken()
    
    // Get app folder
    const appFolderId = await getOrCreateAppFolder()
    
    // Use provided year/month or current date
    const targetYear = year || new Date().getFullYear().toString()
    const targetMonth = month || (new Date().getMonth() + 1).toString().padStart(2, '0')
    
    // Find year folder
    const yearFolderId = await findFolder(targetYear, appFolderId)
    if (!yearFolderId) {
      console.log('Year folder not found')
      return []
    }
    
    // Find month folder
    const monthFolderId = await findFolder(targetMonth, yearFolderId)
    if (!monthFolderId) {
      console.log('Month folder not found')
      return []
    }
    
    // Find task folder
    const taskFolderName = `${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${plateNumber.replace(/[^a-zA-Z0-9]/g, '_')}`
    const taskFolderId = await findFolder(taskFolderName, monthFolderId)
    
    if (!taskFolderId) {
      console.log('Task folder not found')
      return []
    }
    
    // List all files in the task folder
    const response = await (window as any).gapi.client.drive.files.list({
      q: `'${taskFolderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name, webViewLink, thumbnailLink, mimeType)',
      orderBy: 'createdTime'
    })
    
    const files = response.result.files || []
    
    return files.map((file: any) => ({
      fileId: file.id,
      fileName: file.name,
      thumbnailLink: file.thumbnailLink || file.webViewLink,
      viewLink: file.webViewLink
    }))
  } catch (error) {
    console.error('Error retrieving photos:', error)
    return []
  }
}

// Sign out
export const signOut = () => {
  const token = (window as any).gapi.client.getToken()
  if (token !== null) {
    (window as any).google.accounts.oauth2.revoke(token.access_token)
    ;(window as any).gapi.client.setToken('')
  }
}

