import { useState, useEffect } from 'react'
import App from './App'
import LoginPage from './components/LoginPage'
import * as api from './api'

// Decides what to show: a loading message, the login screen, or the real app.
// status: 'checking' | 'out' | 'in' | 'offline'
function Root() {
  const [status, setStatus] = useState(api.getToken() ? 'checking' : 'out')

  function checkSession() {
    if (!api.getToken()) {
      setStatus('out')
      return
    }

    setStatus('checking')
    api
      .fetchMe()
      .then(() => setStatus('in'))
      .catch(() => {
        // A rejected token already sent us to 'out'. Anything else means the server is unreachable.
        setStatus(api.getToken() ? 'offline' : 'out')
      })
  }

  useEffect(() => {
    // If the server ever says "not logged in", show the login screen
    api.setUnauthorizedHandler(() => setStatus('out'))
    checkSession()
  }, [])

  function handleLogout() {
    api.logout()
    setStatus('out')
  }

  if (status === 'checking') {
    return (
      <div className="login-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (status === 'offline') {
    return (
      <div className="login-screen">
        <div className="card empty">
          <span className="emoji">📡</span>
          <p>Cannot reach the server. Is it running?</p>
          <button className="btn btn-primary" onClick={checkSession}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (status === 'out') {
    return <LoginPage onLoggedIn={() => setStatus('in')} />
  }

  return <App onLogout={handleLogout} />
}

export default Root