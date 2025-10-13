import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { listInvoices, deleteInvoice, updateInvoice, type Invoice } from '../api/invoices'
import { addTaskEvent } from '../api/items'
import InvoiceModal from '../components/InvoiceModal'

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: listInvoices
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  })

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsModalOpen(true)
  }

  const handleDeleteInvoice = (invoiceId: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate(invoiceId)
    }
  }

  const handlePaymentToggle = async (invoice: Invoice, currentStatus: boolean) => {
    const newStatus = !currentStatus
    const timestamp = Date.now()
    
    // Update invoice payment status
    await updateInvoice(invoice.id, { 
      paymentReceived: newStatus,
      paymentReceivedDate: newStatus ? timestamp : undefined
    })
    
    // If payment is received, add task event to all associated tasks
    if (newStatus) {
      await Promise.all(
        invoice.taskIds.map(taskId =>
          addTaskEvent(taskId, {
            type: 'payment_received',
            timestamp: timestamp,
            invoiceNumber: invoice.id
          })
        )
      )
    }
    
    // Invalidate queries to refresh
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['items'] })
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedInvoice(null)
  }

  // Sort invoices by creation date (newest first)
  const sortedInvoices = [...invoices].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Invoice History</h2>
        <div className="task-stats">
          <div className="stat-item">
            <span className="stat-label">Total Invoices:</span>
            <span className="stat-value" style={{ color: '#28a745' }}>{invoices.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Revenue:</span>
            <span className="stat-value" style={{ color: '#28a745' }}>
              ${invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Tasks</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
              <th style={{ textAlign: 'center' }}>Payment Received</th>
            </tr>
          </thead>
          <tbody>
            {sortedInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  No invoices generated yet
                </td>
              </tr>
            ) : (
              sortedInvoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>
                    <strong>{invoice.id}</strong>
                  </td>
                  <td>{invoice.customerName}</td>
                  <td>
                    {invoice.taskIds.map(taskId => `#${taskId}`).join(', ')}
                  </td>
                  <td>${invoice.totalAmount.toFixed(2)}</td>
                  <td>
                    {new Date(invoice.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 14
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="delete-button-table"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={invoice.paymentReceived}
                        onChange={() => handlePaymentToggle(invoice, invoice.paymentReceived)}
                        style={{ cursor: 'pointer', width: 18, height: 18 }}
                      />
                      {invoice.paymentReceived && invoice.paymentReceivedDate && (
                        <span style={{ fontSize: 12, color: '#6c757d' }}>
                          {new Date(invoice.paymentReceivedDate).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <InvoiceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          tasks={selectedInvoice.tasks}
          invoiceNumber={selectedInvoice.id}
          invoiceDate={selectedInvoice.createdAt}
        />
      )}
    </div>
  )
}

