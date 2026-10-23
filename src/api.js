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

// 서버가 준 에러(code, message)를 화면까지 전달하기 위한 에러
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let data = null
    try {
      data = await res.json()
    } catch {
      // 본문이 없는 에러 응답
    }
        throw new ApiError(
      res.status,
      data?.code,
      data?.error ?? data?.message ?? `요청 실패 (${res.status})`,
    )
  }
  if (res.status === 204) return null
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
// 응답: { questions: [...], hasNext } / { articles: [...], hasNext }
// page는 0부터 시작하고, hasNext가 true이면 다음 페이지가 있다.

export async function fetchMyQuestions(page = 0) {
  if (USE_MOCK) {
    return trackMock(withMockMeta({ questions: mypageMock.questions, hasNext: false }))
  }
  return trackMock(await request(`/mypage/questions?page=${page}`))
}

export async function fetchSavedQuestions(page = 0) {
  if (USE_MOCK) {
    return trackMock(withMockMeta({ questions: mypageMock.savedQuestions, hasNext: false }))
  }
  return trackMock(await request(`/mypage/saved-questions?page=${page}`))
}

export async function fetchSavedArticles(page = 0) {
  if (USE_MOCK) {
    return trackMock(withMockMeta({ articles: mypageMock.savedArticles, hasNext: false }))
  }
  return trackMock(await request(`/mypage/saved-articles?page=${page}`))
}

// ---------- 질문하기 ----------
// POST /questions { query 1~500자 } → 202 { questionId, status: 'PENDING' }
// GET /questions/{id} → { questionId, status, query, answer, sources, saved, createdAt, completedAt }
// status: PENDING / PROCESSING / COMPLETED / REJECTED / FAILED
// 처리 중(PENDING, PROCESSING)에는 answer와 sources가 null이다.
export const QUESTION_DONE_STATUSES = ['COMPLETED', 'REJECTED', 'FAILED']

// 샘플 모드: 질문에 들어간 말로 상황을 흉내 낸다.
// "제한" → 하루 제한(429), "느림" → 계속 처리 중, "실패" → FAILED,
// "거절" → REJECTED, "없음" → 관련 기사 없음, 그 외 → 정상 답변
const mockQuestions = new Map()
let mockQuestionSeq = 0

const MOCK_SOURCES = [
  {
    press: '샘플일보',
    title: '샘플 기사 하나',
    url: 'https://example.com/news/1',
    publishedAt: '2026-10-19T09:00:00+09:00',
  },
  {
    press: '샘플일보',
    title: '샘플 기사 둘',
    url: 'https://example.com/news/2',
    publishedAt: '2026-10-18T15:30:00+09:00',
  },
  {
    press: '샘플IT',
    title: '샘플 기사 셋',
    url: 'https://example.com/news/3',
    publishedAt: '2026-10-17T11:10:00+09:00',
  },
]

function mockScenario(query) {
  if (query.includes('느림')) return 'slow'
  if (query.includes('실패')) return 'fail'
  if (query.includes('거절')) return 'reject'
  if (query.includes('없음')) return 'empty'
  return 'ok'
}

// 만든 지 1초까지 PENDING, 3초까지 PROCESSING, 그 뒤에 끝난다
function mockQuestionView(item) {
  const elapsed = Date.now() - item.startedAt
  const base = {
    questionId: item.id,
    query: item.query,
    saved: false,
    createdAt: new Date(item.startedAt).toISOString(),
    answer: null,
    sources: null,
    completedAt: null,
  }
  if (item.scenario === 'slow') return { ...base, status: 'PROCESSING' }
  if (elapsed < 1000) return { ...base, status: 'PENDING' }
  if (elapsed < 3000) return { ...base, status: 'PROCESSING' }

  const completedAt = new Date(item.startedAt + 3000).toISOString()
  switch (item.scenario) {
    case 'fail':
      return { ...base, status: 'FAILED', completedAt }
    case 'reject':
      return {
        ...base,
        status: 'REJECTED',
        answer: '뉴스와 관련된 질문에만 답할 수 있어요.',
        completedAt,
      }
    case 'empty':
      return {
        ...base,
        status: 'COMPLETED',
        answer: '[샘플 답변] 관련 기사를 찾지 못했어요.',
        sources: [],
        completedAt,
      }
    default:
      return {
        ...base,
        status: 'COMPLETED',
        answer: `[샘플 답변] '${item.query}'와 관련된 기사 ${MOCK_SOURCES.length}건을 찾았어요.`,
        sources: MOCK_SOURCES,
        completedAt,
      }
  }
}

