# Google Service Account Setup for Drive API

## Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **CREATE SERVICE ACCOUNT**
5. Fill in:
   - **Service account name**: `workshop-manager-drive`
   - **Service account ID**: (auto-generated)
   - **Description**: `Service account for Workshop Manager photo uploads`
6. Click **CREATE AND CONTINUE**
7. Skip the optional steps (Grant access, Grant users access)
8. Click **DONE**

## Step 2: Create Service Account Key

1. Click on the newly created service account
2. Go to the **KEYS** tab
3. Click **ADD KEY** → **Create new key**
4. Choose **JSON** format
5. Click **CREATE**
6. A JSON file will download - **SAVE THIS FILE SECURELY**
7. Rename it to `service-account-key.json`

## Step 3: Enable Google Drive API

1. Go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click **ENABLE**

## Step 4: Share Drive Folder with Service Account

1. Open [Google Drive](https://drive.google.com)
2. Create a folder called "Workshop Photos" (or use existing)
3. Right-click the folder → **Share**
4. In the service account JSON file, find the `client_email` field (looks like: `xxx@xxx.iam.gserviceaccount.com`)
5. Share the folder with this email address with **Editor** access
6. Copy the **Folder ID** from the URL (the part after `/folders/`)
   - Example: `https://drive.google.com/drive/folders/1ABC...XYZ`
   - Folder ID: `1ABC...XYZ`

## Step 5: Add to Backend

1. Move `service-account-key.json` to `/Users/kaichung/fullstack-app/backend/`
2. Add to `.gitignore` (don't commit this file!)
3. Add environment variables to `/Users/kaichung/fullstack-app/backend/.env`:
   ```
   GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
   ```

## Security Notes

- ⚠️ **NEVER** commit `service-account-key.json` to git
- ⚠️ Keep this file secure - it has access to your Drive
- ⚠️ For production, use environment variables or secret managers instead of file

---

Once you've completed these steps, let me know and I'll implement the backend code!

