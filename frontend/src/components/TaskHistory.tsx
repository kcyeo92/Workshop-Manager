import type { StatusHistory, TaskEvent } from '../api/items'

interface TaskHistoryProps {
  createdAt: number
  statusHistory: StatusHistory[]
  taskEvents?: TaskEvent[]
}

export default function TaskHistory({ createdAt, statusHistory, taskEvents = [] }: TaskHistoryProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'Todo'
      case 'assigned': return 'Assigned'
      case 'processing': return 'Processing'
      case 'done': return 'Done'
      default: return status
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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateDuration = (startTime: number, endTime: number) => {
    const diff = endTime - startTime
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m`
    }
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#333' }}>Task History</h4>
      
      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          left: '0.5rem',
          top: '0.5rem',
          bottom: '0.5rem',
          width: '2px',
          backgroundColor: '#dee2e6'
        }} />

        {/* Status changes */}
        {statusHistory.map((history, index) => {
          const prevTimestamp = index === 0 ? createdAt : statusHistory[index - 1].timestamp
          const duration = calculateDuration(prevTimestamp, history.timestamp)
          
          return (
            <div key={index} style={{ marginBottom: '1rem', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.25rem',
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                backgroundColor: getStatusColor(history.status),
                border: '2px solid white'
              }} />
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600, color: '#333' }}>
                  {history.fromStatus && (
                    <span>
                      {getStatusLabel(history.fromStatus)} → {getStatusLabel(history.status)}
                    </span>
                  )}
                  {!history.fromStatus && getStatusLabel(history.status)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                  {formatTimestamp(history.timestamp)}
                  <span style={{ marginLeft: '0.5rem', color: '#007bff' }}>
                    ({duration})
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* Task events (invoice generation, payment received) */}
        {taskEvents.map((event, index) => {
          const eventColor = event.type === 'invoice_generated' ? '#17a2b8' : '#28a745'
          const eventLabel = event.type === 'invoice_generated' ? 'Invoice Generated' : 'Payment Received'
          
          return (
            <div key={`event-${index}`} style={{ marginBottom: '1rem', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.25rem',
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                backgroundColor: eventColor,
                border: '2px solid white'
              }} />
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600, color: '#333' }}>
                  {eventLabel}
                  {event.invoiceNumber && (
                    <span style={{ marginLeft: '0.5rem', color: eventColor, fontWeight: 500 }}>
                      #{event.invoiceNumber}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
