import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../authContext.js'

// 이 안에 넣은 화면은 로그인한 사람만 볼 수 있다
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // 로그인 여부를 확인하는 동안(새로고침 직후)에는 쫓아내지 않고 기다린다
  if (loading) return null

  if (!user) {
    // 로그인 후 원래 가려던 주소로 돌아올 수 있게 현재 주소를 넘긴다
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}