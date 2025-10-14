import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createItem, type LineItem } from '../api/items'
import Modal from './Modal'
import CustomerSelector from './CustomerSelector'
import LineItemSelector from './LineItemSelector'
import { uploadPhotos } from '../api/photos'
import { analyzeVehiclePhotos, extractVehicleInfo } from '../services/gemini'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddTaskModal({ isOpen, onClose }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    customer: '',
    vehiclePlateNo: '',
    vehicleMake: '',
    vehicleModel: '',
    description: ''
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount: 0 }
  ])
  const [photos, setPhotos] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>('')
  const queryClient = useQueryClient()

  const clearForm = () => {
    setFormData({
      customer: '',
      vehiclePlateNo: '',
      vehicleMake: '',
      vehicleModel: '',
      description: ''
    })
    setLineItems([{ description: '', amount: 0 }])
    setPhotos([])
    setGeminiAnalysis('')
  }

  const handleClose = () => {
    clearForm()
    onClose()
  }

  const createMutation = useMutation({
    mutationFn: (itemData: Omit<import('../api/items').Item, 'id' | 'status' | 'createdAt' | 'statusHistory' | 'price'>) => createItem(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      clearForm()
      onClose()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted!')
    console.log('Form data:', formData)
    console.log('Line items:', lineItems)
    
    // Only require customer
    if (!formData.customer.trim()) {
      console.log('Validation failed: Missing customer')
      alert('Please enter a customer name')
      return
    }
    
    // Validate line items - at least one with description (amount is optional)
    const validLineItems = lineItems.filter(li => li.description.trim())
    if (validLineItems.length === 0) {
      console.log('Validation failed: No valid line items')
      alert('Please add at least one item with a description')
      return
    }
    
    console.log('Validation passed! Creating task...')
    
    // Create the task immediately
    createMutation.mutate({
      customer: formData.customer.trim(),
      vehiclePlateNo: formData.vehiclePlateNo.trim() || 'N/A',
      vehicleMake: formData.vehicleMake.trim() || 'N/A',
      vehicleModel: formData.vehicleModel.trim() || 'N/A',
      description: formData.description.trim() || undefined,
      lineItems: validLineItems
    })
    
    // Upload photos in the background if there are any
    if (photos.length > 0) {
      const photosToUpload = [...photos]
      const customer = formData.customer
      const plateNo = formData.vehiclePlateNo
      
      // Upload in background (non-blocking)
      setTimeout(async () => {
        try {
          console.log('Starting background photo upload to backend...')
          await uploadPhotos(
            photosToUpload,
            customer,
            plateNo
          )
          console.log('Background photo upload completed')
        } catch (error) {
          console.error('Background photo upload failed:', error)
        }
      }, 0)
    }
  }

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement> | string) => {
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newPhotos = Array.from(files)
      setPhotos(prev => [...prev, ...newPhotos])
      
      // Optionally analyze photos with Gemini
      if (import.meta.env.VITE_GEMINI_API_KEY && newPhotos.length > 0) {
        setIsAnalyzing(true)
        try {
          // Try to extract vehicle info
          const vehicleInfo = await extractVehicleInfo(newPhotos)
          console.log('Gemini extracted vehicle info:', vehicleInfo)
          
          // Auto-fill form if data extracted
          if (vehicleInfo.plateNumber && !formData.vehiclePlateNo) {
            setFormData(prev => ({ ...prev, vehiclePlateNo: vehicleInfo.plateNumber || '' }))
          }
          if (vehicleInfo.make && !formData.vehicleMake) {
            setFormData(prev => ({ ...prev, vehicleMake: vehicleInfo.make || '' }))
          }
          if (vehicleInfo.model && !formData.vehicleModel) {
            setFormData(prev => ({ ...prev, vehicleModel: vehicleInfo.model || '' }))
          }
          
          // Analyze for damage (show in info box only, don't auto-fill description)
          const analysis = await analyzeVehiclePhotos(newPhotos)
          console.log('Gemini damage analysis:', analysis)
          setGeminiAnalysis(analysis.damageAssessment || analysis.additionalNotes || '')
        } catch (error) {
          console.error('Gemini analysis failed:', error)
        } finally {
          setIsAnalyzing(false)
        }
      }
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Task">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Customer and Plate Number */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <CustomerSelector
              value={formData.customer}
              onChange={handleChange('customer')}
              placeholder="Customer *"
              required
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
                fontSize: 16,
                backgroundColor: 'white',
                color: 'black'
              }}
              placeholder="Plate Number"
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
                fontSize: 16,
                backgroundColor: 'white',
                color: 'black'
              }}
              placeholder="Vehicle Make"
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
                fontSize: 16,
                backgroundColor: 'white',
                color: 'black'
              }}
              placeholder="Vehicle Model"
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
              backgroundColor: 'white',
              color: 'black'
            }}
            placeholder="Additional details (optional)"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label style={{
              padding: '4px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              flex: 1,
              textAlign: 'center'
            }}>
              {isAnalyzing ? '⏳' : '📷 Camera'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
                disabled={isAnalyzing}
              />
            </label>
            <label style={{
              padding: '4px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              flex: 1,
              textAlign: 'center'
            }}>
              {isAnalyzing ? '⏳' : '🖼️ Gallery'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
                disabled={isAnalyzing}
              />
            </label>
          </div>
          
          {/* Gemini Analysis Result */}
          {geminiAnalysis && (
            <div style={{
              marginTop: 8,
              padding: 8,
              backgroundColor: '#e3f2fd',
              borderRadius: 4,
              fontSize: 12,
              color: '#1976d2'
            }}>
              <strong>AI Analysis:</strong> {geminiAnalysis}
            </div>
          )}
          
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {photos.map((photo, index) => (
                <div 
                  key={index}
                  style={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Upload ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 20,
                      height: 20,
                      padding: 0,
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: 12,
                      lineHeight: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {photos.length > 0 && (
            <div style={{ fontSize: 12, color: '#6c757d', marginTop: 8 }}>
              {photos.length} photo{photos.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Line Items */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ flex: '0 0 70%', fontWeight: 500, fontSize: 14, textAlign: 'left' }}>Items & Charges *</label>
            <button
              type="button"
              onClick={addLineItem}
              style={{
                flex: '1',
                padding: '4px 10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              + Add Item
            </button>
          </div>
          
          {lineItems.map((lineItem, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: '0 0 70%' }}>
                <LineItemSelector
                  value={lineItem.description}
                  onChange={(description) => {
                    handleLineItemChange(index, 'description', description)
                  }}
                  placeholder="Select or enter item..."
                  required={index === 0}
                />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={lineItem.amount || ''}
                onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                style={{
                  flex: '1',
                  padding: 8,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14,
                  backgroundColor: 'white',
                  color: 'black'
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
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
            type="submit"
            disabled={createMutation.isPending}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              opacity: createMutation.isPending ? 0.6 : 1
            }}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>

        {/* Error Display */}
        {createMutation.error && (
          <div style={{ color: '#dc3545', fontSize: 14, marginTop: 8 }}>
            {createMutation.error?.message || 'An error occurred'}
          </div>
        )}
      </form>
    </Modal>
  )
}
