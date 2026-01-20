import axios from 'axios'
import { toast } from 'sonner'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error

    // Propagate backend error message if available
    if (response && response.data && typeof response.data.detail === 'string') {
      error.message = response.data.detail
    }

    if (response && response.status === 401) {
      const publicRoutes = ['/login', '/register', '/', '/docs']
      const isPublicRoute = publicRoutes.some(
        (route) =>
          window.location.pathname === route || window.location.pathname.startsWith('/docs/')
      )

      if (!isPublicRoute) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        toast.error('Session expired. Please login again.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
      }
    } else if (response && response.status === 403) {
      toast.error('You do not have permission to perform this action.')
    } else if (response && response.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)
