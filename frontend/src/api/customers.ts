// Customers API - Backend implementation

export interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

// API Functions

export async function listCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_BASE_URL}/customers`)
  if (!res.ok) {
    throw new Error('Failed to fetch customers')
  }
  return res.json()
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const res = await fetch(`${API_BASE_URL}/customers/${id}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch customer')
  }
  return res.json()
}

export async function getCustomerByName(name: string): Promise<Customer | null> {
  const res = await fetch(`${API_BASE_URL}/customers/by-name/${encodeURIComponent(name)}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch customer')
  }
  return res.json()
}

export async function createCustomer(
  customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
): Promise<Customer> {
  const res = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create customer')
  }
  return res.json()
}

export async function updateCustomer(
  id: number,
  updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Customer> {
  const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update customer')
  }
  return res.json()
}

export async function deleteCustomer(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete customer')
  }
}

// Helper function to get all customer names (for autocomplete/dropdown)
export async function getCustomerNames(): Promise<string[]> {
  const customers = await listCustomers()
  return customers
    .filter(c => c.isActive)
    .map(c => c.name)
    .sort()
}
