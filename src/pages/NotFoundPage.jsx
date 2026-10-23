import { Link } from 'react-router-dom'

export default function NotFoundPage({ message = '없는 페이지예요' }) {
  return (
    <div className="page-state swap-in" role="alert">
      <p className="page-state-message">{message}</p>
      <Link to="/" className="page-state-action">
        홈으로 가기
      </Link>
    </div>
  )
}
