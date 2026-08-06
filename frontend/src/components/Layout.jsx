import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'
import './Layout.css'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <span className="header-logo">🎷</span>
          <span className="header-title">Saxophonie Syncophonie</span>
        </div>
        <nav className="header-nav">
          <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            My Availability
          </NavLink>
          <NavLink to="/group" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Group View
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Settings
          </NavLink>
        </nav>
        <div className="header-user">
          <span className="user-name">{user?.displayName}</span>
          <button className="btn-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
