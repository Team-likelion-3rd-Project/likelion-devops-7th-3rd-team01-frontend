import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchCategory } from '../api.js'
import { CATEGORIES, getCategoryLabel, isValidCategory } from '../categories.js'
import ChatInput from '../components/ChatInput.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { usePublishGeneratedAt } from '../pageMetaContext.js'
import { formatRelativeTime, isStaleAt } from '../time.js'
import NotFoundPage from './NotFoundPage.jsx'
import './CategoryPage.css'

const MAX_ISSUES = 5
const PANEL_TRANSITION_MS = 320 // CategoryPage.css의 .issue-panel 펼침 시간(0.3s)보다 조금 길게
const SCROLL_GAP = 16 // 헤더·입력창과 카드 사이에 남길 여백

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 펼친 카드의 아래쪽이 화면 아래 입력창에 가려지면, 가려진 만큼만 올린다.
// 단, 카드 제목이 헤더 밑으로 숨을 만큼은 올리지 않는다 (긴 카드는 제목이 헤더 바로 아래에 오는 데까지).
function scrollCardClearOfOverlays(card) {
  const rect = card.getBoundingClientRect()
  const headerBottom = document.querySelector('.header')?.getBoundingClientRect().bottom ?? 0
  const inputHeight =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--chat-input-height')) || 0
  const visibleBottom = window.innerHeight - inputHeight

  const hiddenBelow = rect.bottom + SCROLL_GAP - visibleBottom
  if (hiddenBelow <= 0) return
  const roomAbove = rect.top - headerBottom - SCROLL_GAP
  const delta = Math.min(hiddenBelow, roomAbove)
  if (delta <= 0) return
  window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export default function CategoryPage() {
  const { code } = useParams()
  if (!isValidCategory(code)) return <NotFoundPage message="없는 분야예요" />
  // code가 바뀌면 상태(펼친 이슈 등)를 초기화하기 위해 key로 다시 마운트
  return <CategoryContent key={code} code={code} />
}

function ChevronIcon() {
  return (
    <svg
      className="issue-chevron"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CategoryNav({ current }) {
  const listRef = useRef(null)
  const activeRef = useRef(null)

  // 좁은 화면에서 현재 분야 버튼이 보이도록 가로 스크롤만 맞춤 (세로 스크롤은 건드리지 않음)
  useLayoutEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list || !active) return
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
  }, [current])

  return (
    <nav className="category-nav" aria-label="분야 이동">
      <ul className="category-nav-list" ref={listRef}>
        {CATEGORIES.map(({ code, label }) => {
          const isCurrent = code === current
          return (
            <li key={code} ref={isCurrent ? activeRef : undefined}>
              <Link
                to={`/category/${code}`}
                className={`category-pill${isCurrent ? ' is-current' : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function CategoryContent({ code }) {
  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const revealRef = useReveal()
  const scrolledRef = useRef(false)
  const openScrollTimerRef = useRef(0)

  useEffect(() => () => clearTimeout(openScrollTimerRef.current), [])

  useEffect(() => {
    let ignore = false
    fetchCategory(code).then(
      (data) => {
        if (ignore) return
        setState({
          status: 'success',
          data,
          isStale: isStaleAt(data.generatedAt),
          fetchedAt: Date.now(),
        })
      },
      () => {
        if (!ignore) setState({ status: 'error' })
      },
    )
    return () => {
      ignore = true
    }
  }, [code, attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  const data = state.status === 'success' ? state.data : null
  const issues = (data?.issues ?? []).slice(0, MAX_ISSUES)
  usePublishGeneratedAt(data?.generatedAt)

  // 펼친 이슈는 URL(?issue=)이 기준 — 새로고침·공유해도 유지. 없거나 목록에 없는 값이면 모두 닫힘
  const issueParam = searchParams.get('issue')
  const openId = issues.find((issue) => String(issue.issueId) === issueParam)?.issueId ?? null

  // 한 번에 하나만 펼침: 다른 이슈를 누르면 URL의 issue 값이 바뀌고, 같은 이슈를 다시 누르면 접힘
  const toggleIssue = (issueId) => {
    const opening = openId !== issueId
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (openId === issueId) next.delete('issue')
        else next.set('issue', String(issueId))
        return next
      },
      { replace: true },
    )

    // 펼침 애니메이션이 끝난 뒤 위치로 판단해, 펼친 내용이 아래 입력창에 가리지 않게
    clearTimeout(openScrollTimerRef.current)
    if (!opening) return
    openScrollTimerRef.current = setTimeout(() => {
      const card = document.getElementById(`issue-${issueId}`)
      if (card) scrollCardClearOfOverlays(card)
    }, PANEL_TRANSITION_MS)
  }

  // 처음 열렸을 때 펼쳐진 이슈가 보이도록 한 번만 스크롤 (위쪽은 헤더 높이만큼 scroll-margin-top)
  useEffect(() => {
    if (state.status !== 'success' || scrolledRef.current) return
    scrolledRef.current = true
    if (openId == null) return
    const target = document.getElementById(`issue-${openId}`)
    if (!target) return
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [state.status, openId])

  return (
    <div className="category-page" ref={revealRef}>
      <div className="category-heading">
        <h1 className="page-title">{getCategoryLabel(code)}</h1>
        {state.isStale && (
          <p className="stale-notice swap-in" role="status">
            뉴스 갱신이 지연되고 있어요
          </p>
        )}
      </div>

      <CategoryNav current={code} />

      {state.status === 'loading' && (
        <>
          <span className="visually-hidden" role="status">
            뉴스를 불러오는 중이에요
          </span>
          <ul className="issue-list" aria-busy="true">
            {Array.from({ length: MAX_ISSUES }, (_, i) => (
              <li key={i} className="issue-card issue-card--skeleton" aria-hidden="true">
                <span className="skeleton-bar skeleton-line" />
                <span className="skeleton-bar skeleton-dot" />
              </li>
            ))}
          </ul>
        </>
      )}

      {state.status === 'error' && (
        <div className="page-state swap-in" role="alert">
          <p className="page-state-message">뉴스를 불러오지 못했어요</p>
          <button type="button" className="page-state-action" onClick={retry}>
            다시 시도
          </button>
        </div>
      )}

      {data && issues.length === 0 && (
        <p className="category-empty swap-in">아직 요약이 없어요</p>
      )}

      {issues.length > 0 && (
        <ul className="issue-list">
          {issues.map((issue) => (
            <IssueItem
              key={issue.issueId}
              issue={issue}
              expanded={openId === issue.issueId}
              onToggle={toggleIssue}
              now={state.fetchedAt}
            />
          ))}
        </ul>
      )}

      <ChatInput placement="bottom" />
    </div>
  )
}

function IssueItem({ issue, expanded, onToggle, now }) {
  const buttonId = `issue-${issue.issueId}-button`
  const panelId = `issue-${issue.issueId}-panel`
  const { summary, keyPoints = [], timeline = [], glossary = [], sources = [] } = issue

  return (
    <li
      id={`issue-${issue.issueId}`}
      className={`issue-card${expanded ? ' is-expanded' : ''}`}
      data-reveal
    >
      <h2 className="issue-heading">
        <button
          type="button"
          id={buttonId}
          className="issue-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onToggle(issue.issueId)}
        >
          <span className="issue-title">{issue.title}</span>
          <ChevronIcon />
        </button>
      </h2>

      {/* 높이 애니메이션을 위해 접힌 상태에서도 그려 두고, inert로 포커스·읽기를 막는다 */}
      <div id={panelId} className="issue-panel" role="region" aria-labelledby={buttonId} inert={!expanded}>
        <div className="issue-panel-clip">
          <div className="issue-panel-content">
            {summary && (
              <section className="issue-section">
                <h3 className="issue-section-title">한 줄 요약</h3>
                <p className="issue-summary">{summary}</p>
              </section>
            )}

            {keyPoints.length > 0 && (
              <section className="issue-section">
                <h3 className="issue-section-title">핵심 포인트</h3>
                <ul className="issue-points">
                  {keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </section>
            )}

            {timeline.length > 0 && (
              <section className="issue-section">
                <h3 className="issue-section-title">전개 흐름</h3>
                <ol className="issue-timeline">
                  {timeline.map((t, i) => (
                    <li key={i}>
                      <time className="issue-timeline-date" dateTime={t.date}>
                        {t.date}
                      </time>
                      <p>{t.text}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {glossary.length > 0 && (
              <section className="issue-section">
                <h3 className="issue-section-title">용어 풀이</h3>
                <dl className="issue-glossary">
                  {glossary.map((g, i) => (
                    <div key={i} className="issue-glossary-item">
                      <dt>{g.term}</dt>
                      <dd>{g.description}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {sources.length > 0 && (
              <section className="issue-section">
                <h3 className="issue-section-title">근거 기사</h3>
                <ul className="issue-sources">
                  {sources.map((source) => (
                    <li key={source.url} className="issue-source">
                      <span className="issue-source-press">{source.press}</span>
                      <span className="issue-source-sep" aria-hidden="true">
                        ·
                      </span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="issue-source-link"
                      >
                        {source.title}
                      </a>
                      <span className="issue-source-sep" aria-hidden="true">
                        ·
                      </span>
                      <time className="issue-source-time" dateTime={source.publishedAt}>
                        {formatRelativeTime(source.publishedAt, now)}
                      </time>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
