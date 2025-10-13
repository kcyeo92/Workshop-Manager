// Line Item Templates API - Backend implementation

export interface LineItemTemplate {
  id: number
  description: string
  category?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

// API Functions

export async function listLineItemTemplates(): Promise<LineItemTemplate[]> {
  const res = await fetch(`${API_BASE_URL}/line-item-templates`)
  if (!res.ok) {
    throw new Error('Failed to fetch line item templates')
  }
  return res.json()
}

export async function getLineItemTemplate(id: number): Promise<LineItemTemplate | null> {
  const res = await fetch(`${API_BASE_URL}/line-item-templates/${id}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch line item template')
  }
  return res.json()
}

export async function getLineItemTemplateByDescription(description: string): Promise<LineItemTemplate | null> {
  const res = await fetch(`${API_BASE_URL}/line-item-templates/by-description/${encodeURIComponent(description)}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch line item template')
  }
  return res.json()
}

export async function createLineItemTemplate(
  templateData: Omit<LineItemTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
): Promise<LineItemTemplate> {
  const res = await fetch(`${API_BASE_URL}/line-item-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(templateData)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create line item template')
  }
  return res.json()
}

export async function updateLineItemTemplate(
  id: number,
  updates: Partial<Omit<LineItemTemplate, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<LineItemTemplate> {
  const res = await fetch(`${API_BASE_URL}/line-item-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update line item template')
  }
  return res.json()
}

export async function deleteLineItemTemplate(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/line-item-templates/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete line item template')
  }
}

// Helper function to get all line item descriptions (for autocomplete/dropdown)
export async function getLineItemDescriptions(): Promise<string[]> {
  const templates = await listLineItemTemplates()
  return templates
    .filter(t => t.isActive)
    .map(t => t.description)
    .sort()
}

