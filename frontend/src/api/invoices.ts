import type { Item } from './items'

export interface Invoice {
  id: string // Invoice number (format: yy0001)
  taskIds: number[] // Array of task IDs included in this invoice
  customerName: string
  totalAmount: number
  createdAt: number
  tasks: Item[] // Store snapshot of tasks at time of invoice creation
  paymentReceived: boolean
  paymentReceivedDate?: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

// API functions
export const listInvoices = async (): Promise<Invoice[]> => {
  const res = await fetch(`${API_BASE_URL}/invoices`)
  if (!res.ok) {
    throw new Error('Failed to fetch invoices')
  }
  return res.json()
}

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  const res = await fetch(`${API_BASE_URL}/invoices/${id}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch invoice')
  }
  return res.json()
}

export const createInvoice = async (
  invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'paymentReceived'>
): Promise<Invoice> => {
  const res = await fetch(`${API_BASE_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.details || error.error || 'Failed to create invoice')
  }
  return res.json()
}

export const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<Invoice> => {
  const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update invoice')
  }
  return res.json()
}

export const deleteInvoice = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete invoice')
  }
}
