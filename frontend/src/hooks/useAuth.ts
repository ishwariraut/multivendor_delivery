import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

// Configure axios defaults
axios.defaults.withCredentials = true;
const API_URL = 'http://localhost:3001';

interface User {
  id: string
  email: string
  name: string
  role: 'VENDOR' | 'DELIVERY_PARTNER' | 'CUSTOMER'
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setState({ user: null, isLoading: false, error: null })
      return
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setState({ user: response.data, isLoading: false, error: null })
    } catch (error) {
      console.error('Auth check failed:', error)
      setState({ user: null, isLoading: false, error: 'Authentication failed' })
      localStorage.removeItem('token')
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      setState({ user, isLoading: false, error: null })
      return user
    } catch (error: any) {
      console.error('Login failed:', error)
      const errorMessage = error.response?.data?.message || 'Login failed'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    role: User['role']
  ) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, { 
        email, 
        password, 
        name, 
        role 
      })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      setState({ user, isLoading: false, error: null })
      return user
    } catch (error: any) {
      console.error('Registration failed:', error)
      const errorMessage = error.response?.data?.message || 'Registration failed'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setState({ user: null, isLoading: false, error: null })
    router.push('/login')
  }

  return {
    ...state,
    login,
    register,
    logout,
  }
} 