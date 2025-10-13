# Gemini AI Integration Setup

## Get Your Gemini API Key

### Step 1: Go to Google AI Studio
Visit: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### Step 2: Create API Key
1. Click **"Get API Key"** or **"Create API Key"**
2. Select a Google Cloud project (or create a new one)
3. Click **"Create API Key in new project"** (recommended) or select an existing project
4. **Copy the API key** - it will look like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Step 3: Add to Environment Variables

Add to your `.env.local` file:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_USE_MOCK=true
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

## What It Does

### Automatic Photo Analysis

When you upload photos, Gemini will automatically:

1. **Extract Vehicle Information:**
   - License plate number
   - Vehicle make (brand)
   - Vehicle model
   - Color
   - Auto-fills the form fields!

2. **Damage Assessment:**
   - Identifies visible damage
   - Describes scratches, dents, issues
   - Suggests repairs needed
   - Auto-fills the description field

3. **Additional Insights:**
   - Reads any visible text
   - Notes vehicle condition
   - Provides repair recommendations

### Example Workflow

1. Take/upload photo of vehicle
2. Wait 2-3 seconds while Gemini analyzes
3. Form auto-fills with:
   - Plate number
   - Make & model
   - Damage description
4. Review and adjust if needed
5. Add pricing and submit!

## Features

✅ **Auto-fill form fields** from photos
✅ **Damage detection** and description
✅ **Text extraction** (plate numbers, etc.)
✅ **Repair recommendations**
✅ **Visual feedback** during analysis

## API Pricing

Gemini 1.5 Flash is very affordable:
- **Free tier**: 15 requests per minute, 1 million requests per day
- Perfect for workshop use - essentially free!

Visit [https://ai.google.dev/pricing](https://ai.google.dev/pricing) for details.

## Troubleshooting

### "Gemini API key not configured"
- Make sure you added `VITE_GEMINI_API_KEY` to `.env.local`
- Restart the dev server after adding the key

### Analysis not working
- Check browser console for error messages
- Verify your API key is valid
- Check you haven't exceeded API quota (very unlikely)

### Inaccurate results
- Use clear, well-lit photos
- Include full view of license plate
- Multiple angles help improve accuracy

## Optional: Disable Gemini

If you want to disable AI analysis temporarily, just don't set the `VITE_GEMINI_API_KEY` in `.env.local`. The app will work normally without it.


