import { Link } from 'react-router-dom'
import { useGeneratedAt } from '../pageMetaContext.js'
import { formatGeneratedAt } from '../time.js'

export default function Header() {
  const generatedAt = useGeneratedAt()
  const generatedLabel = generatedAt ? formatGeneratedAt(generatedAt) : null

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
          <Link to="/mypage" className="header-button header-button--outline">
            마이페이지
          </Link>
          <Link to="/login" className="header-button">
            로그인
          </Link>
        </nav>
      </div>
    </header>
  )
}
