import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import AllTasksPage from './pages/AllTasksPage'
import CustomersPage from './pages/CustomersPage'
import WorkersPage from './pages/WorkersPage'
import InvoicesPage from './pages/InvoicesPage'
import LoginPage from './pages/LoginPage'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  console.log('App component loaded - VERSION: 2024-10-15-v2')
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="app-layout">
                    <Header />
                    <main className="app-main">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/all-tasks" element={<AllTasksPage />} />
                        <Route path="/customers" element={<CustomersPage />} />
                        <Route path="/workers" element={<WorkersPage />} />
                        <Route path="/invoices" element={<InvoicesPage />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
