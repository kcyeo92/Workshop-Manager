import Modal from './Modal'
import type { Customer } from '../api/customers'

interface CustomerDetailsModalProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
}

export default function CustomerDetailsModal({ customer, isOpen, onClose }: CustomerDetailsModalProps) {
  if (!customer) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Details">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>
            Name
          </label>
          <div style={{ fontSize: 16, color: 'grey' }}>{customer.name}</div>
        </div>

        {customer.phone && (
          <div>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>
              Phone
            </label>
            <div style={{ fontSize: 16, color: 'grey' }}>📞 {customer.phone}</div>
          </div>
        )}

        {customer.email && (
          <div>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>
              Email
            </label>
            <div style={{ fontSize: 16, color: 'grey' }}>📧 {customer.email}</div>
          </div>
        )}

        {customer.address && (
          <div>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>
              Address
            </label>
            <div style={{ fontSize: 16, color: 'grey' }}>📍 {customer.address}</div>
          </div>
        )}

        {customer.notes && (
          <div>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#666', display: 'block', marginBottom: 4 }}>
              Notes
            </label>
            <div style={{ 
              fontSize: 14, 
              color: 'white',
              padding: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 4,
              whiteSpace: 'pre-wrap'
            }}>
              {customer.notes}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