export async function createQuestion(query) {
  if (USE_MOCK) {
    if (query.includes('제한')) {
      throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', '오늘 할 수 있는 질문을 모두 사용했어요')
    }
    mockQuestionSeq += 1
    mockQuestions.set(String(mockQuestionSeq), {
      id: mockQuestionSeq,
      query,
      scenario: mockScenario(query),
      startedAt: Date.now(),
    })
    return { questionId: mockQuestionSeq, status: 'PENDING' }
  }
  return request('/questions', { method: 'POST', body: { query } })
}

export async function fetchQuestion(questionId) {
  if (USE_MOCK) {
    const item = mockQuestions.get(String(questionId))
    if (!item) throw new ApiError(404, 'NOT_FOUND', '질문을 찾을 수 없어요')
    return mockQuestionView(item)
  }
  return request(`/questions/${encodeURIComponent(questionId)}`)
}

// ---------- 저장 · 삭제 ----------
// 성공하면 본문 없이 204가 와서 request()가 null을 돌려준다.

export async function saveQuestion(questionId) {
  if (USE_MOCK) return null
  return request(`/questions/${encodeURIComponent(questionId)}/saved`, { method: 'PUT' })
}

export async function unsaveQuestion(questionId) {
  if (USE_MOCK) return null
  return request(`/questions/${encodeURIComponent(questionId)}/saved`, { method: 'DELETE' })
}

export async function deleteQuestion(questionId) {
  if (USE_MOCK) return null
  return request(`/questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' })
}

// 로그인한 사용자가 저장한 기사 URL 목록 (비로그인이면 호출하지 않는다)
export async function fetchSavedArticleUrls() {
  if (USE_MOCK) return { urls: [] }
  return request('/saved-articles/urls')
}

export async function saveArticle({ title, url, press, publishedAt }) {
  if (USE_MOCK) return null
  return request('/saved-articles', { method: 'PUT', body: { title, url, press, publishedAt } })
}

export async function unsaveArticle(url) {
  if (USE_MOCK) return null
  return request(`/saved-articles?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
}

// ---------- 인증 ----------
// 실제 API: POST /auth/signup, POST /auth/login, POST /auth/logout, GET /auth/me
// 로그인 상태는 서버가 내려주는 쿠키(JWT)로 유지되므로 토큰을 직접 저장하지 않는다.
// 샘플 모드에서는 localStorage에 가짜 로그인 정보를 두고 흉내 낸다.
const MOCK_USER_KEY = 'mock-auth-user'

function readMockUser() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USER_KEY))
  } catch {
    return null
  }
}

function writeMockUser(user) {
  try {
    if (user) localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(MOCK_USER_KEY)
  } catch {
    // 저장소를 쓸 수 없는 환경
  }
}

function makeMockUser(email, nickname) {
  return { userId: 1, email, nickname: nickname || email.split('@')[0] }
}

// 로그인 안 한 상태(401)는 에러가 아니라 "로그인 안 됨"이므로 null을 돌려준다
export async function fetchMe() {
  if (USE_MOCK) return readMockUser()
  try {
    return await request('/auth/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export async function signup({ email, password, nickname }) {
  if (USE_MOCK) {
    const user = makeMockUser(email, nickname)
    writeMockUser(user)
    return user
  }
  return request('/auth/signup', { method: 'POST', body: { email, password, nickname } })
}

export async function login({ email, password }) {
  if (USE_MOCK) {
    const user = makeMockUser(email)
    writeMockUser(user)
    return user
  }
  return request('/auth/login', { method: 'POST', body: { email, password } })
}

export async function logout() {
  if (USE_MOCK) {
    writeMockUser(null)
    return
  }
  await request('/auth/logout', { method: 'POST' })
}