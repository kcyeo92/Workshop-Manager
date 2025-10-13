# Workshop Management App

A modern workshop management application with AI-powered features, built with React + TypeScript + Vite.

## 🚀 Features

- **Kanban Board** - Drag-and-drop task management (Todo → Assigned → Processing → Done)
- **Task Management** - Track customers, vehicles, workers, charges
- **Invoice Generation** - Professional PDF invoices with multi-task support
- **Google Drive Integration** - Auto-upload photos to organized folders
- **AI-Powered Analysis** - Gemini AI extracts vehicle info and damage assessment from photos
- **Payment Tracking** - Track worker wages and payment status
- **Invoice History** - Track all generated invoices with payment status
- **Mobile Responsive** - Works on desktop, tablet, and mobile

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_USE_MOCK=true
```

### 3. Setup Google Drive API
See [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) for detailed instructions.

### 4. Setup Gemini AI (Optional)
See [GEMINI_SETUP.md](./GEMINI_SETUP.md) for AI photo analysis setup.

### 5. Run Development Server
```bash
npm run dev
```

## 🤖 AI Features

When you upload photos, Gemini AI will:
- 🔍 **Auto-detect** license plate numbers
- 🚗 **Identify** vehicle make, model, and color
- 💥 **Analyze** damage and suggest repairs
- 📝 **Auto-fill** form fields with extracted data

## 📸 Google Drive Integration

Photos are automatically organized:
```
Workshop Photos/
  └── 2025/
      └── 10/
          └── customer_ABC1234/
              ├── photo1.jpg
              ├── photo2.jpg
              └── ...
```

---

# Original Vite Template Info

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
