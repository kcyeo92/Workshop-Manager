# Google Drive Integration Setup

## Step 1: Google Cloud Console Configuration

### 1.1 Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Library**
4. Search and enable:
   - **Google Drive API**
   - **Google Picker API** (optional, for file picker)

### 1.2 Create Credentials

#### Get API Key:
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API Key
4. (Recommended) Click **Restrict Key** and set:
   - Application restrictions: **HTTP referrers (web sites)**
   - Add: `http://localhost:5173/*` and your production domain
   - API restrictions: Select **Google Drive API**

#### Get OAuth 2.0 Client ID:
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen first:
   - User Type: **External**
   - App name: Your app name
   - User support email: Your email
   - Scopes: Add `../auth/drive.file` (files created by the app)
   - Test users: Add your Gmail address
4. Application type: **Web application**
5. Name: Your app name
6. Authorized JavaScript origins:
   - `http://localhost:5173`
   - Add your production domain (e.g., `https://yourdomain.com`)
7. Authorized redirect URIs:
   - `http://localhost:5173`
   - Add your production domain
8. Click **Create**
9. Copy the **Client ID** (you don't need Client Secret for frontend apps)

## Step 2: Environment Variables

Create a `.env.local` file in `/Users/kaichung/fullstack-app/frontend/`:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_USE_MOCK=true
```

Replace the values with your actual credentials from Step 1.

**⚠️ Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 3: Restart Development Server

After adding the environment variables:

```bash
npm run dev
```

## How It Works

### Photo Upload Flow:
1. User selects/takes photos in AddTaskModal
2. When creating a task, the app:
   - Prompts for Google account authorization (first time only)
   - Creates a folder in Google Drive: `Workshop Photos/[TaskID]_[CustomerName]/`
   - Uploads all photos to that folder
   - Stores photo metadata (file ID, thumbnail link, view link) in the task

### Google Drive Folder Structure:
```
Google Drive
└── Workshop Photos/
    ├── 2025101101_John_Doe/
    │   ├── photo_1_timestamp.jpg
    │   ├── photo_2_timestamp.jpg
    │   └── photo_3_timestamp.jpg
    ├── 2025101102_Jane_Smith/
    │   └── photo_1_timestamp.jpg
    └── ...
```

### Viewing Photos:
- Thumbnail links are stored for quick preview
- View links allow opening full-resolution images in Google Drive
- Photos can be accessed from any device with the same Google account

## Troubleshooting

### "Failed to initialize Google APIs"
- Check that your Client ID and API Key are correct in `.env.local`
- Verify the APIs are enabled in Google Cloud Console
- Clear browser cache and try again

### "Access Blocked" or "Authorization Error"
- Make sure your email is added as a test user in OAuth consent screen
- Check that authorized origins/redirect URIs match your domain
- Try incognito mode to clear any cached permissions

### Photos not uploading
- Check browser console for errors
- Verify you granted Drive permissions when prompted
- Check your Google Drive storage quota (15GB free)

## Security Notes

- Only files created by your app are accessible (not your entire Drive)
- Each user's photos are stored in their own Google Drive
- Photos are private by default (not shared publicly)
- API Key should be restricted to your domains only

## Next Steps

- Photos are now uploaded to Google Drive automatically
- You can view/download photos from Google Drive
- Consider adding photo gallery view in TaskModal
- Add ability to delete photos from Drive


