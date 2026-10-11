# 개발 예정 기능

나중에 만들고 싶은 기능 목록입니다. 아직 범위에 들어간 것은 없으며, 하나를 시작할 때는 먼저 [`product-spec.md`](../product-spec.md)로 옮깁니다.

난이도: ★☆☆ 쉬움 (반나절) · ★★☆ 보통 (며칠) · ★★★ 어려움 (일주일 이상, 새로 배울 개념 있음)

## A. 기존 기능을 조금 확장하는 것

### 1. 특정 레시피 최상단 고정 (예: "오늘 만들 것") — ★★☆

고정한 레시피는 평소 정렬과 상관없이 목록 맨 위에 나옵니다.

- 백엔드: `recipes` 테이블에 비어 있을 수 있는 `pinned_at` 날짜 컬럼 추가. `RecipeStore`가 고정된 것을 먼저(최근에 고정한 순), 나머지는 지금처럼 정렬. `models.py`와 `openapi.yaml`에 반영하고, 고정/해제 방법 추가 (수정 요청의 필드로 하거나 `POST/DELETE /api/recipes/{id}/pin`). 고정도 쓰기 작업이므로 `require_write` 필요.
- 프론트엔드: 카드나 상세 화면에 고정 버튼 (`useUnlockGate()`로 비밀번호 확인), 카드에 고정 표시. `httpRecipeService`와 `mockRecipeService` 둘 다 수정.
- 주의: 아직 마이그레이션이 없습니다. `make_engine()`은 없는 *테이블*만 만들기 때문에, 이미 있는 데이터베이스(로컬 SQLite 파일, 운영 PostgreSQL)에는 새 컬럼이 생기지 않습니다. 직접 `ALTER TABLE`을 실행하거나, 이번에 Alembic을 도입해야 합니다.

### 2. 최근에 만든 날짜 기록, 목록을 최근에 만든 순으로 정렬 — ★★☆

레시피마다 "최근에 만든 날짜"를 기록하고, 첫 화면 목록을 최근에 만든 순서(내림차순)로 보여줍니다.

- 백엔드: `recipes` 테이블에 비어 있을 수 있는 `last_made_at` 컬럼 추가. `RecipeStore`의 목록 정렬을 지금의 `updated_at` 내림차순에서 `last_made_at` 내림차순으로 바꿈. 한 번도 안 만든 레시피(값이 비어 있음)는 맨 뒤로, 그 안에서는 지금처럼 최근 수정 순. 비어 있는 값을 뒤로 보내는 방법은 SQLite와 PostgreSQL이 기본 동작이 다르므로 `CASE WHEN last_made_at IS NULL` 같은 공통 SQL로 명시합니다. `models.py`와 `openapi.yaml`에 반영. 날짜를 바꾸는 것도 쓰기 작업이므로 `require_write` 필요.
- 프론트엔드: 상세 화면에 "오늘 만들었어요" 버튼 (`useUnlockGate()`로 비밀번호 확인), 카드나 상세에 "마지막으로 만든 날" 표시. 정렬은 서비스 계층(백엔드와 mock)에서 하고 화면에서는 하지 않습니다.
- 스펙 변경: `product-spec.md`의 "List: sorted by most recently updated first"를 바꿔야 합니다.
- 시작 전에 정할 것: 날짜를 버튼으로 "오늘"만 찍을지, 날짜를 직접 고를 수도 있게 할지 (어제 만든 걸 오늘 기록하는 경우). 날짜만 저장할지 시각까지 저장할지. 1번(고정)과 함께 쓰면 고정한 것이 먼저, 그다음 최근에 만든 순입니다.
- 주의: 1번과 같이 새 컬럼이 필요하므로 마이그레이션 문제가 똑같이 있습니다.

### 3. 남은 양 기록 — ★★☆

레시피마다 만들어 둔 것이 얼마나 남았는지 기록합니다 (예: 냉동 큐브 몇 개).

- 백엔드: `recipes` 테이블에 비어 있을 수 있는 남은 양 컬럼 추가. `models.py`, `openapi.yaml`에 반영. 수정은 `require_write` 필요.
- 프론트엔드: 카드와 상세 화면에 남은 양 표시, 상세 화면에서 바로 바꿀 수 있게 (`useUnlockGate()`). 자주 바꾸는 값이라 수정 화면 전체를 거치지 않는 편이 좋습니다.
- 시작 전에 정할 것: 자유 글("큐브 5개", "반 통")로 할지, 숫자 + 단위로 할지. 숫자면 −/+ 버튼으로 하나씩 줄이기 쉽고 "다 먹은 것"을 구분할 수 있습니다. 2번의 "오늘 만들었어요"를 누를 때 남은 양도 같이 입력하게 할지.
- 주의: 새 컬럼이므로 마이그레이션 문제가 똑같이 있습니다. 2번과 함께 하면 컬럼 추가를 한 번에 할 수 있습니다.

