# Deployment Checklist for Centralized Photo Uploads

## ☑️ Prerequisites (Before Deployment)

### 1. Google Service Account Setup
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new Service Account (or use existing project)
- [ ] Enable Google Drive API
- [ ] Download the JSON key file (`service-account-key.json`)
- [ ] Copy the service account email (looks like `xxx@xxx.iam.gserviceaccount.com`)

### 2. Google Drive Folder Setup
- [ ] Go to your Google Drive
- [ ] Find or create the "Workshop Photos" folder
- [ ] Copy the folder ID from the URL (the part after `/folders/`)
- [ ] Right-click the folder → Share
- [ ] Paste the service account email
- [ ] Grant "Editor" access
- [ ] Click "Share"

### 3. Railway Environment Variables
- [ ] Go to [Railway Dashboard](https://railway.app/)
- [ ] Select your backend project
- [ ] Click "Variables" tab
- [ ] Add variable: `GOOGLE_DRIVE_FOLDER_ID` = `<your folder ID>`
- [ ] Add variable: `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` = `<entire JSON content from service-account-key.json>`
- [ ] Click "Deploy" (or wait for auto-deploy)

### 4. Deploy Backend
- [ ] The backend should auto-deploy after env variables are added
- [ ] Check Railway logs to confirm no errors
- [ ] Look for "Google Drive API initialized with service account" in logs

### 5. Deploy Frontend
- [ ] Frontend is already pushed to GitHub
- [ ] Vercel will auto-deploy
- [ ] Check Vercel deployment logs for any errors

## ☑️ Testing (After Deployment)

### Test Photo Upload
- [ ] Go to your app
- [ ] Click "Add New Task"
- [ ] Fill in customer name and plate number
- [ ] Upload a photo
- [ ] Click "Create Task"
- [ ] Wait for success message

### Test Photo Viewing
- [ ] Open the task you just created
- [ ] Check that the photo appears
- [ ] Click on the photo to open lightbox
- [ ] Verify photo loads correctly

### Test Google Drive
- [ ] Go to your Google Drive
- [ ] Navigate to: `Workshop Photos/2025/01/customer_platenumber/`
- [ ] Verify the photo is there
- [ ] Check that the folder structure is correct

## ☑️ Troubleshooting

If photos don't upload:
- [ ] Check Railway logs for errors
- [ ] Verify `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` is valid JSON
- [ ] Verify service account has access to the folder
- [ ] Check browser console for frontend errors

If photos don't display:
- [ ] Check that `VITE_API_BASE_URL` is set correctly in Vercel
- [ ] Check that backend is running and accessible
- [ ] Try accessing `https://your-backend-url.railway.app/api/photos?customer=test&plateNumber=test`

## 📝 Environment Variables Summary

### Railway (Backend)
```
DATABASE_URL=your_railway_postgres_url
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account",...}
```

### Vercel (Frontend)
```
VITE_API_BASE_URL=https://your-backend.railway.app/api
VITE_GEMINI_API_KEY=your_key
VITE_ALLOWED_EMAIL=email1@example.com,email2@example.com
```

---

## ✅ Completion

Once all items are checked:
- [ ] Take a test photo with your phone
- [ ] Create a task and upload the photo
- [ ] View the task and confirm photo displays
- [ ] Check Google Drive to confirm centralized storage
- [ ] Celebrate! 🎉

---

**Need Help?** Check `CENTRALIZED_PHOTOS_COMPLETE.md` for detailed information.

