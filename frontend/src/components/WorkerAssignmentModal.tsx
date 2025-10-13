import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateItem, type Item, type Worker } from '../api/items'
import Modal from './Modal'
import WorkerSelector from './WorkerSelector'

interface WorkerAssignmentModalProps {
  task: Item | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function WorkerAssignmentModal({ task, isOpen, onClose, onSuccess }: WorkerAssignmentModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([{ name: '', wage: 0, paid: false }])
  const queryClient = useQueryClient()
  
  // Calculate total wages automatically
  const getTotalWages = () => {
    return workers.reduce((sum, w) => sum + (w.wage || 0), 0)
  }

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Pick<Item, 'status' | 'workers' | 'paid'>>) => {
      if (!task) throw new Error('No task selected')
      return updateItem(task.id, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onSuccess()
      onClose()
      setWorkers([{ name: '', wage: 0, paid: false }])
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Filter out empty workers
    const validWorkers = workers.filter(w => w.name.trim() && w.wage > 0)
    if (validWorkers.length === 0) return
    
    // Calculate total wages
    const totalWages = getTotalWages()
    
    updateMutation.mutate({ 
      status: 'assigned',
      workers: validWorkers,
      paid: totalWages
    })
  }

  const handleCancel = () => {
    setWorkers([{ name: '', wage: 0, paid: false }])
    onClose()
  }

  const addWorker = () => {
    setWorkers([...workers, { name: '', wage: 0, paid: false }])
  }

  const removeWorker = (index: number) => {
    if (workers.length > 1) {
      setWorkers(workers.filter((_, i) => i !== index))
    }
  }

  const handleWorkerChange = (index: number, field: keyof Worker, value: string) => {
    const newWorkers = [...workers]
    if (field === 'wage') {
      newWorkers[index] = { ...newWorkers[index], wage: parseFloat(value) || 0 }
    } else {
      newWorkers[index] = { ...newWorkers[index], name: value }
    }
    setWorkers(newWorkers)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Assign Worker">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {task && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Task:</div>
            <div style={{ fontSize: 14, color: '#666' }}>Customer: {task.customer}</div>
          </div>
        )}

        {/* Workers */}
        <div>
          <label style={{ fontWeight: 500, fontSize: 14, marginBottom: 8, display: 'block' }}>Assign Workers *</label>
          
          {workers.map((worker, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <WorkerSelector
                  value={worker.name}
                  onChange={(value) => handleWorkerChange(index, 'name', value)}
                  placeholder="Worker name"
                  required={index === 0}
                />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={worker.wage || ''}
                onChange={(e) => handleWorkerChange(index, 'wage', e.target.value)}
                style={{
                  width: 100,
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14,
                  flexShrink: 0
                }}
                placeholder="Wage"
              />
              {workers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWorker(index)}
                  style={{
                    width: 40,
                    padding: 8,
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={addWorker}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                width: 'auto'
              }}
            >
              + Add Worker
            </button>
          </div>
        </div>

        {/* Total Wages */}
        <div style={{ 
          marginTop: 8, 
          paddingTop: 8, 
          borderTop: '1px solid #ddd',
          textAlign: 'right',
          fontWeight: 600,
          fontSize: 16
        }}>
          Total Wages: ${getTotalWages().toFixed(2)}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={updateMutation.isPending || workers.filter(w => w.name.trim() && w.wage > 0).length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              opacity: updateMutation.isPending || workers.filter(w => w.name.trim() && w.wage > 0).length === 0 ? 0.6 : 1
            }}
          >
            {updateMutation.isPending ? 'Assigning...' : 'Assign Workers'}
          </button>
        </div>

        {/* Error Display */}
        {updateMutation.error && (
          <div style={{ color: '#dc3545', fontSize: 14, marginTop: 8 }}>
            {updateMutation.error?.message || 'An error occurred'}
          </div>
        )}
      </form>
    </Modal>
  )
}
