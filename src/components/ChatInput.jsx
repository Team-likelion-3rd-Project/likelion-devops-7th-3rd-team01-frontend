import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, createQuestion } from '../api.js'
import { useAuth } from '../authContext.js'

const MAX_QUESTION_LENGTH = 500

// 로그인하러 갔다 오는 동안 입력한 질문이 사라지지 않도록 탭 단위로만 잠깐 보관한다
const DRAFT_KEY = 'pending-question'

function readDraft() {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(text) {
  try {
    sessionStorage.setItem(DRAFT_KEY, text)
  } catch {
    // 저장소를 쓸 수 없는 환경
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // 저장소를 쓸 수 없는 환경
  }
}

// 질문 입력창 (유리 상자)
// - placement="top": 홈 상단, 스크롤해도 헤더 아래에 붙어 따라옴
// - placement="bottom": 분야 화면, 화면 아래에 떠 있음.
//   본문(main)의 등장 애니메이션 transform이 fixed 위치를 깨지 않도록 body에 포털로 붙이고,
//   본문이 가려지지 않게 실제 높이를 --chat-input-height 변수로 알려 준다.
export default function ChatInput({ placement = 'top' }) {
  // 로그인하고 돌아왔다면 보관해 둔 질문으로 입력창을 채운다
  const [text, setText] = useState(readDraft)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const wrapperRef = useRef(null)
  const fieldRef = useRef(null)
  const isBottom = placement === 'bottom'
  const { user, loading, expire } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // 보관해 둔 질문은 한 번 꺼냈으면 지운다 (새로고침해도 다시 나타나지 않게)
  useEffect(() => {
    clearDraft()
  }, [])

  // 내용에 맞춰 높이 조절 (최대 높이는 CSS max-height가 제한, 넘치면 내부 스크롤)
  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [text])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!isBottom || !wrapper) return
    const root = document.documentElement
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty('--chat-input-height', `${entry.borderBoxSize[0].blockSize}px`)
    })
    observer.observe(wrapper)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--chat-input-height')
    }
  }, [isBottom])

  const canSend = text.trim().length > 0 && !sending

  // 로그인 후 지금 보던 화면으로 돌아오도록 현재 주소를 넘긴다 (RequireAuth와 같은 모양)
  const goToLogin = (question) => {
    writeDraft(question)
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
  }

  const send = async () => {
    const question = text.trim()
    if (!question || sending) return
    // 로그인 여부를 확인하는 동안(새로고침 직후)에는 보내지 않는다
    if (loading) return
    if (!user) {
      goToLogin(question)
      return
    }

    setSending(true)
    setError('')
    try {
      const { questionId } = await createQuestion(question)
      setText('')
      navigate(`/questions/${questionId}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // 쿠키가 만료된 경우: 앱의 로그인 상태도 비우고 로그인 화면으로 보낸다
        expire()
        goToLogin(question)
        return
      }
      // 400, 429 등 서버가 화면에 보여 주라고 준 문구는 그대로 쓰고, 그 외에는 일반 문구를 쓴다
      setError(
        e instanceof ApiError && e.status < 500
          ? e.message
          : '질문을 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    // 한글 조합 중 Enter는 무시 (조합 확정용 Enter가 전송되는 것 방지)
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const input = (
    <div className={`chat-input chat-input--${isBottom ? 'bottom' : 'top'}`} ref={wrapperRef}>
      <form
        className="chat-input-box"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={fieldRef}
          className="chat-input-field"
          rows={1}
          value={text}
          maxLength={MAX_QUESTION_LENGTH}
          readOnly={sending}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder="궁금한 IT 소식을 물어보세요..."
          aria-label="질문 입력"
        />
        <button type="submit" className="chat-input-send" disabled={!canSend}>
          {sending ? '보내는 중' : '질문'}
        </button>
      </form>
      {error && (
        <p className="chat-input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )

  return isBottom ? createPortal(input, document.body) : input
}