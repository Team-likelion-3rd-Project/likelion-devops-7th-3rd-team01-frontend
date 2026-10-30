# AI 뉴스 브리핑 - frontend

IT 뉴스 요약을 보여 주고, 기사 근거로 질문에 답하는 서비스의 화면입니다. React 단일 페이지 앱(SPA)이고 백엔드와는 `/api`로 통신합니다.

- 프로젝트 소개·위키·이슈: [likelion-devops-7th-3rd-team01](https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team01)
- 백엔드(API·워커·요약 배치): [likelion-devops-7th-3rd-team01-backend](https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team01-backend)
- 배포(Helm 차트, Argo CD, Terraform): [likelion-devops-7th-3rd-team01-infra](https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team01-infra)
- API 명세·UI 화면·성능 테스트: 위키

## 기술 구성

| 항목 | 내용 |
|---|---|
| 화면 | React 19, React Router 7 |
| 빌드 | Vite 8, Node 20 |
| 검사 | oxlint (린트), PR마다 CI가 린트와 빌드를 확인 |
| 글꼴 | Pretendard. npm 패키지로 번들에 포함하고 외부 CDN은 쓰지 않음 |
| 이미지 | Docker 멀티 스테이지(Node로 빌드 후 Nginx로 서빙), GHCR에 커밋 SHA 태그 |

## 구조

| 경로 | 화면 | 로그인 |
|---|---|---|
| `/` | 홈: 분야별 주요 이슈 | X |
| `/category/:code` | 분야 페이지: 이슈 요약·출처·원문 링크 | X |
| `/login`, `/signup` | 로그인, 가입 | X |
| `/questions/:id` | 질문 결과 | O |
| `/mypage` | 마이페이지: 질문 기록, 저장한 질문·기사 | O |

| 폴더 | 내용 |
|---|---|
| `src/pages/` | 화면 (홈, 분야, 질문 결과, 마이페이지, 로그인·가입) |
| `src/components/` | 공통 레이아웃, 헤더, 질문 입력, 로그인 확인(`RequireAuth`) |
| `src/api.js` | 백엔드 호출 모음. mock 모드일 때는 `src/mocks/`의 샘플 데이터를 사용 |
| `src/hooks/` | 화면 진입·스크롤 효과 |

```
조회:  / → GET /api/news/home, /category/:code → GET /api/news/categories/{code}
질문:  POST /api/questions → 접수(PENDING) → 2초마다 GET /api/questions/{id} → COMPLETED / REJECTED / FAILED
인증:  POST /api/auth/login → httpOnly 쿠키 → GET /api/auth/me로 로그인 확인
저장:  PUT·DELETE /api/questions/{id}/saved, /api/saved-articles → 마이페이지에서 모아보기
```

## 로컬 실행

필요: Node 20

```bash
npm ci
cp .env.example .env   # 필요하면 값을 고친다 (.env는 커밋 금지)
npm run dev            # 개발 서버. /api는 localhost:8080 백엔드로 넘긴다
npm run lint           # 린트
npm run build          # 빌드 (dist/)
```

백엔드 없이 화면만 볼 때는 `.env`에 `VITE_USE_MOCK=true`를 둡니다. 샘플 데이터를 쓰고 화면에 "샘플 데이터" 띠가 뜹니다. 단위 테스트는 아직 없고 CI는 린트와 빌드를 검사합니다.

## 주요 환경 변수

빌드할 때 번들에 들어가므로 값을 바꾸면 다시 빌드해야 합니다.

| 이름 | 필수 | 설명 |
|---|---|---|
| `VITE_API_BASE` | N | API 주소. 기본 `/api` (온프렘은 Ingress, AWS는 CloudFront가 `/api`를 백엔드로 넘김) |
| `VITE_USE_MOCK` | N | `true`면 샘플 데이터 사용. `.env.example`은 `true`, Docker 빌드와 CI는 `false` |

## 운영

| 항목 | 내용 |
|---|---|
| 캐시 (AWS) | 해시가 붙은 `assets/`는 1년(`immutable`), `index.html` 등은 캐시하지 않아 새 배포가 바로 보임 |
| 새로고침 (온프렘) | Nginx가 없는 경로를 `index.html`로 돌려 SPA 경로가 새로고침돼도 열림 |
| 비로그인 | 첫 진입 때 `/api/auth/me`가 401을 돌려주는 것은 정상 (로그인 여부 확인) |
| 글꼴 | 번들에 포함해 외부 요청 없음 |

## 성능

Lighthouse(모바일, 시크릿 창, 3회 중간값) 개선 전후는 다음과 같습니다. 상세 조건과 해석은 위키 "프론트엔드 Lighthouse 측정"에 있습니다.

| 화면 | Performance | LCP | 변경 |
|---|---|---|---|
| 홈 | 90 → 92 | 3.5s → 3.0s | 글꼴 번들 포함(외부 CDN 제거) |
| 분야 | 88 → 90 | 3.3s → 3.2s (오차 범위) | 위와 같음 |

## CI/CD

```
PR:            린트·빌드 (ci)
develop push → 린트·빌드 → GHCR 이미지 → infra deploy-onprem → 온프렘 배포 (Nginx 파드)
main push    → deploy-aws: 빌드 → S3 업로드 → CloudFront 캐시 무효화 → AWS 배포
```

- 이미지 주소: `ghcr.io/<owner>/<repo>:<커밋 SHA>` (`.github/workflows/ci.yml`)
- AWS 배포(`.github/workflows/deploy-aws.yml`)는 main push 또는 수동 실행으로 동작합니다.
- 온프렘 배포 흐름(Helm, Argo CD)은 infra 저장소 README를 봅니다.

## 비밀 값

`.env`는 커밋하지 않습니다. AWS 배포는 장기 액세스 키 없이 GitHub Actions OIDC 단기 권한을 사용하고, 버킷·배포 ID·역할은 저장소 Variables(`FRONTEND_BUCKET`, `FRONTEND_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`)에서 읽습니다. 값은 저장소에 올리지 않습니다.

브랜치: `develop`(개발, 온프렘 배포) / `main`(운영, AWS 배포). 두 브랜치에는 직접 push하지 않고 PR로 합칩니다. 커밋·PR 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다.
