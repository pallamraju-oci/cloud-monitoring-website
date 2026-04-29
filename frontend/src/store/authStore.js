import { create } from 'zustand'
import { login as apiLogin } from '../services/api'

const TOKEN_KEY = 'ocipulse_token'
const USER_KEY  = 'ocipulse_user'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user:  JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const data = await apiLogin(username, password)
      localStorage.setItem(TOKEN_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify({ username: data.username, role: data.role }))
      set({ token: data.access_token, user: { username: data.username, role: data.role }, loading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Login failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null })
  },

  clearError: () => set({ error: null }),
}))
