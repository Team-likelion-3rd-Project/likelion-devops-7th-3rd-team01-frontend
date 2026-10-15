import homeMock from './mocks/home.json'
import categoryMock from './mocks/category.json'
import mypageMock from './mocks/mypage.json'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

// 응답의 mock 플래그를 공통 레이아웃(샘플 데이터 띠)과 공유하기 위한 작은 스토어
let mockFlag = USE_MOCK
const mockListeners = new Set()

export function subscribeMock(listener) {
  mockListeners.add(listener)
  return () => mockListeners.delete(listener)
}

export function getMockSnapshot() {
  return mockFlag
}

function trackMock(data) {
  const next = data?.mock === true
  if (next !== mockFlag) {
    mockFlag = next
    mockListeners.forEach((listener) => listener())
  }
  return data
}

function withMockMeta(data) {
  return { ...data, mock: true, generatedAt: new Date().toISOString() }
}

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(`요청 실패 (${res.status})`)
  }
  return res.json()
}

export async function fetchHome() {
  const data = USE_MOCK ? withMockMeta(homeMock) : await request('/news/home')
  return trackMock(data)
}

export async function fetchCategory(code) {
  if (USE_MOCK) {
    const data = categoryMock[code]
    if (!data) throw new Error('존재하지 않는 분야예요')
    return trackMock(withMockMeta(data))
  }
  return trackMock(await request(`/news/categories/${encodeURIComponent(code)}`))
}

// ---------- 마이페이지 ----------
// TODO: 실제 엔드포인트 경로는 백엔드 API 명세가 나오면 맞출 것 (응답 형태: { items: [...] })

export async function fetchMyQuestions() {
  if (USE_MOCK) return trackMock(withMockMeta({ items: mypageMock.questions }))
  return trackMock(await request('/me/questions'))
}

export async function fetchSavedQuestions() {
  if (USE_MOCK) return trackMock(withMockMeta({ items: mypageMock.savedQuestions }))
  return trackMock(await request('/me/saved-questions'))
}

export async function fetchSavedArticles() {
  if (USE_MOCK) return trackMock(withMockMeta({ items: mypageMock.savedArticles }))
  return trackMock(await request('/me/saved-articles'))
}
