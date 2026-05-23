import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/auth'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      getMe()
        .then(res => {
          setUser(res.data.user)
          setBusiness(res.data.business)
          setLocation(res.data.location)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          delete api.defaults.headers.common['Authorization']
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function handleLogin(data) {
    localStorage.setItem('access_token', data.tokens.access)
    localStorage.setItem('refresh_token', data.tokens.refresh)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.tokens.access}`
    setUser(data.user)
    setBusiness(data.business)
    setLocation(data.location)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    setBusiness(null)
    setLocation(null)
  }

  return (
    <AuthContext.Provider value={{ user, business, location, loading, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}