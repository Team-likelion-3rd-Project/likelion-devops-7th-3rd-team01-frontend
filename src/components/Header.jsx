import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext.js'
import { useGeneratedAt } from '../pageMetaContext.js'
import { formatGeneratedAt } from '../time.js'
import './HeaderAuth.css'

export default function Header() {
  const generatedAt = useGeneratedAt()
  const generatedLabel = generatedAt ? formatGeneratedAt(generatedAt) : null
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    // 먼저 홈으로 이동해야, 마이페이지의 로그인 확인(RequireAuth)이
    // 로그아웃을 보고 로그인 화면으로 보내지 않는다
    navigate('/')
    try {
      await logout()
    } catch {
      // 서버에 닿지 못하면 로그인 상태가 그대로 남는다. 다시 누르면 된다
    }
  }

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <Link to="/" className="header-title">
            IT 브리핑
          </Link>
          {generatedLabel && (
            <time className="header-time" dateTime={generatedAt}>
              {generatedLabel}
            </time>
          )}
        </div>
        <nav className="header-actions" aria-label="계정">
          {user && (
            <span className="header-user" title={user.email}>
              {user.nickname} 님
            </span>
          )}
          <Link to="/mypage" className="header-button header-button--outline">
            마이페이지
          </Link>
          {/* 로그인 여부를 확인하는 동안은 비워 둬서 버튼이 깜빡이지 않게 한다 */}
          {!loading &&
            (user ? (
              <button type="button" className="header-button" onClick={handleLogout}>
                로그아웃
              </button>
            ) : (
              <Link to="/login" className="header-button">
                로그인
              </Link>
            ))}
        </nav>
      </div>
    </header>
  )
}