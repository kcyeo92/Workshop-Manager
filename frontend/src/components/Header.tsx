import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 18 }}>🚗 Workshop Manager</div>
          
          <nav className="header-nav">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}
            >
              Kanban Board
            </Link>
            <Link 
              to="/all-tasks" 
              className={`nav-link ${location.pathname === '/all-tasks' ? 'nav-link-active' : ''}`}
            >
              All Tasks
            </Link>
            <Link 
              to="/customers" 
              className={`nav-link ${location.pathname === '/customers' ? 'nav-link-active' : ''}`}
            >
              Customers
            </Link>
            <Link 
              to="/workers" 
              className={`nav-link ${location.pathname === '/workers' ? 'nav-link-active' : ''}`}
            >
              Workers
            </Link>
            <Link 
              to="/invoices" 
              className={`nav-link ${location.pathname === '/invoices' ? 'nav-link-active' : ''}`}
            >
              Invoices
            </Link>
          </nav>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src={user.picture}
                alt={user.name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '2px solid #ddd'
                }}
              />
              <span style={{ fontSize: 14, color: '#333' }}>{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d32f2f'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f44336'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
