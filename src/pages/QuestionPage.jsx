import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchQuestion, QUESTION_DONE_STATUSES } from '../api.js'
import { useAuth } from '../authContext.js'
import { formatDateTime } from '../time.js'
import './QuestionPage.css'

const POLL_INTERVAL_MS = 2000
// 서버는 60초가 지나면 실패 처리한다. 화면은 조금 더 기다렸다가 멈춘다.
const POLL_LIMIT_MS = 70_000
const MAX_CONSECUTIVE_FAILURES = 3

const WAITING_TEXT = {
  PENDING: '질문을 접수했어요',
  PROCESSING: '기사를 찾아 답변을 만들고 있어요',
}

// 출처 주소는 외부에서 온 값이므로 http(s)일 때만 링크로 만든다 (javascript: 등 차단)
function isHttpUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function WaitDots() {
  return (
    <span className="question-wait-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

function Notice({ tone = 'neutral', title, children }) {
  return (
    <div
      className={`question-notice question-notice--${tone}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <p className="question-notice-title">{title}</p>
      {children}
    </div>
  )
}

function Sources({ sources }) {
  if (!sources || sources.length === 0) return null
  return (
    <section className="question-sources" aria-label="출처">
      <h2 className="question-section-title">출처</h2>
      <ul className="question-source-list">
        {sources.map((source, index) => {
          const meta = [source.press, source.publishedAt && formatDateTime(source.publishedAt)]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={`${source.url}-${index}`} className="question-source">
              {isHttpUrl(source.url) ? (
                <a
                  className="question-source-link"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.title}
                  <span className="visually-hidden"> (새 탭에서 열림)</span>
                </a>
              ) : (
                <span className="question-source-link">{source.title}</span>
              )}
              {meta && <span className="question-source-meta">{meta}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function QuestionView({ id }) {
  const { expire } = useAuth()
  // loading | waiting | done | timeout | error | notfound
  const [phase, setPhase] = useState('loading')
  const [question, setQuestion] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timerId = null
    let failures = 0
    const startedAt = Date.now()

    async function poll() {
      try {
        const data = await fetchQuestion(id)
        if (cancelled) return
        failures = 0
        setQuestion(data)
        if (QUESTION_DONE_STATUSES.includes(data.status)) {
          setPhase('done')
          return
        }
        setPhase('waiting')
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 401) {
          expire()
          return
        }
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          setPhase('notfound')
          return
        }
        failures += 1
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          setPhase('error')
          return
        }
      }
      if (Date.now() - startedAt >= POLL_LIMIT_MS) {
        setPhase('timeout')
        return
      }
      timerId = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [id, attempt, expire])

  const retry = () => {
    setPhase('waiting')
    setAttempt((n) => n + 1)
  }

  if (phase === 'notfound') {
    return (
      <div className="question-page">
        <Notice title="질문을 찾을 수 없어요">
          <p className="question-notice-text">주소가 잘못됐거나 삭제된 질문이에요.</p>
        </Notice>
        <div className="question-actions">
          <Link className="question-action question-action--primary" to="/">
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  const waiting = phase === 'loading' || (phase === 'waiting' && !question)

  return (
    <div className="question-page">
      {question && (
        <header className="question-head">
          <p className="question-label">질문</p>
          <h1 className="question-query">{question.query}</h1>
        </header>
      )}

      {waiting && (
        <Notice tone="pending" title="답변을 확인하고 있어요">
          <WaitDots />
        </Notice>
      )}

      {phase === 'waiting' && question && (
        <Notice tone="pending" title={WAITING_TEXT[question.status] ?? '처리하고 있어요'}>
          <WaitDots />
          <p className="question-notice-text">잠시만 기다려 주세요.</p>
        </Notice>
      )}

      {phase === 'timeout' && (
        <Notice title="답변이 오래 걸리고 있어요">
          <p className="question-notice-text">
            마이페이지의 내 질문에서 진행 상태를 확인할 수 있어요.
          </p>
          <button type="button" className="question-action" onClick={retry}>
            다시 확인하기
          </button>
        </Notice>
      )}

      {phase === 'error' && (
        <Notice tone="danger" title="답변을 불러오지 못했어요">
          <p className="question-notice-text">잠시 후 다시 시도해 주세요.</p>
          <button type="button" className="question-action" onClick={retry}>
            다시 시도
          </button>
        </Notice>
      )}

      {phase === 'done' && question?.status === 'COMPLETED' && (
        <>
          <section className="question-answer" aria-label="답변">
            <h2 className="question-section-title">답변</h2>
            <p className="question-answer-text">{question.answer}</p>
          </section>
          <Sources sources={question.sources} />
        </>
      )}

      {phase === 'done' && question?.status === 'REJECTED' && (
        <Notice title="답할 수 없는 질문이에요">
          <p className="question-notice-text">
            {question.answer ?? '뉴스와 관련된 질문에만 답할 수 있어요.'}
          </p>
        </Notice>
      )}

      {phase === 'done' && question?.status === 'FAILED' && (
        <Notice tone="danger" title="답변을 만들지 못했어요">
          <p className="question-notice-text">잠시 후 다시 질문해 주세요.</p>
        </Notice>
      )}

      {phase !== 'loading' && (
        <div className="question-actions">
          <Link className="question-action question-action--primary" to="/">
            다른 질문하기
          </Link>
          <Link className="question-action" to="/mypage">
            내 질문 보기
          </Link>
        </div>
      )}
    </div>
  )
}

// 질문 번호가 바뀌면 화면 상태를 처음부터 다시 시작하도록 key를 준다
export default function QuestionPage() {
  const { id } = useParams()
  return <QuestionView key={id} id={id} />
}