## B. 완전히 새로 만드는 기능

### 4. 사진 추가 — ★★★

레시피에 사진을 한 장 이상 붙이고, 상세 화면에서 보여줍니다 (카드에 작은 썸네일도 고려).

- 저장소가 어려운 부분: 배포 서버의 디스크는 영구적이지 않아서 파일을 외부 저장소(예: Cloudflare R2, S3, Cloudinary)에 올려야 합니다. 데이터베이스에 이미지를 넣는 것도 가능하지만 권장하지 않습니다.
- 백엔드: 업로드 엔드포인트 (multipart, 크기/형식 제한), `recipe_photos` 테이블 (레시피 id, 저장소 키, 순서), 레시피를 삭제하면 사진도 삭제. 새 의존성(저장소 SDK, 이미지 리사이즈 등)은 먼저 물어보기.
- 프론트엔드: 파일 선택 / 모바일 카메라, 업로드 진행 표시, 데이터 절약을 위해 업로드 전에 크기 줄이기.
- 스펙에 "나중에 할 것(Out of scope)"으로 적혀 있습니다.

### 5. 카카오 로그인 (유저마다 자기 레시피만 보이게) — ★★★

공용 쓰기 비밀번호를 실제 계정으로 바꿉니다.

- 카카오 쪽: Kakao Developers에 앱 등록, 로컬과 운영용 리다이렉트 URL 설정.
- 백엔드: OAuth 로그인 흐름 (리다이렉트 → 카카오 → 콜백), `users` 테이블, `recipes`에 `owner_id`, 세션 또는 토큰, 모든 조회를 현재 유저 기준으로 필터링. `app/auth.py`의 `require_access` / `require_write`는 "로그인한 유저가 이 레시피의 주인인지" 확인으로 바뀜.
- 기존 데이터: 이미 저장된 레시피를 어느 유저 것으로 할지 정해야 합니다.
- 프론트엔드: 로그인 화면, 로그아웃, 서비스 계층에 로그인 상태 (mock에는 가짜 유저 필요).
- 보안이 중요합니다 (토큰 보관, CSRF, 쿠키 설정). 스펙에 "나중에 할 것"으로 적혀 있습니다 ("User accounts, per-person permissions").

## C. 배포 구조

### 6. 컨테이너 레지스트리로 빌드와 배포 분리 — ★★☆

> **진행 상황 (2026-10-11):** 1~10단계 완료. dev와 prod 모두 GHCR 이미지로 배포되고, 승격은 Actions → Promote to prod로 합니다. 남은 것: `prod` 브랜치 정리(v1.0.3에 멈춰 있고 더 이상 아무것도 배포하지 않음).

지금은 Render가 배포할 때마다 Dockerfile로 이미지를 빌드합니다. 이것을 GitHub Actions가 이미지를 **한 번만** 빌드해 레지스트리에 올리고, Render(dev, prod)는 그 이미지를 받아서 실행만 하도록 바꿉니다. dev와 prod는 같은 이미지를 쓰고, 다른 것은 Render 환경변수(`DATABASE_URL`, `ADMIN_PASSWORD`)뿐입니다.

지금 방식의 문제:

- prod 승격(`git push origin main:prod`) 때 같은 커밋을 다시 빌드합니다. 코드는 같아도 `node:24-alpine`, `python:3.14-slim` 같은 베이스 이미지 태그는 계속 업데이트되므로, dev에서 확인한 이미지와 prod 이미지가 다를 수 있습니다. (라이브러리는 `uv.lock`, `package-lock.json`으로 고정되어 있어 차이는 주로 OS/베이스 이미지 쪽.)
- `ci.yml`은 Docker 이미지를 빌드하지 않습니다. 그래서 Docker 빌드가 깨지면 Render 배포 중에 처음 알게 됩니다.

바뀐 뒤의 흐름:

```
main push → GitHub Actions: 테스트 → 이미지 빌드 → 태그(sha-<커밋>) → GHCR에 push → Render dev Deploy Hook 호출
승격(수동 실행) → dev가 쓰는 그 이미지를 Render prod Deploy Hook에 전달 → pull해서 실행 (빌드 없음, 빠름)
```

용어:

