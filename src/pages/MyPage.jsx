import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchMyQuestions, fetchSavedArticles, fetchSavedQuestions } from '../api.js'
import { formatDateTime } from '../time.js'
import './MyPage.css'

const QUESTION_STATUS = {
  PENDING: { label: '대기 중', tone: 'pending' },
  PROCESSING: { label: '답변 만드는 중', tone: 'pending' },
  COMPLETED: { label: '완료', tone: 'done' },
  REJECTED: { label: '답할 수 없는 질문', tone: 'failed' },
  FAILED: { label: '실패', tone: 'failed' },
}

function QuestionItem({ item }) {
  const status = QUESTION_STATUS[item.status] ?? QUESTION_STATUS.PENDING
  return (
    <li className="mypage-item">
      <p className="mypage-item-title">{item.query}</p>
      <div className="mypage-item-meta">
        <span className={`question-status question-status--${status.tone}`}>{status.label}</span>
        <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
      </div>
    </li>
  )
}

function SavedQuestionItem({ item }) {
  return (
    <li className="mypage-item">
      <p className="mypage-item-title">{item.query}</p>
      <div className="mypage-item-meta">
        <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
      </div>
    </li>
  )
}

function SavedArticleItem({ item }) {
  return (
    <li className="mypage-item">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="mypage-item-link">
        <span className="mypage-item-title">{item.title}</span>
        <span className="visually-hidden"> (새 창에서 원문 열기)</span>
      </a>
      <div className="mypage-item-meta">
        <span className="mypage-item-press">{item.press}</span>
        <time dateTime={item.savedAt}>{formatDateTime(item.savedAt)} 저장</time>
      </div>
    </li>
  )
}

const TABS = [
  {
    key: 'questions',
    listKey: 'questions',
    label: '질문 목록',
    fetch: fetchMyQuestions,
    Item: QuestionItem,
    getKey: (item) => item.questionId,
    empty: { message: '아직 남긴 질문이 없어요', hint: '홈에서 궁금한 IT 소식을 물어보세요.', action: true },
  },
  {
    key: 'saved-questions',
    listKey: 'questions',
    label: '저장한 질문',
    fetch: fetchSavedQuestions,
    Item: SavedQuestionItem,
    getKey: (item) => item.questionId,
    empty: { message: '저장한 질문이 없어요', hint: '다시 보고 싶은 질문을 저장하면 여기에 모여요.' },
  },
  {
    key: 'saved-articles',
    listKey: 'articles',
    label: '저장한 기사',
    fetch: fetchSavedArticles,
    Item: SavedArticleItem,
    getKey: (item) => item.savedArticleId,
    empty: { message: '저장한 기사가 없어요', hint: '나중에 읽을 기사를 저장하면 여기에 모여요.' },
  },
]

const DEFAULT_TAB = TABS[0]

function TabPanel({ tab }) {
  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    tab.fetch(0).then(
      (data) => {
        if (!ignore) {
          setState({
            status: 'success',
            items: data[tab.listKey] ?? [],
            hasNext: data.hasNext === true,
            page: 0,
            loadingMore: false,
            moreError: false,
          })
        }
      },
      () => {
        if (!ignore) setState({ status: 'error' })
      },
    )
    return () => {
      ignore = true
    }
  }, [tab, attempt])

  const loadMore = () => {
    const nextPage = state.page + 1
    setState((prev) => ({ ...prev, loadingMore: true, moreError: false }))
    tab.fetch(nextPage).then(
      (data) => {
        setState((prev) => {
          // 목록이 중간에 바뀌어 같은 항목이 또 오면 건너뛴다
          const seen = new Set(prev.items.map(tab.getKey))
          const added = (data[tab.listKey] ?? []).filter((item) => !seen.has(tab.getKey(item)))
          return {
            ...prev,
            items: [...prev.items, ...added],
            hasNext: data.hasNext === true,
            page: nextPage,
            loadingMore: false,
          }
        })
      },
      () => {
        setState((prev) => ({ ...prev, loadingMore: false, moreError: true }))
      },
    )
  }

  if (state.status === 'loading') {
    return (
      <>
        <span className="visually-hidden" role="status">
          목록을 불러오는 중이에요
        </span>
        <ul className="mypage-list" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="mypage-item mypage-item--skeleton" aria-hidden="true">
              <span className="skeleton-bar skeleton-bar--wide" />
              <span className="skeleton-bar skeleton-bar--meta" />
            </li>
          ))}
        </ul>
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mypage-state swap-in" role="alert">
        <p className="mypage-state-message">목록을 불러오지 못했어요</p>
        <button
          type="button"
          className="page-state-action"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div className="mypage-state swap-in">
        <p className="mypage-state-message">{tab.empty.message}</p>
        <p className="mypage-state-hint">{tab.empty.hint}</p>
        {tab.empty.action && (
          <Link to="/" className="page-state-action">
            홈으로 가기
          </Link>
        )}
      </div>
    )
  }

  const { Item } = tab
  return (
    <>
      <ul className="mypage-list swap-in">
        {state.items.map((item) => (
          <Item key={tab.getKey(item)} item={item} />
        ))}
      </ul>
      {state.moreError && (
        <p className="mypage-state-hint" role="alert">
          더 불러오지 못했어요. 다시 눌러 주세요.
        </p>
      )}
      {state.hasNext && (
        <button
          type="button"
          className="page-state-action"
          onClick={loadMore}
          disabled={state.loadingMore}
        >
          {state.loadingMore ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </>
  )
}

export default function MyPage() {
  // TODO(#25): 로그인 여부 확인 후 비로그인이면 로그인 화면으로 보내기
  const [searchParams, setSearchParams] = useSearchParams()
  const current = TABS.find((t) => t.key === searchParams.get('tab')) ?? DEFAULT_TAB
  const tabRefs = useRef({})

  const selectTab = (key) => {
    setSearchParams({ tab: key }, { replace: true })
  }

  // 탭 목록의 키보드 이동 (← → Home End)
  const handleKeyDown = (e) => {
    const index = TABS.indexOf(current)
    const nextIndex = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    }[e.key]
    if (nextIndex === undefined) return
    e.preventDefault()
    const next = TABS[nextIndex]
    selectTab(next.key)
    tabRefs.current[next.key]?.focus()
  }

  return (
    <div className="mypage">
      <h1 className="page-title">마이페이지</h1>

      <div className="mypage-tabs" role="tablist" aria-label="마이페이지 목록" onKeyDown={handleKeyDown}>
        {TABS.map((t) => {
          const selected = t === current
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el
              }}
              type="button"
              role="tab"
              id={`mypage-tab-${t.key}`}
              className={`mypage-tab${selected ? ' is-current' : ''}`}
              aria-selected={selected}
              aria-controls="mypage-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(t.key)}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div
        id="mypage-panel"
        className="mypage-panel"
        role="tabpanel"
        aria-labelledby={`mypage-tab-${current.key}`}
      >
        {/* 탭이 바뀌면 목록 상태를 새로 시작 */}
        <TabPanel key={current.key} tab={current} />
      </div>
    </div>
  )
}