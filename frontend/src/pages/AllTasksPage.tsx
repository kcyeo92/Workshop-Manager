import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listItems, deleteItem, updateItem, addTaskEvent, type Item, type Worker } from '../api/items'
import { createInvoice, listInvoices } from '../api/invoices'
import { getCustomerByName, type Customer } from '../api/customers'
import TaskViewModal from '../components/TaskViewModal'
import InvoiceModal from '../components/InvoiceModal'
import CustomerDetailsModal from '../components/CustomerDetailsModal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function AllTasksPage() {
  const [selectedTask, setSelectedTask] = useState<Item | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [invoiceTasks, setInvoiceTasks] = useState<Item[]>([])
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set())
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<string | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    customer: '',
    worker: '',
    status: 'all' as 'all' | 'todo' | 'assigned' | 'processing' | 'done',
    dateFrom: '',
    dateTo: '',
    plateNo: '',
    invoiceGenerated: 'all' as 'all' | 'yes' | 'no'
  })
  const queryClient = useQueryClient()

  const itemsQuery = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => listItems(),
  })

  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: listInvoices
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  })

  const updateWorkerMutation = useMutation({
    mutationFn: ({ taskId, workers }: { taskId: number; workers: Worker[] }) => 
      updateItem(taskId, { workers }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  })

  const handleWorkerPaidToggle = (task: Item, workerIndex: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click
    if (!task.workers) return
    
    const updatedWorkers = task.workers.map((worker, idx) => 
      idx === workerIndex ? { ...worker, paid: !worker.paid } : worker
    )
    
    updateWorkerMutation.mutate({ taskId: task.id, workers: updatedWorkers })
  }

  const handleTaskClick = (task: Item) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleCustomerClick = async (customerName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const customer = await getCustomerByName(customerName)
      if (customer) {
        setSelectedCustomer(customer)
        setIsCustomerModalOpen(true)
      }
    } catch (error) {
      console.error('Failed to load customer:', error)
    }
  }

  const handleCustomerModalClose = () => {
    setIsCustomerModalOpen(false)
    setSelectedCustomer(null)
  }

  const handleInvoiceClick = async (task: Item, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Create and save the invoice
    const invoice = await createInvoice({
      taskIds: [task.id],
      customerName: task.customer,
      totalAmount: task.price,
      tasks: [task]
    })
    
    // Add task event for invoice generation
    await addTaskEvent(task.id, {
      type: 'invoice_generated',
      timestamp: Date.now(),
      invoiceNumber: invoice.id
    })
    
    setInvoiceTasks([task])
    setCurrentInvoiceNumber(invoice.id)
    setIsInvoiceModalOpen(true)
    
    // Invalidate queries to refresh the page
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['items'] })
  }

  const handleInvoiceModalClose = () => {
    setIsInvoiceModalOpen(false)
    setInvoiceTasks([])
    setCurrentInvoiceNumber(undefined)
  }

  const handleViewInvoice = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Find the invoice for this task
    const invoice = invoices.find(inv => inv.taskIds.includes(taskId))
    if (invoice) {
      setInvoiceTasks(invoice.tasks)
      setCurrentInvoiceNumber(invoice.id)
      setIsInvoiceModalOpen(true)
    }
  }

  const handleCheckboxChange = (taskId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const newSelected = new Set(selectedTaskIds)
    if (e.target.checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTaskIds(newSelected)
  }

  const handleGenerateInvoice = async () => {
    const tasksToInvoice = allTasks.filter(task => selectedTaskIds.has(task.id))
    if (tasksToInvoice.length > 0) {
      // Create and save the invoice
      const invoice = await createInvoice({
        taskIds: tasksToInvoice.map(t => t.id),
        customerName: tasksToInvoice[0].customer,
        totalAmount: tasksToInvoice.reduce((sum, task) => sum + task.price, 0),
        tasks: tasksToInvoice
      })
      
      // Add task event for invoice generation to all tasks
      await Promise.all(
        tasksToInvoice.map(task =>
          addTaskEvent(task.id, {
            type: 'invoice_generated',
            timestamp: Date.now(),
            invoiceNumber: invoice.id
          })
        )
      )
      
      setInvoiceTasks(tasksToInvoice)
      setCurrentInvoiceNumber(invoice.id)
      setIsInvoiceModalOpen(true)
      
      // Invalidate queries to refresh the page
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    }
  }

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

  if (itemsQuery.isLoading) {
    return (
      <div className="page-container">
        <div className="loading">Loading tasks...</div>
      </div>
    )
  }

  if (itemsQuery.error) {
    return (
      <div className="page-container">
        <div className="error">Error loading tasks: {(itemsQuery.error as Error).message}</div>
      </div>
    )
  }
  const allTasks = itemsQuery.data ?? []
  const invoices = invoicesQuery.data ?? []

  // Helper function to check if a task has been invoiced
  const isTaskInvoiced = (taskId: number): boolean => {
    return invoices.some(invoice => invoice.taskIds.includes(taskId))
  }

  // Helper function to get invoice date for a task
  const getInvoiceDate = (taskId: number): number | null => {
    const invoice = invoices.find(inv => inv.taskIds.includes(taskId))
    return invoice ? invoice.createdAt : null
  }

  // Helper function to format date with 2-digit year
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  // Apply filters
  const filteredTasks = allTasks.filter(task => {
    // Customer filter
    if (filters.customer && !task.customer.toLowerCase().includes(filters.customer.toLowerCase())) {
      return false
    }

    // Worker filter
    if (filters.worker) {
      if (!task.workers || task.workers.length === 0) return false
      const hasMatchingWorker = task.workers.some(w => w.name.toLowerCase().includes(filters.worker.toLowerCase()))
      if (!hasMatchingWorker) return false
    }

    // Status filter
    if (filters.status !== 'all' && task.status !== filters.status) {
      return false
    }

    // Plate number filter
    if (filters.plateNo && !task.vehiclePlateNo.toLowerCase().includes(filters.plateNo.toLowerCase())) {
      return false
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0)
      const taskDate = new Date(task.createdAt).setHours(0, 0, 0, 0)
      if (taskDate < fromDate) return false
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999)
      const taskDate = new Date(task.createdAt).setHours(0, 0, 0, 0)
      if (taskDate > toDate) return false
    }

    // Invoice generated filter
    if (filters.invoiceGenerated !== 'all') {
      const hasInvoice = isTaskInvoiced(task.id)
      if (filters.invoiceGenerated === 'yes' && !hasInvoice) return false
      if (filters.invoiceGenerated === 'no' && hasInvoice) return false
    }

    return true
  })

  // Pagination for all tasks
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  // Calculate totals and counts
  const activeTasks = filteredTasks.filter(task => task.status !== 'done')
  const completedTasks = filteredTasks.filter(task => task.status === 'done')
  const totalCharges = filteredTasks.reduce((sum, task) => sum + (task.price || 0), 0)
  const totalWages = filteredTasks.reduce((sum, task) => sum + (task.paid || 0), 0)

  // Get unique customers and workers for filter dropdowns
  const uniqueCustomers = Array.from(new Set(allTasks.map(t => t.customer))).sort()
  const uniqueWorkers = Array.from(new Set(allTasks.flatMap(t => (t.workers || []).map(w => w.name)))).sort()

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      customer: '',
      worker: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      plateNo: '',
      invoiceGenerated: 'all'
    })
    setCurrentPage(1) // Reset to first page when filters change
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'status' ? value !== '' : value !== 'all'
  )

  return (
    <div className="page-container">
      {/* Generate Invoice FAB */}
      {selectedTaskIds.size > 0 && (
        <button
          onClick={handleGenerateInvoice}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}
        >
           Generate ({selectedTaskIds.size})
        </button>
      )}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        </div>
        <div className="task-stats">
          <div className="stat-item">
            <span className="stat-number">{filteredTasks.length}</span>
            <span className="stat-label">Showing</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{activeTasks.length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{completedTasks.length}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">${totalCharges.toFixed(2)}</span>
            <span className="stat-label">Total Charges</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">${totalWages.toFixed(2)}</span>
            <span className="stat-label">Total Wages</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-container">
        <div className="filters-header">
          <h3>Filters</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear All
            </button>
          )}
        </div>
        
        <div className="filters-grid">
          {/* Status Filter */}
          <div className="filter-item">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="todo">Todo</option>
              <option value="assigned">Assigned</option>
              <option value="processing">Processing</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div className="filter-item">
            <label>Customer</label>
            <select
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              className="filter-select"
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map(customer => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>
          </div>

          {/* Worker Filter */}
          <div className="filter-item">
            <label>Worker</label>
            <select
              value={filters.worker}
              onChange={(e) => handleFilterChange('worker', e.target.value)}
              className="filter-select"
            >
              <option value="">All Workers</option>
              {uniqueWorkers.map(worker => (
                <option key={worker} value={worker}>{worker}</option>
              ))}
            </select>
          </div>

          {/* Plate Number Filter */}
          <div className="filter-item">
            <label>Plate Number</label>
            <input
              type="text"
              value={filters.plateNo}
              onChange={(e) => handleFilterChange('plateNo', e.target.value)}
              placeholder="Search plate..."
              className="filter-input"
            />
          </div>

          {/* Date From Filter */}
          <div className="filter-item">
            <label>Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Date To Filter */}
          <div className="filter-item">
            <label>Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Invoice Generated Filter */}
          <div className="filter-item">
            <label>Invoice</label>
            <select
              value={filters.invoiceGenerated}
              onChange={(e) => handleFilterChange('invoiceGenerated', e.target.value)}
              className="filter-select"
            >
              <option value="all">Invoice Status</option>
              <option value="yes">Generated</option>
              <option value="no">Not Generated</option>
            </select>
          </div>
        </div>
      </div>

      {/* All Tasks Section */}
      <div className="tasks-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="section-title">All Tasks ({filteredTasks.length})</h3>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
        </div>
        <div className="table-container">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>ID</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Plate No</th>
                <th>Vehicle</th>
                <th>Items</th>
                <th>Total</th>
                <th>Workers</th>
                <th>Wages</th>
                <th>Created</th>
                <th>Invoice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map(task => (
                <tr 
                  key={task.id} 
                  onClick={() => handleTaskClick(task)}
                  style={{ cursor: 'pointer', opacity: task.status === 'done' ? 0.7 : 1 }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(task.id)}
                      onChange={(e) => handleCheckboxChange(task.id, e)}
                      disabled={isTaskInvoiced(task.id)}
                      style={{ 
                        cursor: isTaskInvoiced(task.id) ? 'not-allowed' : 'pointer', 
                        width: 16, 
                        height: 16,
                        opacity: isTaskInvoiced(task.id) ? 0.5 : 1
                      }}
                      title={isTaskInvoiced(task.id) ? 'Invoice already generated' : ''}
                    />
                  </td>
                  <td>#{task.id}</td>
                  <td>
                    <span 
                      className="status-badge-table"
                      style={{ backgroundColor: getStatusColor(task.status) }}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </td>
                  <td 
                    onClick={(e) => handleCustomerClick(task.customer, e)}
                    style={{ 
                      color: '#007bff',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {task.customer}
                  </td>
                  <td className="plate-no-cell">{task.vehiclePlateNo}</td>
                  <td>{task.vehicleMake} {task.vehicleModel}</td>
                  <td>
                    <div className="line-items-cell">
                      {task.lineItems?.map((item, idx) => (
                        <div key={idx} className="line-item-row">
                          <span className="line-item-desc">{item.description}</span>
                          <span className="line-item-amount">${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td><strong>${task.price.toFixed(2)}</strong></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {task.workers && task.workers.length > 0 ? (
                      <div className="line-items-cell">
                        {task.workers.map((worker, idx) => (
                          <div key={idx} className="line-item-row">
                            <span className="line-item-desc">{worker.name}</span>
                            <span className="line-item-amount">${worker.wage.toFixed(2)}</span>
                            <input 
                              type="checkbox" 
                              checked={worker.paid} 
                              onChange={(e) => handleWorkerPaidToggle(task, idx, e as any)}
                              style={{ marginLeft: 8, cursor: 'pointer' }}
                              title={worker.paid ? "Paid" : "Not paid"}
                            />
                          </div>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{task.paid ? `$${task.paid.toFixed(2)}` : '-'}</td>
                  <td>{formatDate(task.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {isTaskInvoiced(task.id) ? (
                      <a
                        onClick={(e) => handleViewInvoice(task.id, e)}
                        style={{
                          fontSize: 12,
                          color: '#28a745',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {formatDate(getInvoiceDate(task.id)!)}
                      </a>
                    ) : (
                      <button
                        onClick={(e) => handleInvoiceClick(task, e)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        Invoice
                      </button>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {task.status === 'done' ? (
                      task.completedAt ? formatDate(task.completedAt) : '-'
                    ) : task.status === 'todo' ? (
                      <button
                        className="delete-button-table"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this task?')) {
                            deleteMutation.mutate(task.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        ×
                      </button>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 8, 
              marginTop: 20,
              paddingBottom: 20
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === 1 ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 14
                }}
              >
                {'<'}
              </button>
              
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === page ? '#007bff' : '#f0f0f0',
                      color: currentPage === page ? 'white' : 'black',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: currentPage === page ? 'bold' : 'normal'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === totalPages ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: 14
                }}
              >
                {'>'}
              </button>
            </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskViewModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        tasks={invoiceTasks}
        isOpen={isInvoiceModalOpen}
        onClose={handleInvoiceModalClose}
        invoiceNumber={currentInvoiceNumber}
      />

      {/* Customer Details Modal (Read-Only) */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={isCustomerModalOpen}
        onClose={handleCustomerModalClose}
      />
    </div>
  )
}
