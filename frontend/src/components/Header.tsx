import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div style={{ fontWeight: 600, fontSize: 18 }}>🚗 Workshop Manager</div>
        
        {/* Hamburger Menu Button (Mobile Only) */}
        <button
          className="hamburger-menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <nav className={`header-nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Kanban Board
            </Link>
            <Link 
              to="/all-tasks" 
              className={`nav-link ${location.pathname === '/all-tasks' ? 'nav-link-active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              All Tasks
            </Link>
            <Link 
              to="/customers" 
              className={`nav-link ${location.pathname === '/customers' ? 'nav-link-active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Customers
            </Link>
            <Link 
              to="/workers" 
              className={`nav-link ${location.pathname === '/workers' ? 'nav-link-active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Workers
            </Link>
            <Link 
              to="/invoices" 
              className={`nav-link ${location.pathname === '/invoices' ? 'nav-link-active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Invoices
            </Link>
          </nav>

        {user && (
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  )
}
