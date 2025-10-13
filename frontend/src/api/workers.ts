// Workers API - Backend implementation

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export interface Worker {
  id: number
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  hourlyRate: number
  notes?: string | null
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// API Functions

export async function listWorkers(): Promise<Worker[]> {
  const response = await fetch(`${API_BASE_URL}/workers`)
  if (!response.ok) {
    throw new Error('Failed to fetch workers')
  }
  return response.json()
}

export async function getWorker(id: number): Promise<Worker | null> {
  const response = await fetch(`${API_BASE_URL}/workers/${id}`)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error('Failed to fetch worker')
  }
  return response.json()
}

export async function getWorkerByName(name: string): Promise<Worker | null> {
  const workers = await listWorkers()
  return workers.find(w => w.name.toLowerCase() === name.toLowerCase()) || null
}

export async function createWorker(
  workerData: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Worker> {
  const response = await fetch(`${API_BASE_URL}/workers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workerData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create worker')
  }
  
  return response.json()
}

export async function updateWorker(
  id: number,
  updates: Partial<Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Worker> {
  const response = await fetch(`${API_BASE_URL}/workers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update worker')
  }
  
  return response.json()
}

export async function deleteWorker(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/workers/${id}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete worker')
  }
}

// Helper function to get all worker names (for autocomplete/dropdown)
export async function getWorkerNames(): Promise<string[]> {
  const workers = await listWorkers()
  return workers
    .filter(w => w.isActive)
    .map(w => w.name)
    .sort()
}