- **GHCR** (GitHub Container Registry, `ghcr.io/<계정>/mongle-spoon`): GitHub 안의 기능입니다 (GitHub Packages). 따로 가입할 필요가 없고, 올린 이미지는 저장소/프로필의 Packages 탭에 보입니다. Actions에서는 자동으로 주어지는 `GITHUB_TOKEN`으로 push할 수 있습니다. Docker Hub도 가능하지만 GHCR이 가장 간단합니다.
- **이미지 기반 서비스 (image-backed service)**: Render 서비스를 새로 만들 필요는 없습니다. Settings → Build → Source → Edit에서 소스를 Git 저장소에서 이미지로 바꾸면 됩니다 (2026년 5월부터 가능). 웹서비스 그대로이고 환경변수, URL, 도메인도 유지됩니다. 단, 이미지 기반 서비스는 git push를 감지하지 않으므로 Deploy Hook으로 배포를 시작해야 합니다.
- **Deploy Hook**: 서비스마다 있는 비밀 URL입니다. 호출하면 배포가 시작되고, `imgURL` 파라미터로 이번 배포에 쓸 태그나 digest를 지정할 수 있습니다 (태그/digest 외의 주소는 서비스 설정과 같아야 함).

시작 전에 정할 것:

- **GHCR 이미지 공개 여부** → **결정: 공개.** 저장소가 이미 공개라서 이미지를 공개해도 새로 드러나는 것이 없고, Render에 GHCR 토큰을 등록할 필요가 없습니다. 이미지에는 비밀번호나 DB 주소가 들어 있지 않습니다 (`.dockerignore`가 `*.db`, `.env`를 제외). 앞으로도 비밀 정보가 이미지에 들어가지 않게 주의합니다.
- **승격할 때 "dev가 지금 쓰는 이미지"를 어떻게 찾을지** → **결정: (가)+(나).** main 빌드 때마다 `sha-<커밋>` 태그와 함께 `dev` 태그도 붙입니다. 승격 워크플로에는 태그 입력칸이 있습니다.
  - 비우면: `dev` 태그를 digest로 고정해 prod에 전달하고, 그 이미지가 어느 커밋(`sha-...`)인지 실행 로그에 표시합니다.
  - 적으면: 적은 태그(예: `sha-6e10ccd`)를 그대로 prod에 전달합니다. 특정 버전을 올리거나 롤백할 때 씁니다.
  - 주의: `dev` 태그는 "dev가 실행 중인 이미지"가 아니라 "마지막으로 빌드한 이미지"입니다. 확인하는 사이에 main에 push했거나 dev 배포가 실패했다면 둘이 다를 수 있으니, 로그의 커밋과 dev 화면의 커밋을 비교합니다.
  - (다) Render API로 조회하는 방법은 API 키를 하나 더 관리해야 해서 쓰지 않습니다.
- **dev/prod에 어떤 커밋이 올라가 있는지 보기** → **결정: 둘 다 만듭니다.**
  - GitHub Environments: dev 배포 job과 승격 job에 `environment: dev` / `environment: prod`를 붙입니다. 저장소 첫 화면 오른쪽 **Deployments**에서 환경별 최근 배포 커밋을 한눈에 봅니다. (GitHub가 Render에 배포를 요청한 기록이라, Render 배포가 실패했으면 실제와 다를 수 있습니다.)
  - 앱 화면에 커밋 표시: 이미지 빌드 때 커밋 해시를 넣고, 목록 화면 아래 버전 옆에 보여 줍니다 (예: `v1.0.3 (6e10ccd)`). 실제로 실행 중인 코드를 보여 주므로 가장 정확하고, 이 해시를 승격 입력칸에 그대로 쓸 수 있습니다.
- **`prod` 브랜치의 역할** (아직 안 정함): 지금은 `prod` 브랜치가 "prod에 배포된 것"을 나타냅니다. 바뀐 뒤에는 이미지 태그가 그 역할을 합니다. 브랜치를 없앨지, 승격 기록용으로 남길지(승격 워크플로가 `prod` 브랜치도 그 커밋으로 옮김) 정합니다.

단계 (순서대로):

