const STALE_AFTER_MS = 60 * 60 * 1000 // 1시간

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// 데이터 생성 시각이 1시간을 넘었는지 (렌더 중이 아니라 응답을 받은 시점에 호출)
export function isStaleAt(generatedAt) {
  const time = new Date(generatedAt).getTime()
  return !Number.isNaN(time) && Date.now() - time > STALE_AFTER_MS
}

// "10/14 09:30" (한국 시간)
export function formatDateTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const part = Object.fromEntries(
    dateTimeFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  )
  return `${part.month}/${part.day} ${part.hour}:${part.minute}`
}

// "10/14 09:30 기준"
export function formatGeneratedAt(iso) {
  const label = formatDateTime(iso)
  return label ? `${label} 기준` : null
}

// "N분 전" / "N시간 전" / "N일 전"
export function formatRelativeTime(iso, now) {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const diff = Math.max(0, now - time)
  if (diff < MINUTE) return '방금 전'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`
  return `${Math.floor(diff / DAY)}일 전`
}
