import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../authContext'
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
} from '../api'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 앱이 처음 켜져서 "로그인했는지" 확인하는 동안은 true
  const [loading, setLoading] = useState(true)

  // 새로고침해도 쿠키가 남아 있으면 /auth/me가 200을 줘서 로그인이 유지된다
  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (input) => {
    const me = await apiLogin(input)
    setUser(me)
    return me
  }, [])

  const signup = useCallback(async (input) => {
    const me = await apiSignup(input)
    setUser(me)
    return me
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  // 서버가 401(로그인 만료)을 줬을 때 호출한다. 서버 요청 없이 앱의 로그인 상태만 지운다.
  const expire = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, expire }),
    [user, loading, login, signup, logout, expire],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}