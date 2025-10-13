import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listItems, updateItem, type Item, type Worker as TaskWorker } from '../api/items'
import { listWorkers, createWorker, updateWorker as updateWorkerDB, deleteWorker, type Worker } from '../api/workers'
import Modal from '../components/Modal'

export default function WorkersPage() {
  const [selectedWorker, setSelectedWorker] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    hourlyRate: '',
    notes: ''
  })
  const queryClient = useQueryClient()

  const itemsQuery = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => listItems(),
  })

  const workersQuery = useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () => listWorkers(),
  })

  const updateTaskWorkerMutation = useMutation({
    mutationFn: ({ taskId, workers }: { taskId: number; workers: TaskWorker[] }) => 
      updateItem(taskId, { workers }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  })

  const createWorkerMutation = useMutation({
    mutationFn: (data: Omit<Worker, 'id' | 'createdAt' | 'isActive'>) => createWorker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setIsAddModalOpen(false)
      resetForm()
    },
  })

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Worker> }) => 
      updateWorkerDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      setIsEditModalOpen(false)
      setEditingWorker(null)
      resetForm()
    },
  })

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: number) => deleteWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      hourlyRate: '',
      notes: ''
    })
  }

  const handleAddWorker = () => {
    if (!formData.name.trim()) return
    
    createWorkerMutation.mutate({
      name: formData.name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : 0,
      notes: formData.notes.trim() || undefined
    })
  }

  const handleEditWorker = () => {
    if (!editingWorker || !formData.name.trim()) return
    
    updateWorkerMutation.mutate({
      id: editingWorker.id,
      updates: {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        notes: formData.notes.trim() || undefined
      }
    })
  }

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker)
    setFormData({
      name: worker.name,
      phone: worker.phone || '',
      email: worker.email || '',
      address: worker.address || '',
      hourlyRate: worker.hourlyRate?.toString() || '',
      notes: worker.notes || ''
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteWorker = (id: number) => {
    if (confirm('Are you sure you want to delete this worker? This will not affect existing task records.')) {
      deleteWorkerMutation.mutate(id)
    }
  }

  const allTasks = itemsQuery.data ?? []
  const allWorkers = workersQuery.data ?? []

  // Get all workers with their statistics
  const workerStats = useMemo(() => {
    const stats = new Map<string, {
      name: string
      totalTasks: number
      completedTasks: number
      totalWages: number
      paidWages: number
      unpaidWages: number
      tasks: Array<{
        id: number
        customer: string
        vehiclePlateNo: string
        status: string
        wage: number
        paid: boolean
        createdAt: number
        workerIndex: number
        allWorkers: Worker[]
      }>
    }>()

    allTasks.forEach(task => {
      if (task.workers && task.workers.length > 0) {
        task.workers.forEach((worker, workerIndex) => {
          if (!worker.name.trim()) return

          if (!stats.has(worker.name)) {
            stats.set(worker.name, {
              name: worker.name,
              totalTasks: 0,
              completedTasks: 0,
              totalWages: 0,
              paidWages: 0,
              unpaidWages: 0,
              tasks: []
            })
          }

          const workerStat = stats.get(worker.name)!
          workerStat.totalTasks++
          if (task.status === 'done') {
            workerStat.completedTasks++
          }
          workerStat.totalWages += worker.wage
          if (worker.paid) {
            workerStat.paidWages += worker.wage
          } else {
            workerStat.unpaidWages += worker.wage
          }
          workerStat.tasks.push({
            id: task.id,
            customer: task.customer,
            vehiclePlateNo: task.vehiclePlateNo,
            status: task.status,
            wage: worker.wage,
            paid: worker.paid,
            createdAt: task.createdAt,
            workerIndex: workerIndex,
            allWorkers: task.workers
          })
        })
      }
    })

    return Array.from(stats.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allTasks])

  // Filter tasks for selected worker
  const filteredWorkerTasks = useMemo(() => {
    if (!selectedWorker) return []

    const workerStat = workerStats.find(w => w.name === selectedWorker)
    if (!workerStat) return []

    let tasks = workerStat.tasks

    // Apply date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom).setHours(0, 0, 0, 0)
      tasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt).setHours(0, 0, 0, 0)
        return taskDate >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo).setHours(23, 59, 59, 999)
      tasks = tasks.filter(task => {
        const taskDate = new Date(task.createdAt).setHours(0, 0, 0, 0)
        return taskDate <= toDate
      })
    }

    return tasks
  }, [selectedWorker, workerStats, dateFrom, dateTo])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6c757d'
      case 'assigned': return '#ffc107'
      case 'processing': return '#007bff'
      case 'done': return '#28a745'
      default: return '#6c757d'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'Todo'
      case 'assigned': return 'Assigned'
      case 'processing': return 'Processing'
      case 'done': return 'Done'
      default: return status
    }
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = dateFrom !== '' || dateTo !== ''

  const handleWorkerPaidToggle = (task: typeof filteredWorkerTasks[0], e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!task.allWorkers) return
    
    const updatedWorkers = task.allWorkers.map((worker, idx) => 
      idx === task.workerIndex ? { ...worker, paid: !worker.paid } : worker
    )
    
    updateTaskWorkerMutation.mutate({ taskId: task.id, workers: updatedWorkers })
  }

  // Loading and error states - AFTER all hooks
  if (itemsQuery.isLoading || workersQuery.isLoading) {
    return (
      <div className="page-container">
        <div className="loading">Loading workers...</div>
      </div>
    )
  }

  if (itemsQuery.error || workersQuery.error) {
    return (
      <div className="page-container">
        <div className="error">Error loading workers: {((itemsQuery.error || workersQuery.error) as Error).message}</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2>Workers</h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + Add Worker
          </button>
        </div>
        <div className="task-stats">
          <div className="stat-item">
            <span className="stat-number">{allWorkers.length}</span>
            <span className="stat-label">Total Workers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{workerStats.length}</span>
            <span className="stat-label">With Tasks</span>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: 16,
        marginBottom: 32
      }}>
        {allWorkers.map(worker => {
          const stats = workerStats.find(s => s.name === worker.name)
          return (
            <div
              key={worker.id}
              onClick={() => setSelectedWorker(worker.name)}
              style={{
                padding: 20,
                backgroundColor: selectedWorker === worker.name ? '#e3f2fd' : 'white',
                border: selectedWorker === worker.name ? '2px solid #007bff' : '1px solid #ddd',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selectedWorker === worker.name ? '0 2px 8px rgba(0,123,255,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 18, 
                  color: '#333',
                  fontWeight: 600
                }}>
                  {worker.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditModal(worker)
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Edit
                </button>
              </div>
              
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
                {worker.phone && <div>📞 {worker.phone}</div>}
                {worker.email && <div>📧 {worker.email}</div>}
                {worker.hourlyRate && <div>💵 ${worker.hourlyRate}/hr</div>}
              </div>
              
              {stats ? (
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.8 }}>
                  <div>Tasks: <strong>{stats.totalTasks}</strong> ({stats.completedTasks} completed)</div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
                    <div>Total Wages: <strong style={{ color: '#007bff' }}>${stats.totalWages.toFixed(2)}</strong></div>
                    <div style={{ color: '#28a745' }}>Paid: <strong>${stats.paidWages.toFixed(2)}</strong></div>
                    <div style={{ color: '#dc3545' }}>Unpaid: <strong>${stats.unpaidWages.toFixed(2)}</strong></div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>
                  No tasks assigned yet
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Worker Details */}
      {selectedWorker && (
        <div style={{ marginTop: 32 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16 
          }}>
            <h3 style={{ margin: 0 }}>Tasks for {selectedWorker}</h3>
            <button
              onClick={() => setSelectedWorker('')}
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
              Clear Selection
            </button>
          </div>

          {/* Date Filters */}
          <div className="filters-container" style={{ marginBottom: 16 }}>
            <div className="filters-header">
              <h3>Filters</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="clear-filters-btn">
                  Clear Filters
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div className="filter-item">
                <label>Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-item">
                <label>Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="table-container">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Customer</th>
                  <th>Plate No</th>
                  <th>Status</th>
                  <th>Wage</th>
                  <th>Paid</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkerTasks.length > 0 ? (
                  filteredWorkerTasks.map(task => (
                    <tr key={`${task.id}-${task.wage}`}>
                      <td>#{task.id}</td>
                      <td>{task.customer}</td>
                      <td className="plate-no-cell">{task.vehiclePlateNo}</td>
                      <td>
                        <span 
                          className="status-badge-table"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td>${task.wage.toFixed(2)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={task.paid} 
                          onChange={(e) => handleWorkerPaidToggle(task, e as any)}
                          style={{ cursor: 'pointer', width: 18, height: 18 }}
                          title={task.paid ? "Mark as unpaid" : "Mark as paid"}
                        />
                      </td>
                      <td>{new Date(task.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                      No tasks found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {filteredWorkerTasks.length > 0 && (
            <div style={{ 
              marginTop: 20, 
              padding: 16, 
              backgroundColor: '#f8f9fa', 
              borderRadius: 8,
              display: 'flex',
              gap: 32
            }}>
              <div>
                <strong>Filtered Tasks:</strong> {filteredWorkerTasks.length}
              </div>
              <div>
                <strong>Total Wages:</strong> ${filteredWorkerTasks.reduce((sum, t) => sum + t.wage, 0).toFixed(2)}
              </div>
              <div>
                <strong>Paid:</strong> <span style={{ color: '#28a745' }}>
                  ${filteredWorkerTasks.filter(t => t.paid).reduce((sum, t) => sum + t.wage, 0).toFixed(2)}
                </span>
              </div>
              <div>
                <strong>Unpaid:</strong> <span style={{ color: '#dc3545' }}>
                  ${filteredWorkerTasks.filter(t => !t.paid).reduce((sum, t) => sum + t.wage, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Worker Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} title="Add New Worker">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Name *"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Phone"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Address"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="number"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
            placeholder="Hourly Rate"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16,
              minHeight: 80,
              fontFamily: 'inherit',
              resize: 'vertical',
              color: 'white'
            }}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => { setIsAddModalOpen(false); resetForm(); }}
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
              onClick={handleAddWorker}
              disabled={!formData.name.trim() || createWorkerMutation.isPending}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                opacity: !formData.name.trim() || createWorkerMutation.isPending ? 0.6 : 1
              }}
            >
              {createWorkerMutation.isPending ? 'Adding...' : 'Add Worker'}
            </button>
          </div>
          {createWorkerMutation.error && (
            <div style={{ color: '#dc3545', fontSize: 14 }}>
              {(createWorkerMutation.error as Error).message}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Worker Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingWorker(null); resetForm(); }} title="Edit Worker">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Name *"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Phone"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Address"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <input
            type="number"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
            placeholder="Hourly Rate"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16
            }}
          />
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes"
            style={{
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16,
              minHeight: 80,
              fontFamily: 'inherit',
              resize: 'vertical',
              color: 'white'
            }}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 8 }}>
            <button
              onClick={() => editingWorker && handleDeleteWorker(editingWorker.id)}
              disabled={deleteWorkerMutation.isPending}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                opacity: deleteWorkerMutation.isPending ? 0.6 : 1
              }}
            >
              {deleteWorkerMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingWorker(null); resetForm(); }}
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
                onClick={handleEditWorker}
                disabled={!formData.name.trim() || updateWorkerMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: !formData.name.trim() || updateWorkerMutation.isPending ? 0.6 : 1
                }}
              >
                {updateWorkerMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          {updateWorkerMutation.error && (
            <div style={{ color: '#dc3545', fontSize: 14 }}>
              {(updateWorkerMutation.error as Error).message}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

