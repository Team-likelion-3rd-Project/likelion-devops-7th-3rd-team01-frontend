// 분야 코드·라벨은 여기 한 곳에서만 관리 (배열 순서 = 홈 섹션·분야 탭 순서)
export const CATEGORIES = [
  { code: 'AI', label: 'AI' },
  { code: 'IT_GENERAL', label: 'IT 일반' },
  { code: 'MOBILE_TELECOM', label: '모바일·통신' },
  { code: 'COMPUTER', label: '컴퓨터' },
  { code: 'SECURITY', label: '보안' },
  { code: 'SCIENCE', label: '과학' },
]

export function getCategoryLabel(code) {
  return CATEGORIES.find((c) => c.code === code)?.label ?? code
}

export function isValidCategory(code) {
  return CATEGORIES.some((c) => c.code === code)
}
