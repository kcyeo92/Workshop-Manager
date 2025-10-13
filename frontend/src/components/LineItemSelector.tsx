import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listLineItemTemplates, createLineItemTemplate, type LineItemTemplate } from '../api/lineItemTemplates'

interface LineItemSelectorProps {
  value: string
  onChange: (description: string) => void
  placeholder?: string
  required?: boolean
}

export default function LineItemSelector({ value, onChange, placeholder = "Select or enter item...", required = false }: LineItemSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const queryClient = useQueryClient()

  const templatesQuery = useQuery({
    queryKey: ['lineItemTemplates'],
    queryFn: listLineItemTemplates,
  })

  const createMutation = useMutation({
    mutationFn: createLineItemTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineItemTemplates'] })
    },
  })

  const dbTemplates = templatesQuery.data || []
  const activeTemplates = dbTemplates.filter(t => t.isActive)

  const handleSelectTemplate = (template: LineItemTemplate) => {
    onChange(template.description)
    setIsOpen(false)
  }

  const handleAddNew = async () => {
    if (customValue.trim()) {
      const description = customValue.trim()
      
      // Check if already exists
      const existing = dbTemplates.find(t => t.description.toLowerCase() === description.toLowerCase())
      if (existing) {
        onChange(description)
      } else {
        // Save to database
        try {
          await createMutation.mutateAsync({ description })
          onChange(description)
        } catch (error) {
          console.error('Failed to create line item template:', error)
          // Still allow the user to use it
          onChange(description)
        }
      }
      
      setCustomValue('')
      setIsOpen(false)
    }
  }

  const filteredTemplates = activeTemplates.filter(template =>
    template.description.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: 8,
          border: '1px solid #ddd',
          borderRadius: 4,
          fontSize: 14,
          paddingRight: 40
        }}
      />
      
      {/* Dropdown arrow */}
      <div
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'pointer',
          fontSize: 12,
          color: '#666'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        ▼
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: 250,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Predefined templates */}
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 14,
                color: 'black'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              {template.description}
            </div>
          ))}
          
          {filteredTemplates.length === 0 && !value && (
            <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: 14 }}>
              No line items yet. Add one below!
            </div>
          )}
          
          {/* Add new line item section */}
          <div style={{ borderTop: '1px solid #ddd', padding: '8px 12px', backgroundColor: '#f8f9fa' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Add new item:</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Item description..."
                style={{
                  flex: 1,
                  padding: 4,
                  border: '1px solid #ccc',
                  borderRadius: 2,
                  fontSize: 12
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddNew()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddNew}
                disabled={!customValue.trim() || createMutation.isPending}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontSize: 12,
                  opacity: customValue.trim() && !createMutation.isPending ? 1 : 0.6
                }}
              >
                {createMutation.isPending ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

