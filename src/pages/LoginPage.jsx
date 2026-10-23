import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../authContext'
import './AuthPage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const location = useLocation()
  // 로그인이 필요한 화면에서 넘어왔으면 로그인 후 그 화면으로 돌아간다
  const from = location.state?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 이미 로그인한 상태이거나, 방금 로그인에 성공하면 원래 가려던 곳으로 보낸다
  if (!loading && user) return <Navigate to={from} replace />

  function validate() {
    const next = {}
    if (!email.trim()) next.email = '이메일을 입력해 주세요.'
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = '이메일 형식이 올바르지 않아요.'
    if (!password) next.password = '비밀번호를 입력해 주세요.'
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const next = validate()
    setErrors(next)
    setSubmitError('')
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
    } catch (e) {
      // 서버가 준 메시지(예: 이메일 또는 비밀번호가 올바르지 않습니다.)를 그대로 보여준다
      setSubmitError(
        e instanceof ApiError ? e.message : '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-title">로그인</h1>

        <label className="auth-field">
          <span>이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <em className="auth-error" role="alert">
              {errors.email}
            </em>
          )}
        </label>

        <label className="auth-field">
          <span>비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && (
            <em className="auth-error" role="alert">
              {errors.password}
            </em>
          )}
        </label>

        {submitError && (
          <p className="auth-submit-error" role="alert">
            {submitError}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>

        <p className="auth-switch">
          아직 계정이 없나요?{' '}
          <Link to="/signup" state={{ from }}>
            회원가입
          </Link>
        </p>
      </form>
    </section>
  )
}