1. 위의 "시작 전에 정할 것"을 정합니다.
2. 앱 화면에 커밋 표시: Dockerfile이 빌드 인자로 커밋 해시를 받아 이미지에 넣고, 목록 화면 아래 버전 옆에 보여 줍니다. 해시가 없으면(로컬 개발) 버전만 보여 줍니다. 테스트를 함께 작성합니다.
3. GitHub Actions에 빌드 job 추가: 테스트 job들이 통과한 뒤(`needs`), main push일 때만 이미지를 빌드해 `ghcr.io/<계정>/mongle-spoon:sha-<커밋>`과 `:dev` 태그로 push (커밋 해시를 빌드 인자로 전달). 릴리스 때는 `vX.Y.Z` 태그도 붙입니다. 이 단계에서는 아직 Render를 건드리지 않습니다.
4. main에 push해서 GHCR에 이미지가 올라가는지 확인합니다 (Packages 탭). 여기서 이미지를 공개로 바꿉니다.
5. Render dev 서비스에서 Deploy Hook URL을 복사해 GitHub 저장소 Secret(예: `RENDER_DEV_DEPLOY_HOOK`)으로 저장합니다.
6. Render dev 서비스의 소스를 Git 저장소에서 GHCR 이미지로 바꿉니다. 바꾸는 즉시 배포되므로 4번에서 이미지가 이미 올라가 있어야 합니다. 앱이 정상인지, 목록 화면 아래 버전과 커밋이 맞는지 확인합니다.
7. 빌드 job 끝에 dev Deploy Hook 호출 추가 (`imgURL`로 방금 빌드한 `sha-<커밋>` 태그 지정, job에 `environment: dev`). main에 push해서 테스트 → 빌드 → dev 배포가 자동으로 이어지는지, 저장소 첫 화면 Deployments에 dev가 보이는지 확인합니다.
8. prod Deploy Hook URL을 Secret(예: `RENDER_PROD_DEPLOY_HOOK`)으로 저장하고, 수동 실행(`workflow_dispatch`) 승격 워크플로를 만듭니다. 태그 입력칸(비우면 `dev`)으로 이미지를 정해 digest로 고정하고, 어느 커밋인지 로그에 표시한 뒤 prod Deploy Hook에 전달합니다. 이 워크플로에는 빌드 단계가 없습니다. Deployments 기록은 `environment: prod` 대신 GitHub API로 남깁니다 (`environment:`를 쓰면 승격한 이미지의 커밋이 아니라 워크플로를 실행한 시점의 main 최신 커밋이 기록되기 때문).
9. Render prod 서비스의 소스를 GHCR 이미지로 바꿉니다. 이때는 dev에서 확인한 태그를 지정합니다. 그다음 승격 워크플로를 한 번 실행해 보고, Deployments에 prod가 보이는지 확인합니다.
10. 문서 정리: `AGENTS.md`의 Deployment 섹션(승격 방법, `prod` 브랜치 역할), `ci.yml` 상단 주석, 필요하면 `README.md`. 정한 대로 `prod` 브랜치를 정리합니다.

주의:

- 소스를 이미지로 바꾸면 Render의 "After CI Checks Pass" 자동 배포 설정은 더 이상 쓰이지 않습니다. CI 통과 여부는 이제 GitHub Actions의 `needs`가 보장합니다.
- 문제가 생기면 Render 서비스 소스를 다시 Git 저장소로 되돌리면 지금 방식으로 돌아갑니다.
- 더 작은 대안: Dockerfile 베이스 이미지를 `python:3.14-slim@sha256:...`처럼 digest로 고정하면 "다시 빌드하면 달라지는" 문제는 많이 줄어듭니다. 다만 빌드를 두 번 하는 구조는 그대로입니다.

### 7. 이미지 빌드 캐시 추가 — ★☆☆

`ci.yml`의 `image` job은 매번 처음부터 빌드합니다 (`npm ci`, `uv sync`, 프론트엔드 빌드까지 전부). 의존성이 바뀌지 않았으면 그 단계는 이전 결과를 다시 쓸 수 있어서, 캐시를 붙이면 빌드가 빨라집니다.

- 방법: `docker buildx`의 레지스트리 캐시 (`--cache-from`/`--cache-to type=registry,ref=ghcr.io/karolline/mongle-spoon:buildcache,mode=max`). 캐시도 GHCR에 이미지처럼 저장되어 따로 가입하거나 설정할 곳이 없습니다. 이를 쓰려면 job에서 `docker buildx create --use`로 빌더를 하나 만들어야 합니다.
- 다른 방법: `docker/build-push-action` 같은 공식 액션과 GitHub Actions 캐시(`type=gha`). 설정은 더 짧지만 외부 액션(의존성)이 늘어납니다.
- 빌드 시간이 거슬릴 때 하면 됩니다. 캐시는 속도만 바꾸고 결과 이미지는 바꾸지 않습니다.

## 추천 순서

1 → 2 → 3. DB 구조를 바꾸는 작업은 dev DB에서 먼저 시험해 봅니다. 1번은 마이그레이션을 갖출 좋은 기회이고, 2번과 3번에서도 어차피 필요합니다.

6번은 기능과 관계없어서 언제 해도 됩니다. 다만 1번(DB 구조 변경)처럼 dev에서 확인한 뒤 prod에 올리는 작업이 많아지기 전에 해 두면, prod에 dev와 똑같은 이미지가 올라간다는 보장을 받을 수 있습니다.
