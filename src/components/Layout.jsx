import { useRef, useSyncExternalStore } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getMockSnapshot, subscribeMock } from '../api.js'
import { usePageEnter } from '../hooks/usePageEnter.js'
import { useScrollMotion } from '../hooks/useScrollMotion.js'
import Header from './Header.jsx'
import PageMetaProvider from './PageMetaProvider.jsx'

export default function Layout() {
  const isMock = useSyncExternalStore(subscribeMock, getMockSnapshot)
  const { pathname } = useLocation()
  const mainRef = useRef(null)

  // 화면(분야 포함)이 바뀌면 본문만 다시 떠오르게. 헤더는 그대로
  usePageEnter(mainRef, pathname)
  useScrollMotion()

  return (
    <PageMetaProvider>
      <div className="layout">
        {isMock && (
          <div className="mock-banner" role="status">
            샘플 데이터
          </div>
        )}
        <Header />
        <main className="main" ref={mainRef}>
          <Outlet />
        </main>
      </div>
    </PageMetaProvider>
  )
}
