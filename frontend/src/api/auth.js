import api from './client'

export const login = (username, password) =>
  api.post('/auth/login/', { username, password })

export const register = (data) =>
  api.post('/auth/register/', data)

export const logout = (refresh) =>
  api.post('/auth/logout/', { refresh })

export const getMe = () =>
  api.get('/auth/me/')