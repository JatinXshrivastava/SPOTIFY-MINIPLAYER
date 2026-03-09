import { useState, useEffect } from 'react'
import MiniPlayer from './components/MiniPlayer'
import LoginScreen from './components/LoginScreen'

export default function App() {
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkToken()
        // Poll for token (in case user just logged in via browser)
        const interval = setInterval(checkToken, 3000)
        return () => clearInterval(interval)
    }, [])

    async function checkToken() {
        try {
            const res = await fetch('http://localhost:8888/token')
            const data = await res.json()
            if (data.token) {
                setToken(data.token)
            } else {
                setToken(null)
            }
        } catch {
            setToken(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="app-container">
                <div className="login-screen" style={{ justifyContent: 'center' }}>
                    <span style={{ fontSize: 20 }}>🎵</span>
                </div>
            </div>
        )
    }

    return (
        <div className="app-container">
            {token ? (
                <MiniPlayer token={token} onTokenExpired={() => setToken(null)} />
            ) : (
                <LoginScreen />
            )}
        </div>
    )
}
