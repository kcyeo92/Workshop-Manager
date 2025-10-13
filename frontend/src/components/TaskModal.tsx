import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { updateItem, deleteItem, type Item, type LineItem, type Worker } from '../api/items'
import { listWorkers } from '../api/workers'
import Modal from './Modal'
import CustomerSelector from './CustomerSelector'
import WorkerSelector from './WorkerSelector'
import LineItemSelector from './LineItemSelector'
import TaskHistory from './TaskHistory'
import { 
  getTaskPhotos,
  fetchImageAsDataUrl,
  uploadTaskPhotos,
  type PhotoUploadResult 
} from '../services/googleDrive'
import { useAuth } from '../contexts/AuthContext'

interface TaskModalProps {
  task: Item | null
  isOpen: boolean
  onClose: () => void
}

export default function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const [formData, setFormData] = useState({
    status: 'todo' as 'todo' | 'assigned' | 'processing' | 'done',
    customer: '',
    vehiclePlateNo: '',
    vehicleMake: '',
    vehicleModel: '',
    description: ''
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount: 0 }
  ])
  const [workers, setWorkers] = useState<Worker[]>([{ name: '', wage: 0, paid: false }])
  const [photos, setPhotos] = useState<PhotoUploadResult[]>([])
  const [photoDataUrls, setPhotoDataUrls] = useState<Record<string, string>>({})
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const workersQuery = useQuery({
    queryKey: ['workers'],
    queryFn: listWorkers,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Pick<Item, 'status' | 'customer' | 'vehiclePlateNo' | 'vehicleMake' | 'vehicleModel' | 'description' | 'lineItems' | 'workers' | 'paid'>>) => {
      if (!task) throw new Error('No task selected')
      return updateItem(task.id, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!task) throw new Error('No task selected')
      return deleteItem(task.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onClose()
    },
  })

  // Load task data and clear photo cache
  useEffect(() => {
    if (task) {
      setFormData({
        status: task.status || 'todo',
        customer: task.customer || '',
        vehiclePlateNo: task.vehiclePlateNo || '',
        vehicleMake: task.vehicleMake || '',
        vehicleModel: task.vehicleModel || '',
        description: task.description || ''
      })
      setLineItems(task.lineItems && task.lineItems.length > 0 ? task.lineItems : [{ description: '', amount: 0 }])
      setWorkers(task.workers && task.workers.length > 0 ? task.workers : [{ name: '', wage: 0, paid: false }])
      
      // Clear photo cache when task changes
      setPhotos([])
      setPhotoDataUrls({})
    }
  }, [task])

  // Load photos when Google API is ready and task is available
  useEffect(() => {
    const loadPhotos = async () => {
      // Wait for both Google API and task to be ready
      if (!isAuthenticated || !task || !task.customer || !task.vehiclePlateNo) {
        return
      }
      
      setIsLoadingPhotos(true)
      try {
        // Extract year and month from createdAt timestamp
        const createdDate = new Date(task.createdAt)
        const year = createdDate.getFullYear().toString()
        const month = (createdDate.getMonth() + 1).toString().padStart(2, '0')
        
        // Retrieve photos
        const taskPhotos = await getTaskPhotos(
          task.customer,
          task.vehiclePlateNo,
          year,
          month
        )
        
        setPhotos(taskPhotos)
        
        // Fetch actual image data as blobs
        const dataUrls: Record<string, string> = {}
        for (const photo of taskPhotos) {
          try {
            const dataUrl = await fetchImageAsDataUrl(photo.fileId)
            dataUrls[photo.fileId] = dataUrl
          } catch (error) {
            console.error('Failed to fetch image data for', photo.fileId, error)
          }
        }
        setPhotoDataUrls(dataUrls)
      } catch (error) {
        console.error('Failed to load photos:', error)
      } finally {
        setIsLoadingPhotos(false)
      }
    }

    // Only run if authenticated
    if (isAuthenticated) {
      loadPhotos()
    }
  }, [task, isAuthenticated])

  const handleSave = () => {
    if (!task || !formData.customer.trim()) return
    
    // Validate line items - at least one with description and amount > 0
    const validLineItems = lineItems.filter(li => li.description.trim() && li.amount > 0)
    if (validLineItems.length === 0) return
    
    // Filter out empty workers
    const validWorkers = workers.filter(w => w.name.trim() && w.wage > 0)
    
    // Calculate total wages automatically
    const totalWages = getTotalWages()
    
    updateMutation.mutate({ 
      status: formData.status,
      customer: formData.customer.trim(),
      vehiclePlateNo: formData.vehiclePlateNo.trim(),
      vehicleMake: formData.vehicleMake.trim(),
      vehicleModel: formData.vehicleModel.trim(),
      description: formData.description.trim() || undefined,
      lineItems: validLineItems,
      workers: validWorkers.length > 0 ? validWorkers : undefined,
      paid: totalWages > 0 ? totalWages : undefined
    })
  }

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | string) => {
    const value = typeof e === 'string' ? e : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string) => {
    const newLineItems = [...lineItems]
    if (field === 'amount') {
      newLineItems[index] = { ...newLineItems[index], amount: parseFloat(value) || 0 }
    } else {
      newLineItems[index] = { ...newLineItems[index], description: value }
    }
    setLineItems(newLineItems)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const getTotalAmount = () => {
    return lineItems.reduce((sum, li) => sum + (li.amount || 0), 0).toFixed(2)
  }

  const getTotalWages = () => {
    return workers.reduce((sum, w) => sum + (w.wage || 0), 0)
  }

  const addWorker = () => {
    setWorkers([...workers, { name: '', wage: 0, paid: false }])
  }

  const removeWorker = (index: number) => {
    if (workers.length > 1) {
      setWorkers(workers.filter((_, i) => i !== index))
    }
  }

  const handleWorkerChange = (index: number, field: keyof Worker, value: string | boolean) => {
    const newWorkers = [...workers]
    if (field === 'wage') {
      newWorkers[index] = { ...newWorkers[index], wage: parseFloat(value as string) || 0 }
    } else if (field === 'paid') {
      newWorkers[index] = { ...newWorkers[index], paid: value as boolean }
    } else if (field === 'name') {
      // When worker name changes, auto-fill wage from workers database if available
      const workerName = value as string
      newWorkers[index] = { ...newWorkers[index], name: workerName }
      
      // Find worker in database and auto-fill hourly rate as wage
      if (workerName && workersQuery.data) {
        const dbWorker = workersQuery.data.find(w => w.name === workerName)
        if (dbWorker && dbWorker.hourlyRate && newWorkers[index].wage === 0) {
          newWorkers[index] = { ...newWorkers[index], wage: dbWorker.hourlyRate }
        }
      }
    }
    setWorkers(newWorkers)
  }

  const handleDelete = () => {
    if (!task) return
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate()
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !task) return

    setIsUploadingPhotos(true)
    try {
      const newPhotos = Array.from(files)
      
      // Upload to Google Drive
      const uploadedPhotos = await uploadTaskPhotos(
        newPhotos,
        task.id,
        task.customer,
        task.vehiclePlateNo
      )

      // Fetch as data URLs and add to display
      const newDataUrls: Record<string, string> = {}
      for (const photo of uploadedPhotos) {
        try {
          const dataUrl = await fetchImageAsDataUrl(photo.fileId)
          newDataUrls[photo.fileId] = dataUrl
        } catch (error) {
          console.error('Failed to fetch uploaded image:', error)
        }
      }

      // Update state
      setPhotos(prev => [...prev, ...uploadedPhotos])
      setPhotoDataUrls(prev => ({ ...prev, ...newDataUrls }))
    } catch (error) {
      console.error('Failed to upload photos:', error)
      alert('Failed to upload photos. Please try again.')
    } finally {
      setIsUploadingPhotos(false)
    }
  }

  if (!task) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Task Details: ${task.id}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Photos Section */}
        {isAuthenticated && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              {photos.length > 0 && task.customer && task.vehiclePlateNo ? (
                <a
                  href={`https://drive.google.com/drive/search?q=${task.customer.replace(/[^a-zA-Z0-9]/g, '_')}_${task.vehiclePlateNo.replace(/[^a-zA-Z0-9]/g, '_')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: 500,
                    fontSize: 14,
                    color: '#007bff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none'
                  }}
                >
                  Photos 📁
                </a>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontWeight: 500, fontSize: 14 }}>Photos</label>
                  {isLoadingPhotos && (
                    <div style={{
                      width: 16,
                      height: 16,
                      border: '2px solid #ddd',
                      borderTop: '2px solid #007bff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  padding: '4px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isUploadingPhotos ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  opacity: isUploadingPhotos ? 0.6 : 1
                }}>
                  {isUploadingPhotos ? '⏳' : '📷'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhotos}
                    style={{ display: 'none' }}
                  />
                </label>
                <label style={{
                  padding: '4px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isUploadingPhotos ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  opacity: isUploadingPhotos ? 0.6 : 1
                }}>
                  {isUploadingPhotos ? '⏳' : '🖼️'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhotos}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
            
            {photos.length > 0 ? (
              <div style={{ 
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 8,
                marginBottom: 12
              }}>
                {photos.map((photo, index) => (
                  <div
                    key={photo.fileId}
                    onClick={() => photoDataUrls[photo.fileId] && setSelectedPhotoIndex(index)}
                    style={{
                      position: 'relative',
                      minWidth: 120,
                      width: 120,
                      height: 120,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '2px solid #ddd',
                      cursor: photoDataUrls[photo.fileId] ? 'pointer' : 'default',
                      transition: 'transform 0.2s',
                      backgroundColor: '#f5f5f5',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (photoDataUrls[photo.fileId]) {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.borderColor = '#007bff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.borderColor = '#ddd'
                    }}
                  >
                    {photoDataUrls[photo.fileId] ? (
                      <img
                        src={photoDataUrls[photo.fileId]}
                        alt={photo.fileName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 32,
                        opacity: 0.3
                      }}>
                        ⏳
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !isLoadingPhotos ? (
              <div style={{ 
                padding: 16, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 4, 
                textAlign: 'center',
                color: '#666',
                fontSize: 14
              }}>
                No photos found for this task
              </div>
            ) : null}
          </div>
        )}

        {/* Customer and Plate Number */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <CustomerSelector
              value={formData.customer}
              onChange={handleChange('customer')}
              placeholder="Customer *"
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={formData.vehiclePlateNo}
              onChange={handleChange('vehiclePlateNo')}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 16
              }}
              placeholder="Plate Number *"
            />
          </div>
        </div>

        {/* Vehicle Make and Model */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={formData.vehicleMake}
              onChange={handleChange('vehicleMake')}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 16
              }}
              placeholder="Vehicle Make *"
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={formData.vehicleModel}
              onChange={handleChange('vehicleModel')}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 16
              }}
              placeholder="Vehicle Model *"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16,
              minHeight: 60,
              fontFamily: 'inherit',
              resize: 'vertical',
              color: 'white'
            }}
            placeholder="Additional details (optional)"
          />
        </div>

        {/* Line Items */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Items & Charges</label>
            <button
              type="button"
              onClick={addLineItem}
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
              + Add Item
            </button>
          </div>
          
          {lineItems.map((lineItem, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 2 }}>
                <LineItemSelector
                  value={lineItem.description}
                  onChange={(description) => {
                    handleLineItemChange(index, 'description', description)
                  }}
                  placeholder="Select or enter item..."
                  required
                />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={lineItem.amount || ''}
                onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                style={{
                  flex: 1,
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
                placeholder="Amount"
              />
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          {/* Total */}
          <div style={{ 
            marginTop: 8, 
            paddingTop: 8, 
            borderTop: '1px solid #ddd',
            textAlign: 'right',
            fontWeight: 600,
            fontSize: 16
          }}>
            Total: ${getTotalAmount()}
          </div>
        </div>

        {/* Workers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Assigned Workers</label>
            <button
              type="button"
              onClick={addWorker}
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
              + Add Worker
            </button>
          </div>
          
          {workers.map((worker, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ flex: 2 }}>
                <WorkerSelector
                  value={worker.name}
                  onChange={(value) => handleWorkerChange(index, 'name', value)}
                  placeholder="Worker name"
                />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={worker.wage || ''}
                onChange={(e) => handleWorkerChange(index, 'wage', e.target.value)}
                style={{
                  flex: 1,
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
                placeholder="Wage"
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={worker.paid}
                  onChange={(e) => handleWorkerChange(index, 'paid', e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13 }}>Paid</span>
              </label>
              {workers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWorker(index)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
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

        {/* Status */}
        <div>
          <select
            value={formData.status}
            onChange={handleChange('status')}
            style={{
              width: '100%',
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16,
              backgroundColor: 'white',
              color: 'black'
            }}
          >
            <option value="todo">Status: Todo</option>
            <option value="assigned">Status: Assigned</option>
            <option value="processing">Status: Processing</option>
            <option value="done">Status: Done</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              opacity: deleteMutation.isPending ? 0.6 : 1
            }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
          
          <button
            onClick={onClose}
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
              onClick={handleSave}
              disabled={updateMutation.isPending || !formData.customer.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                opacity: updateMutation.isPending || !formData.customer.trim() ? 0.6 : 1
              }}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
        </div>

        {/* Error Display */}
        {(updateMutation.error || deleteMutation.error) && (
          <div style={{ color: '#dc3545', fontSize: 14, marginTop: 8 }}>
            {(updateMutation.error || deleteMutation.error)?.message || 'An error occurred'}
          </div>
        )}

        {/* Task History */}
        {task.createdAt && task.statusHistory && (
          <TaskHistory 
            createdAt={task.createdAt} 
            statusHistory={task.statusHistory}
            taskEvents={task.taskEvents}
          />
        )}
      </div>

      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && photoDataUrls[photos[selectedPhotoIndex]?.fileId] && (
        <div
          onClick={() => setSelectedPhotoIndex(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'white',
              color: 'black',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              fontSize: 24,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            ×
          </button>

          {/* Previous button */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPhotoIndex(selectedPhotoIndex - 1)
              }}
              style={{
                position: 'absolute',
                left: 20,
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '50%',
                width: 50,
                height: 50,
                fontSize: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ‹
            </button>
          )}

          {/* Next button */}
          {selectedPhotoIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPhotoIndex(selectedPhotoIndex + 1)
              }}
              style={{
                position: 'absolute',
                right: 20,
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '50%',
                width: 50,
                height: 50,
                fontSize: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ›
            </button>
          )}

          {/* Photo counter */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontSize: 16,
            fontWeight: 500,
            zIndex: 10001,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: 20
          }}>
            {selectedPhotoIndex + 1} / {photos.length}
          </div>

          {/* Image */}
          <img
            src={photoDataUrls[photos[selectedPhotoIndex].fileId]}
            alt={photos[selectedPhotoIndex].fileName}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
          />
        </div>
      )}
    </Modal>
  )
}
