import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY || '')

// Convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Analyze photos with Gemini
export const analyzeVehiclePhotos = async (photos: File[]): Promise<{
  damageAssessment?: string
  vehicleCondition?: string
  recommendedRepairs?: string[]
  extractedText?: string
  additionalNotes?: string
}> => {
  if (!API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Convert all photos to base64
  const imagePromises = photos.map(async (photo) => ({
    inlineData: {
      data: await fileToBase64(photo),
      mimeType: photo.type
    }
  }))

  const imageParts = await Promise.all(imagePromises)

  const prompt = `Analyze these vehicle/workshop photos and provide:
1. Extracted Text: Any visible text (license plates, signs, labels, make and model of the vehicle)
2. For the license plate, can you add space between the letters and numbers

Format your response as JSON with keys: damageAssessment, vehicleCondition, recommendedRepairs (array), extractedText, additionalNotes`

  const result = await model.generateContent([prompt, ...imageParts])
  const response = await result.response
  const text = response.text()

  // Try to parse JSON response
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      return JSON.parse(jsonStr)
    }
    return JSON.parse(text)
  } catch {
    // If not JSON, return raw text
    return {
      additionalNotes: text
    }
  }
}

// Simpler version - just extract damage info
export const extractDamageInfo = async (photos: File[]): Promise<string> => {
  if (!API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Convert first photo to base64 (or all if you want to analyze multiple)
  const imageData = await fileToBase64(photos[0])

  const result = await model.generateContent([
    'Describe any damage, issues, or repairs needed based on this vehicle photo. Be specific and concise.',
    {
      inlineData: {
        data: imageData,
        mimeType: photos[0].type
      }
    }
  ])

  const response = await result.response
  return response.text()
}

// Extract specific information (plate number, make/model, etc.)
export const extractVehicleInfo = async (photos: File[]): Promise<{
  plateNumber?: string
  make?: string
  model?: string
  color?: string
  year?: string
}> => {
  if (!API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Convert all photos to base64 for better analysis
  const imagePromises = photos.map(async (photo) => ({
    inlineData: {
      data: await fileToBase64(photo),
      mimeType: photo.type
    }
  }))

  const imageParts = await Promise.all(imagePromises)

  const prompt = `Analyze ${photos.length > 1 ? 'these vehicle photos' : 'this vehicle photo'} and extract:
- License plate number (format with spaces: letters, then space, numbers, then space, final letter. Example: "SMT435L" should be "SMT 435 L", "SDG32R" should be "SDG 32 R")
- Vehicle make (brand)
- Vehicle model
- Vehicle color
- Approximate year

${photos.length > 1 ? 'Look at all the photos to get the most accurate information.' : ''}

Return ONLY a JSON object with keys: plateNumber, make, model, color, year
If you can't determine something, use null.
IMPORTANT: For plateNumber, always format with spaces between letter groups and numbers.`

  const result = await model.generateContent([prompt, ...imageParts])

  const response = await result.response
  const text = response.text()

  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      return JSON.parse(jsonStr)
    }
    return JSON.parse(text)
  } catch {
    return {}
  }
}

