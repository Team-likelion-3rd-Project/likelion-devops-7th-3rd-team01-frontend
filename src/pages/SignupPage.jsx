import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../authContext'
import './AuthPage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupPage() {
  const { user, loading, signup } = useAuth()
  const location = useLocation()
  const from = location.state?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordCheck, setPasswordCheck] = useState('')
  const [nickname, setNickname] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 이미 로그인한 상태이거나, 가입 직후(가입하면 바로 로그인 상태가 된다)에는 원래 가려던 곳으로 보낸다
  if (!loading && user) return <Navigate to={from} replace />

  function validate() {
    const next = {}
    if (!email.trim()) next.email = '이메일을 입력해 주세요.'
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = '이메일 형식이 올바르지 않아요.'

    if (!password) next.password = '비밀번호를 입력해 주세요.'
    else if (password.length < 8 || password.length > 64)
      next.password = '비밀번호는 8~64자로 입력해 주세요.'

    if (!passwordCheck) next.passwordCheck = '비밀번호를 한 번 더 입력해 주세요.'
    else if (password !== passwordCheck) next.passwordCheck = '비밀번호가 서로 달라요.'

    if (!nickname.trim()) next.nickname = '닉네임을 입력해 주세요.'
    else if (nickname.trim().length > 20) next.nickname = '닉네임은 20자 이하로 입력해 주세요.'
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
      await signup({ email: email.trim(), password, nickname: nickname.trim() })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_EMAIL') {
        // 이메일 칸 아래에 바로 보여준다
        setErrors({ email: e.message })
      } else {
        setSubmitError(
          e instanceof ApiError
            ? e.message
            : '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
        )
      }
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-title">회원가입</h1>

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
          <span>닉네임</span>
          <input
            type="text"
            autoComplete="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            aria-invalid={Boolean(errors.nickname)}
          />
          {errors.nickname && (
            <em className="auth-error" role="alert">
              {errors.nickname}
            </em>
          )}
        </label>

        <label className="auth-field">
          <span>비밀번호 (8~64자)</span>
          <input
            type="password"
            autoComplete="new-password"
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

        <label className="auth-field">
          <span>비밀번호 확인</span>
          <input
            type="password"
            autoComplete="new-password"
            value={passwordCheck}
            onChange={(e) => setPasswordCheck(e.target.value)}
            aria-invalid={Boolean(errors.passwordCheck)}
          />
          {errors.passwordCheck && (
            <em className="auth-error" role="alert">
              {errors.passwordCheck}
            </em>
          )}
        </label>

        {submitError && (
          <p className="auth-submit-error" role="alert">
            {submitError}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? '가입 중…' : '가입하기'}
        </button>

        <p className="auth-switch">
          이미 계정이 있나요?{' '}
          <Link to="/login" state={{ from }}>
            로그인
          </Link>
        </p>
      </form>
    </section>
  )
}