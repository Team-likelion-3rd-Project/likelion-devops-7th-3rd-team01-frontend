import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// 화면에서 const { user, loading, login, signup, logout } = useAuth() 로 쓴다
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider 안에서만 useAuth를 쓸 수 있어요')
  return value
}