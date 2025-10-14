# Railway Environment Variables Setup

## Required Environment Variables for Railway

You need to add these to your Railway backend project:

### 1. GOOGLE_DRIVE_FOLDER_ID
- **Value**: The ID of your "Workshop Photos" folder in Google Drive
- **How to get it**:
  1. Open your "Workshop Photos" folder in Google Drive
  2. Copy the ID from the URL
  3. Example: `https://drive.google.com/drive/folders/1ABC...XYZ`
  4. The ID is: `1ABC...XYZ`

### 2. GOOGLE_SERVICE_ACCOUNT_CREDENTIALS
- **Value**: The ENTIRE contents of your `service-account-key.json` file
- **Important**: Copy the entire JSON content (all 14 lines) as a single-line string
- **Format**: `{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"..."}`

## How to Add Variables to Railway

### Option 1: Using Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app/)
2. Select your backend project
3. Click on "Variables" tab
4. Click "+ New Variable"
5. Add:
   - `GOOGLE_DRIVE_FOLDER_ID` = `your_folder_id`
   - `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` = `{entire json content}`
6. Click "Deploy" to redeploy with new variables

### Option 2: Using Railway CLI
```bash
railway variables set GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
railway variables set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account",...}'
```

## Backend Code Update Needed

Since Railway uses environment variables (not files), we need to update the backend code to read credentials from the environment variable instead of a file.

---

**Let me know once you have the folder ID, and I'll update the backend code to work with Railway's environment variables!**

