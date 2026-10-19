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