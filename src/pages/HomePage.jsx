import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHome } from '../api.js'
import { CATEGORIES } from '../categories.js'
import ChatInput from '../components/ChatInput.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { usePublishGeneratedAt } from '../pageMetaContext.js'
import { isStaleAt } from '../time.js'
import './HomePage.css'

const ISSUES_PER_SECTION = 3

function CategorySection({ code, label, issues }) {
  const categoryPath = `/category/${code}`
  const headingId = `home-section-${code}`

  return (
    <section className="category-section" aria-labelledby={headingId} data-reveal>
      <div className="category-section-head">
        <h2 className="category-section-name" id={headingId}>
          {label}
        </h2>
        <Link to={categoryPath} className="category-section-more" aria-label={`${label} 더보기`}>
          더보기 &gt;
        </Link>
      </div>

      {issues.length > 0 ? (
        <ol className="category-section-issues">
          {issues.map((issue, idx) => (
            <li key={issue.issueId} className="category-section-issue">
              <Link
                to={`${categoryPath}?issue=${encodeURIComponent(issue.issueId)}`}
                className="category-section-link"
              >
                <span className="category-section-rank" aria-hidden="true">
                  {idx + 1}.
                </span>
                <span className="category-section-title">{issue.title}</span>
              </Link>
              {idx === 0 && issue.summary && (
                <p className="category-section-summary">{issue.summary}</p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="category-section-empty">아직 요약이 없어요</p>
      )}
    </section>
  )
}

function SectionSkeleton() {
  return (
    <div className="category-section category-section--skeleton" aria-hidden="true">
      <span className="skeleton-bar skeleton-bar--name" />
      <span className="skeleton-bar skeleton-bar--title" />
      <span className="skeleton-bar skeleton-bar--line" />
      <span className="skeleton-bar skeleton-bar--title" />
      <span className="skeleton-bar skeleton-bar--title" />
    </div>
  )
}

export default function HomePage() {
  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const revealRef = useReveal()

  useEffect(() => {
    let ignore = false
    fetchHome().then(
      (data) => {
        if (!ignore) setState({ status: 'success', data, isStale: isStaleAt(data.generatedAt) })
      },
      () => {
        if (!ignore) setState({ status: 'error' })
      },
    )
    return () => {
      ignore = true
    }
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  const data = state.status === 'success' ? state.data : null
  usePublishGeneratedAt(data?.generatedAt)

  const issuesByCategory = Object.fromEntries(
    (data?.categories ?? []).map((c) => [c.category, c.issues ?? []]),
  )

  return (
    <div className="home" ref={revealRef}>
      <h1 className="visually-hidden">오늘의 IT 브리핑</h1>

      {state.isStale && (
        <p className="stale-notice home-stale swap-in" role="status">
          뉴스 갱신이 지연되고 있어요
        </p>
      )}

      <ChatInput />

      {state.status === 'error' && (
        <div className="page-state swap-in" role="alert">
          <p className="page-state-message">뉴스를 불러오지 못했어요</p>
          <button type="button" className="page-state-action" onClick={retry}>
            다시 시도
          </button>
        </div>
      )}

      {data && (
        <div className="category-sections">
          {CATEGORIES.map(({ code, label }) => (
            <CategorySection
              key={code}
              code={code}
              label={label}
              issues={(issuesByCategory[code] ?? []).slice(0, ISSUES_PER_SECTION)}
            />
          ))}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="category-sections" aria-busy="true">
          <span className="visually-hidden" role="status">
            뉴스를 불러오는 중이에요
          </span>
          {CATEGORIES.map(({ code }) => (
            <SectionSkeleton key={code} />
          ))}
        </div>
      )}
    </div>
  )
}
