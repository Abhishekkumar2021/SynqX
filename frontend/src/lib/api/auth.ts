import { api } from './base'
import { type LoginRequest, type AuthToken, type RegisterRequest, type User } from './types'

export const loginUser = async (credentials: LoginRequest) => {
  const params = new URLSearchParams()
  params.append('username', credentials.username)
  params.append('password', credentials.password)

  const { data } = await api.post<AuthToken>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export const registerUser = async (payload: RegisterRequest) => {
  const { data } = await api.post<User>('/auth/register', payload)
  return data
}

export const getCurrentUser = async () => {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export const searchUsers = async (query: string) => {
  const { data } = await api.get<User[]>('/auth/users/search', {
    params: { q: query },
  })
  return data
}

export const updateUser = async (payload: Partial<User> & { password?: string }) => {
  const { data } = await api.patch<User>('/auth/me', payload)
  return data
}

export const deleteUser = async () => {
  await api.delete('/auth/me')
}

export const getOIDCLoginUrl = async () => {
  const { data } = await api.get<{ url: string }>('/auth/oidc/login_url')
  return data
}

export const oidcCallback = async (code: string) => {
  const { data } = await api.post<AuthToken>(`/auth/oidc/callback?code=${code}`)
  return data
}
