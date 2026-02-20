import { useState, useEffect } from 'react'
import DeploymentForm from './components/DeploymentForm'
import DeploymentHistory from './components/DeploymentHistory'

function App() {
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

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__logo">
                    <div className="header__icon">🚀</div>
                    <h1 className="header__title">FeedMe Deployment Checklist</h1>
                </div>
                <p className="header__subtitle">Track and manage device deployment status</p>
                <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
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
            </nav>

            {/* Both always mounted, CSS show/hide to preserve form state */}
            <div className={`tab-content ${activeTab === 'form' ? 'tab-content--active' : ''}`}>
                <DeploymentForm onSuccess={() => { showToast('Deployment submitted successfully!'); }} />
            </div>
            <div className={`tab-content ${activeTab === 'history' ? 'tab-content--active' : ''}`}>
                <DeploymentHistory showToast={showToast} />
            </div>

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
