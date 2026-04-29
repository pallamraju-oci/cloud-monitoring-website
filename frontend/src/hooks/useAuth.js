import { useAuthStore } from '../store/authStore'

export function useAuth() {
  return useAuthStore()
}

export function useRequireAuth() {
  const { token } = useAuthStore()
  return !!token
}
