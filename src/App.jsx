import { useState, useEffect } from 'react'
import PinLogin from './components/PinLogin'
import DeploymentForm from './components/DeploymentForm'
import DeploymentHistory from './components/DeploymentHistory'
import UserManagement from './components/UserManagement'

function App() {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('dcUser')) } catch { return null }
    })
    const [activeTab, setActiveTab] = useState('form')
    const [toast, setToast] = useState(null)
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light')
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 4000)
    }

    const handleLogin = (userData) => {
        setUser(userData)
        try { sessionStorage.setItem('dcUser', JSON.stringify(userData)) } catch { }
    }

    const handleLogout = () => {
        setUser(null)
        try { sessionStorage.removeItem('dcUser') } catch { }
    }

    // Show PIN login screen if not authenticated
    if (!user) {
        return (
            <div className="app">
                <PinLogin onLogin={handleLogin} />
                {toast && (
                    <div className={`toast toast--${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__topbar">
                    <span className="header-action-btn user-badge">
                        <span className="user-badge__icon">{user.is_admin ? '👑' : '👤'}</span>
                        <span className="user-badge__name">{user.name}</span>
                    </span>
                    <div className="header__topbar-right">
                        <button className="header-action-btn btn btn--secondary btn--sm" onClick={handleLogout} title="Logout">
                            🚪 Logout
                        </button>
                        <button className="header-action-btn theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                    </div>
                </div>
                <div className="header__logo">
                    <div className="header__icon">🚀</div>
                    <h1 className="header__title">FeedMe Deployment Checklist</h1>
                </div>
                <p className="header__subtitle">Track and manage device deployment status</p>
            </header>

            {/* Tabs */}
            <nav className="tabs">
                <button
                    className={`tabs__btn ${activeTab === 'form' ? 'tabs__btn--active' : ''}`}
                    onClick={() => setActiveTab('form')}
                >
                    📋 New Deployment
                </button>
                <button
                    className={`tabs__btn ${activeTab === 'history' ? 'tabs__btn--active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📊 Deployment History
                </button>
                {user.is_admin && (
                    <button
                        className={`tabs__btn ${activeTab === 'users' ? 'tabs__btn--active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        👥 Users
                    </button>
                )}
            </nav>

            {/* Tab content */}
            {activeTab === 'form' && (
                <DeploymentForm user={user} onSuccess={() => { showToast('Deployment submitted successfully!'); }} />
            )}
            {activeTab === 'history' && (
                <DeploymentHistory user={user} showToast={showToast} />
            )}
            {activeTab === 'users' && user.is_admin && (
                <UserManagement showToast={showToast} />
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast toast--${toast.type}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                </div>
            )}
        </div>
    )
}

export default App
