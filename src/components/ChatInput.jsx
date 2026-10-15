import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 질문 입력창 (유리 상자)
// - placement="top": 홈 상단, 스크롤해도 헤더 아래에 붙어 따라옴
// - placement="bottom": 분야 화면, 화면 아래에 떠 있음.
//   본문(main)의 등장 애니메이션 transform이 fixed 위치를 깨지 않도록 body에 포털로 붙이고,
//   본문이 가려지지 않게 실제 높이를 --chat-input-height 변수로 알려 준다.
export default function ChatInput({ placement = 'top' }) {
  const [text, setText] = useState('')
  const wrapperRef = useRef(null)
  const fieldRef = useRef(null)
  const isBottom = placement === 'bottom'

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

  const canSend = text.trim().length > 0

  const send = () => {
    const question = text.trim()
    if (!question) return
    // TODO: 질문 전송 API가 생기면 여기서 question을 보내고 입력창을 비운다
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
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="궁금한 IT 소식을 물어보세요..."
          aria-label="질문 입력"
        />
        <button type="submit" className="chat-input-send" disabled={!canSend}>
          질문
        </button>
      </form>
    </div>
  )

  return isBottom ? createPortal(input, document.body) : input
}
