import { useLayoutEffect } from 'react'

// key(주소)가 바뀔 때마다 대상 요소의 등장 애니메이션(index.css의 page-enter)을 처음부터 다시 재생
// 페이지를 다시 마운트하지 않으므로 화면 상태와 데이터 흐름은 그대로다.
export function usePageEnter(ref, key) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    el.removeAttribute('data-entering')
    void el.offsetWidth // 스타일을 한 번 계산시켜 같은 애니메이션이 다시 시작되게 함
    el.setAttribute('data-entering', '') // 애니메이션 중에만 will-change 적용

    const done = (e) => {
      if (e.target === el && e.animationName === 'page-enter') el.removeAttribute('data-entering')
    }
    el.addEventListener('animationend', done)
    return () => el.removeEventListener('animationend', done)
  }, [ref, key])
}
