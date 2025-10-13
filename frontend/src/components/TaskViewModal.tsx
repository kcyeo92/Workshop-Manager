import { useState, useEffect } from 'react'
import { type Item } from '../api/items'
import Modal from './Modal'
import TaskHistory from './TaskHistory'
import { 
  getTaskPhotos,
  fetchImageAsDataUrl,
  uploadTaskPhotos,
  type PhotoUploadResult 
} from '../services/googleDrive'
import { useAuth } from '../contexts/AuthContext'

interface TaskViewModalProps {
  task: Item | null
  isOpen: boolean
  onClose: () => void
}

export default function TaskViewModal({ task, isOpen, onClose }: TaskViewModalProps) {
  const [photos, setPhotos] = useState<PhotoUploadResult[]>([])
  const [photoDataUrls, setPhotoDataUrls] = useState<Record<string, string>>({})
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const { isAuthenticated } = useAuth()

  // Load photos when Google API is ready and task is available
  useEffect(() => {
    const loadPhotos = async () => {
      if (!isAuthenticated || !task || !task.customer || !task.vehiclePlateNo) {
        return
      }
      
      setIsLoadingPhotos(true)
      try {
        const taskPhotos = await getTaskPhotos(task.customer, task.vehiclePlateNo)
        setPhotos(taskPhotos)
        
        // Fetch image data URLs for all photos
        const dataUrls: Record<string, string> = {}
        await Promise.all(
          taskPhotos.map(async (photo) => {
            try {
              const dataUrl = await fetchImageAsDataUrl(photo.fileId)
              dataUrls[photo.fileId] = dataUrl
            } catch (error) {
              console.error(`Failed to load photo ${photo.fileName}:`, error)
            }
          })
        )
        setPhotoDataUrls(dataUrls)
      } catch (error) {
        console.error('Error loading photos:', error)
      } finally {
        setIsLoadingPhotos(false)
      }
    }

    if (isOpen && task) {
      loadPhotos()
    }
  }, [isOpen, task, isAuthenticated])

  // Clear photos when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhotos([])
      setPhotoDataUrls({})
      setSelectedPhotoIndex(null)
    }
  }, [isOpen])

  if (!task) return null

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !task.customer || !task.vehiclePlateNo) return

    setIsUploadingPhotos(true)
    try {
      const uploadedPhotos = await uploadTaskPhotos(
        Array.from(files),
        task.id,
        task.customer,
        task.vehiclePlateNo
      )
      
      // Fetch data URLs for newly uploaded photos
      const newDataUrls: Record<string, string> = {}
      await Promise.all(
        uploadedPhotos.map(async (photo) => {
          try {
            const dataUrl = await fetchImageAsDataUrl(photo.fileId)
            newDataUrls[photo.fileId] = dataUrl
          } catch (error) {
            console.error(`Failed to load photo ${photo.fileName}:`, error)
          }
        })
      )

      // Update state with new photos
      setPhotos(prev => [...prev, ...uploadedPhotos])
      setPhotoDataUrls(prev => ({ ...prev, ...newDataUrls }))
    } catch (error) {
      console.error('Failed to upload photos:', error)
      alert('Failed to upload photos. Please try again.')
    } finally {
      setIsUploadingPhotos(false)
      // Reset the input
      e.target.value = ''
    }
  }

  const getTotalAmount = () => {
    return task.lineItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
  }

  const getTotalWages = () => {
    return task.workers?.reduce((sum, worker) => sum + (worker.wage || 0), 0) || 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6c757d'
      case 'assigned': return '#ffc107'
      case 'processing': return '#17a2b8'
      case 'done': return '#28a745'
      default: return '#6c757d'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Task #${task.id}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status Badge */}
        <div style={{ 
          display: 'inline-flex',
          alignSelf: 'flex-start',
          padding: '6px 12px',
          backgroundColor: getStatusColor(task.status),
          color: 'white',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          {task.status}
        </div>

        {/* Photos Section */}
        {isAuthenticated && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              {photos.length > 0 ? (
                <a
                  href={`https://drive.google.com/drive/search?q=${task.customer.replace(/[^a-zA-Z0-9]/g, '_')}_${task.vehiclePlateNo.replace(/[^a-zA-Z0-9]/g, '_')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
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
                  📁 Photos ({photos.length})
                </a>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Photos</div>
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
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  padding: '6px 14px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isUploadingPhotos ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: isUploadingPhotos ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}>
                  {isUploadingPhotos ? '⏳ Uploading...' : '📷 Camera'}
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
                  padding: '6px 14px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isUploadingPhotos ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: isUploadingPhotos ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}>
                  {isUploadingPhotos ? '⏳ Uploading...' : '🖼️ Gallery'}
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
            
            {photos.length > 0 && (
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
                      width: 20,
                      height: 20,
                      border: '2px solid #ddd',
                      borderTop: '2px solid #007bff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {/* Customer & Vehicle Info */}
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          borderRadius: 8, 
          padding: 16,
          border: '1px solid #444'
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Customer</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{task.customer}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Plate Number</div>
              <div style={{ fontSize: 15, color: '#fff' }}>{task.vehiclePlateNo}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Vehicle</div>
              <div style={{ fontSize: 15, color: '#fff' }}>{task.vehicleMake} {task.vehicleModel}</div>
            </div>
          </div>

          {task.description && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #444' }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 14, color: '#fff', whiteSpace: 'pre-wrap' }}>{task.description}</div>
            </div>
          )}
        </div>

        {/* Items & Charges */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#fff' }}>Items & Charges</div>
          <div style={{ 
            backgroundColor: '#2a2a2a',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #444'
          }}>
            {task.lineItems?.map((item, index) => (
              <div 
                key={index}
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: index < (task.lineItems?.length || 0) - 1 ? '1px solid #444' : 'none'
                }}
              >
                <span style={{ color: '#fff', fontSize: 14 }}>{item.description}</span>
                <span style={{ color: '#4CAF50', fontWeight: 600, fontSize: 14 }}>${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#1a1a1a',
              fontWeight: 600
            }}>
              <span style={{ color: '#fff' }}>Total</span>
              <span style={{ color: '#4CAF50', fontSize: 16 }}>${getTotalAmount().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Assigned Workers */}
        {task.workers && task.workers.length > 0 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#fff' }}>Assigned Workers</div>
            <div style={{ 
              backgroundColor: '#2a2a2a',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid #444'
            }}>
              {task.workers.map((worker, index) => (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: index < (task.workers?.length || 0) - 1 ? '1px solid #444' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#fff', fontSize: 14 }}>{worker.name}</span>
                    {worker.paid && (
                      <span style={{ 
                        fontSize: 11,
                        padding: '2px 8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        borderRadius: 12
                      }}>
                        PAID
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#FFC107', fontWeight: 600, fontSize: 14 }}>${worker.wage.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#1a1a1a',
                fontWeight: 600
              }}>
                <span style={{ color: '#fff' }}>Total Wages</span>
                <span style={{ color: '#FFC107', fontSize: 16 }}>${getTotalWages().toFixed(2)}</span>
              </div>
            </div>
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

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 500
            }}
          >
            Close
          </button>
        </div>
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

