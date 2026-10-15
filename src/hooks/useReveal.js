import { useEffect, useRef } from 'react'

// 화면에 들어올 때 한 번만 나타나는 효과 (스태거 포함)
// - 돌려받은 ref를 목록을 감싼 요소에 달고, 나타날 항목에 data-reveal 속성을 붙인다.
// - 같은 순간에 들어온 항목들은 위에서부터 --reveal-index 순서로 차례로 나타난다.
//   (간격·최대 지연·거리·시간은 index.css의 --stagger-step 등 변수로 조절)
// - 상태는 React가 건드리지 않는 data-revealed 속성에 기록하므로
//   펼침 등으로 className이 바뀌어도 다시 숨겨지지 않는다.
const REVEAL_ANIMATION = 'reveal-up'

function byDomOrder(a, b) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

function markRunning(el, index) {
  el.style.setProperty('--reveal-index', index)
  el.dataset.revealed = 'running' // 애니메이션 중에만 will-change 적용
  const done = (e) => {
    if (e.target !== el || e.animationName !== REVEAL_ANIMATION) return
    el.dataset.revealed = 'done'
    el.removeEventListener('animationend', done)
  }
  el.addEventListener('animationend', done)
}

export function useReveal() {
  const ref = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => () => observerRef.current?.disconnect(), [])

  // 렌더마다 새로 생긴 항목만 찾아서 관찰 (로딩 → 내용 교체 시에도 따로 신경 쓸 필요 없음)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const pending = root.querySelectorAll('[data-reveal]:not([data-revealed])')
    if (pending.length === 0) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) {
      pending.forEach((el) => {
        el.dataset.revealed = 'done'
      })
      return
    }

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries, observer) => {
          entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => entry.target)
            .sort(byDomOrder)
            .forEach((el, index) => {
              observer.unobserve(el) // 한 번 나타나면 끝 (once)
              markRunning(el, index)
            })
        },
        { rootMargin: '0px 0px -8% 0px' },
      )
    }
    pending.forEach((el) => observerRef.current.observe(el))
  })

  return ref
}
