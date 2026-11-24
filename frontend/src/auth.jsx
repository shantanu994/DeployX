import { useEffect, useState } from 'react'
import { api } from './api'
import { AuthCtx } from './auth-context'

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser)
  const [ready, setReady] = useState(() => !localStorage.getItem('token'))
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [sessionAttempt, setSessionAttempt] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      return
    }

    let active = true
    api.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) throw new Error('The backend did not return a user profile.')
        if (active) {
          localStorage.setItem('user', JSON.stringify(currentUser))
          setUser(currentUser)
          setAuthError('')
        }
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        } else {
          setAuthError(error.message)
          if (!storedUser()) setUser(null)
        }
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => { active = false }
  }, [sessionAttempt])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    if (!data?.token || !data?.user) {
      throw new Error('The backend returned an incomplete login response.')
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    setAuthError('')
    setAuthNotice('')
  }

  const clearSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setAuthError('')
    setReady(true)
  }

  const logout = async () => {
    const logoutRequest = localStorage.getItem('token') ? api.logout() : Promise.resolve()
    clearSession()

    let notice = ''
    try {
      await logoutRequest
    } catch (error) {
      notice = `Signed out locally, but the server could not revoke the token: ${error.message}`
    }
    setAuthNotice(notice)
  }

  const retrySession = () => {
    setAuthError('')
    setReady(false)
    setSessionAttempt((attempt) => attempt + 1)
  }

  return (
    <AuthCtx.Provider value={{ user, ready, authError, authNotice, login, logout, clearSession, retrySession }}>
      {children}
    </AuthCtx.Provider>
  )
}