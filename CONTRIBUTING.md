# 기여 가이드

> 멋쟁이사자처럼 DevOps 엔지니어 7기 4개 팀 공통 규칙입니다. 팀별로 수정하지 말고 그대로 사용합니다.

## 브랜치 전략

**Git Flow 간소화 버전**

```
main              ← 배포 (보호됨 · 직접 push 금지)
 └─ develop       ← 통합 개발 (기본 브랜치)
     └─ feature/#123-short-description
     └─ fix/#45-short-description
     └─ docs/#67-short-description
```

### 브랜치 네이밍

```
<type>/#<issue-number>-<kebab-case-summary>

예)
feature/#12-add-login-api
fix/#34-signup-validation-error
docs/#56-update-readme
chore/#78-upgrade-eslint-config
```

## 커밋 메시지 규칙 (Conventional Commits)

```
<type>: <간결한 요약> (#이슈번호)

[옵션: 본문]
```

### Type

| Type | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 수정 |
| `style` | 코드 포맷 (동작 변경 없음) |
| `refactor` | 리팩터링 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드/설정/의존성 |
| `design` | UI/CSS 등 화면 스타일 변경 |

### 예시

```
feat: 카카오 소셜 로그인 API 추가 (#12)
fix: 회원가입 이메일 중복 검증 오류 수정 (#34)
design: 메인 페이지 카드 레이아웃 반응형 대응 (#56)
docs: API 명세서 응답 예시 보완 (#78)
```

## 개발 워크플로

1. **이슈 먼저 생성** — 작업은 반드시 이슈에서 시작
2. **이슈를 Project Board에 추가** — `Backlog` → `Ready`
3. **브랜치 생성** — `feature/#이슈번호-요약` (기준: `develop`)
4. **작업 중 컬럼 이동** — `In progress`
5. **Draft PR 조기 오픈** — 진행 상황 공유
6. **Ready for Review 전환** — 리뷰어 자동 할당 (CODEOWNERS)
7. **리뷰 반영 후 Merge** — Squash & Merge 권장
8. **이슈 자동 close** — PR 본문에 `Closes #번호`

## PR 체크리스트

- [ ] 이슈 번호 연결 (`Closes #`)
- [ ] 로컬에서 빌드/실행 확인
- [ ] 테스트 추가 또는 기존 테스트 통과
- [ ] 관련 문서/Wiki 업데이트
- [ ] **민감정보(키·비밀번호·인증서) 커밋 없음**
- [ ] 적절한 라벨 부여
- [ ] 리뷰어 1명 이상 승인

## 하지 말아야 할 것

- `main` / `develop` 브랜치에 직접 push
- `.env` 파일 커밋 (`.env.example`만 커밋)
- 비밀번호/API 키/인증서 커밋 (발견 시 즉시 롤백 + 키 재발급)
- 대용량 바이너리 직접 커밋 (Git LFS 사용)
- 이슈 없이 PR만 생성
- 자기 PR 본인이 approve

## 라벨 사용

- **Type**: `feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `design` / `meeting`
- **Area**: `area/frontend` / `area/backend` / `area/infra` / `area/design` / `area/db`
- **Priority**: `P0` ~ `P3`
- **Status**: `blocked` / `in-review` / `help-wanted` / `sprint`

전체 라벨 정의는 [`.github/labels.yml`](./.github/labels.yml) 참고.

## 도움 받기

- **기술 질문**: `help-wanted` 라벨로 이슈 생성
- **트러블슈팅**: 이슈 템플릿 `트러블슈팅` 사용
- **논의 필요**: GitHub Discussions

## 코드 스타일

| 언어 | 도구 |
|------|------|
| JavaScript / TypeScript | prettier + eslint |
| Java | google-java-format |
| Python | black + ruff |
| CSS / SCSS | stylelint |
| YAML | yamllint |
| Markdown | markdownlint |

## 리뷰 규칙

- 리뷰 요청 후 **24시간 내 1차 응답**
- 코멘트는 근거와 대안을 함께 제시
- `nit:` 접두사는 반영 선택 사항, 그 외는 반영 후 재요청
- 승인 2명 이상이면 작성자가 직접 merge
