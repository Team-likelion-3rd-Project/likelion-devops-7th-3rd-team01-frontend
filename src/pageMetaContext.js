import { createContext, useContext, useEffect } from 'react'

// 헤더의 "MM/DD HH:mm 기준" 표시용 — 지금 보고 있는 페이지의 응답 generatedAt을 헤더와 공유
// 값과 setter를 나눠 두어, 값을 알리기만 하는 페이지는 값이 바뀌어도 다시 그려지지 않는다
export const GeneratedAtContext = createContext(null)
export const SetGeneratedAtContext = createContext(() => {})

// 헤더에서 읽기
export function useGeneratedAt() {
  return useContext(GeneratedAtContext)
}

// 페이지에서 알리기: 데이터를 받으면 값을 넘기고, 페이지를 떠나면 자동으로 지워진다
export function usePublishGeneratedAt(generatedAt) {
  const setGeneratedAt = useContext(SetGeneratedAtContext)

  useEffect(() => {
    setGeneratedAt(generatedAt ?? null)
  }, [setGeneratedAt, generatedAt])

  useEffect(() => () => setGeneratedAt(null), [setGeneratedAt])
}
