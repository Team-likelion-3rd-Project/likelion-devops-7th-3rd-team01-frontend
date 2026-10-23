import { useEffect } from 'react'

const SCROLLED_AFTER = 8 // px — 이만큼 넘게 내리면 헤더에 그림자·유리 배경

// index.css 변수의 시간 값('400ms' / '0.4s')을 ms 숫자로
function readTimeVar(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const value = parseFloat(raw)
  if (Number.isNaN(value)) return fallback
  return raw.endsWith('ms') ? value : value * 1000
}

// 스크롤 상태를 <html>의 속성으로만 알린다 (React 다시 그리기 없음)
// - data-scrolled: 맨 위에서 벗어남 → 헤더 그림자
// - data-scrolling: 스크롤 중 → 입력창 살짝 흐리게, 멈추고 --scroll-idle-delay 뒤 해제
export function useScrollMotion() {
  useEffect(() => {
    const root = document.documentElement
    const idleDelay = readTimeVar('--scroll-idle-delay', 400)
    let frame = 0
    let idleTimer = 0
    let lastScrollY = window.scrollY

    const update = () => {
      frame = 0
      root.toggleAttribute('data-scrolled', window.scrollY > SCROLLED_AFTER)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        update()
        // 실제로 움직였을 때만 '스크롤 중'으로 표시
        if (window.scrollY === lastScrollY) return
        lastScrollY = window.scrollY
        root.setAttribute('data-scrolling', '')
        clearTimeout(idleTimer)
        idleTimer = setTimeout(() => root.removeAttribute('data-scrolling'), idleDelay)
      })
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      clearTimeout(idleTimer)
      root.removeAttribute('data-scrolled')
      root.removeAttribute('data-scrolling')
    }
  }, [])
}
