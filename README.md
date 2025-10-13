# Workshop Management System

A full-stack application for managing workshop tasks, customers, workers, and invoices.

## Features

- 🎯 **Kanban Board** - Drag-and-drop task management (Todo → Assigned → Processing → Done)
- 👥 **Customer Management** - Track customer details with searchable dropdown
- 👷 **Worker Management** - Manage workers with wages and payment tracking
- 📋 **Line Items** - Reusable line item templates for common services
- 📸 **Photo Upload** - Google Drive integration with AI-powered vehicle info extraction
- 🤖 **AI Integration** - Gemini AI for analyzing vehicle photos
- 🧾 **Invoice Generation** - Create professional invoices with custom numbering
- 📊 **Task History** - Complete audit trail of all task changes
- 📱 **Responsive Design** - Mobile and tablet compatible

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- TanStack Query (React Query)
- React Router
- @hello-pangea/dnd (drag-and-drop)

### Backend
- Express.js + TypeScript
- Prisma ORM
- SQLite (development) / PostgreSQL (production)

### Integrations
- Google Drive API (photo storage)
- Google Gemini AI (photo analysis)
- Google OAuth (authentication)

## Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd fullstack-app
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Set up environment variables:

**Frontend** (`frontend/.env.local`):
```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_ALLOWED_EMAIL=your_email@example.com
```

**Backend** (`backend/.env`):
```
DATABASE_URL="file:./dev.db"
```

5. Initialize the database:
```bash
cd backend
npx prisma migrate dev
```

6. (Optional) View the database:
```bash
npx prisma studio
```

## Running the Application

### Development

1. Start the backend server:
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:4000`

2. Start the frontend dev server:
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

3. Open `http://localhost:5173` in your browser

## Database Schema

- **Worker** - Worker details and hourly rates
- **Customer** - Customer information
- **LineItemTemplate** - Reusable service descriptions
- **Item** - Main tasks/jobs
- **LineItem** - Individual charges per task
- **TaskWorker** - Worker assignments with wages
- **StatusHistory** - Task status changes
- **TaskEvent** - Invoice and payment events
- **Photo** - Task photos stored in Google Drive
- **Invoice** - Generated invoices
- **InvoiceSequence** - Invoice numbering

## Google API Setup

See `GOOGLE_DRIVE_SETUP.md` and `GEMINI_SETUP.md` for detailed instructions on setting up Google integrations.

## License

MIT
