import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listWorkers, createWorker } from '../api/workers'

interface WorkerSelectorProps {
  value: string
  onChange: (worker: string) => void
  placeholder?: string
  required?: boolean
}

export default function WorkerSelector({ value, onChange, placeholder = "Select or enter worker...", required = false }: WorkerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const queryClient = useQueryClient()

  const workersQuery = useQuery({
    queryKey: ['workers'],
    queryFn: listWorkers,
  })

  const createWorkerMutation = useMutation({
    mutationFn: createWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
    },
  })

  const dbWorkers = workersQuery.data || []
  const activeWorkers = dbWorkers.filter(w => w.isActive).map(w => w.name)

  const handleSelectWorker = (worker: string) => {
    onChange(worker)
    setIsOpen(false)
  }

  const handleAddNew = async () => {
    if (customValue.trim()) {
      const workerName = customValue.trim()
      
      // Check if worker already exists
      const existing = dbWorkers.find(w => w.name.toLowerCase() === workerName.toLowerCase())
      if (existing) {
        onChange(workerName)
      } else {
        // Create worker in database
        try {
          await createWorkerMutation.mutateAsync({ 
            name: workerName,
            hourlyRate: 0
          })
          onChange(workerName)
        } catch (error) {
          console.error('Failed to create worker:', error)
          // Still allow the user to use it
          onChange(workerName)
        }
      }
      
      setCustomValue('')
      setIsOpen(false)
    }
  }

  const filteredWorkers = activeWorkers.filter(worker =>
    worker.toLowerCase().includes(value.toLowerCase())
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
          fontSize: 16,
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
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Predefined workers */}
          {filteredWorkers.map((worker, index) => (
            <div
              key={index}
              onClick={() => handleSelectWorker(worker)}
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
              {worker}
            </div>
          ))}
          
          {/* Add new worker section */}
          <div style={{ borderTop: '1px solid #ddd', padding: '8px 12px', backgroundColor: '#f8f9fa' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Add new worker:</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter worker name..."
                style={{
                  flex: 1,
                  padding: 4,
                  border: '1px solid #ccc',
                  borderRadius: 2,
                  fontSize: 12
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNew()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddNew}
                disabled={!customValue.trim() || createWorkerMutation.isPending}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontSize: 12,
                  opacity: customValue.trim() && !createWorkerMutation.isPending ? 1 : 0.6
                }}
              >
                {createWorkerMutation.isPending ? '...' : 'Add'}
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
