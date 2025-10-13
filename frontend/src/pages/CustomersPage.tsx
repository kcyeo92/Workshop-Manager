import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listItems, type Item } from '../api/items'
import { listCustomers, createCustomer, updateCustomer as updateCustomerDB, deleteCustomer, type Customer } from '../api/customers'
import Modal from '../components/Modal'

export default function CustomersPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })
  const queryClient = useQueryClient()

  const itemsQuery = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => listItems(),
  })

  const customersQuery = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => listCustomers(),
  })

  const createCustomerMutation = useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsAddModalOpen(false)
      resetForm()
    },
  })

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Customer> }) => 
      updateCustomerDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsEditModalOpen(false)
      setEditingCustomer(null)
      resetForm()
    },
  })

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const allTasks = itemsQuery.data ?? []
  const allCustomers = customersQuery.data ?? []

  // Get all customers with their statistics
  const customerStats = useMemo(() => {
    const stats = new Map<string, {
      name: string
      totalTasks: number
      completedTasks: number
      totalCharges: number
      totalWages: number
      tasks: Array<{
        id: number
        vehiclePlateNo: string
        status: string
        price: number
        paid: number
        createdAt: number
      }>
    }>()

    allTasks.forEach(task => {
      if (!task.customer.trim()) return

      if (!stats.has(task.customer)) {
        stats.set(task.customer, {
          name: task.customer,
          totalTasks: 0,
          completedTasks: 0,
          totalCharges: 0,
          totalWages: 0,
          tasks: []
        })
      }

      const customerStat = stats.get(task.customer)!
      customerStat.totalTasks++
      if (task.status === 'done') {
        customerStat.completedTasks++
      }
      customerStat.totalCharges += task.price || 0
      customerStat.totalWages += task.paid || 0
      customerStat.tasks.push({
        id: task.id,
        vehiclePlateNo: task.vehiclePlateNo,
        status: task.status,
        price: task.price,
        paid: task.paid || 0,
        createdAt: task.createdAt
      })
    })

    return Array.from(stats.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allTasks])


  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    })
  }

  const handleAddCustomer = () => {
    if (!formData.name.trim()) return

    createCustomerMutation.mutate({
      name: formData.name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined
    })
  }

  const handleEditCustomer = () => {
    if (!editingCustomer || !formData.name.trim()) return
    
    updateCustomerMutation.mutate({
      id: editingCustomer.id,
      updates: {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined
      }
    })
  }

  const openEditModal = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || ''
    })
    setIsEditModalOpen(true)
  }

  const handleCustomerClick = (customer: Customer) => {
    openEditModal(customer, { stopPropagation: () => {} } as React.MouseEvent)
  }

  const handleDeleteCustomer = (id: number) => {
    if (confirm('Are you sure you want to delete this customer? This will not affect existing task records.')) {
      deleteCustomerMutation.mutate(id)
    }
  }

  if (itemsQuery.isLoading || customersQuery.isLoading) {
    return (
      <div className="page-container">
        <div className="loading">Loading customers...</div>
      </div>
    )
  }

  if (itemsQuery.error || customersQuery.error) {
    return (
      <div className="page-container">
        <div className="error">Error loading customers: {((itemsQuery.error || customersQuery.error) as Error).message}</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2>Customers</h2>
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
            + Add Customer
          </button>
        </div>
        <div className="task-stats">
          <div className="stat-item">
            <span className="stat-number">{allCustomers.length}</span>
            <span className="stat-label">Total Customers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{customerStats.length}</span>
            <span className="stat-label">With Tasks</span>
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Tasks</th>
              <th>Total Charges</th>
              <th>Total Wages</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {allCustomers.map(customer => {
              const stats = customerStats.find(s => s.name === customer.name)
              return (
                <tr 
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 600 }}>{customer.name}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.address || '-'}</td>
                  <td>
                    {stats ? (
                      <span>{stats.totalTasks} ({stats.completedTasks} done)</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    {stats ? (
                      <span style={{ color: '#007bff', fontWeight: 600 }}>${stats.totalCharges.toFixed(2)}</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    {stats ? (
                      <span>${stats.totalWages.toFixed(2)}</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    {stats ? (
                      <span style={{ 
                        color: (stats.totalCharges - stats.totalWages) >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: 600
                      }}>
                        ${(stats.totalCharges - stats.totalWages).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} title="Add New Customer">
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
              onClick={handleAddCustomer}
              disabled={!formData.name.trim() || createCustomerMutation.isPending}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                opacity: !formData.name.trim() || createCustomerMutation.isPending ? 0.6 : 1
              }}
            >
              {createCustomerMutation.isPending ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
          {createCustomerMutation.error && (
            <div style={{ color: '#dc3545', fontSize: 14 }}>
              {(createCustomerMutation.error as Error).message}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingCustomer(null); resetForm(); }} title="Edit Customer">
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
              onClick={() => editingCustomer && handleDeleteCustomer(editingCustomer.id)}
              disabled={deleteCustomerMutation.isPending}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                opacity: deleteCustomerMutation.isPending ? 0.6 : 1
              }}
            >
              {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); resetForm(); }}
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
                onClick={handleEditCustomer}
                disabled={!formData.name.trim() || updateCustomerMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: !formData.name.trim() || updateCustomerMutation.isPending ? 0.6 : 1
                }}
              >
                {updateCustomerMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          {updateCustomerMutation.error && (
            <div style={{ color: '#dc3545', fontSize: 14 }}>
              {(updateCustomerMutation.error as Error).message}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

