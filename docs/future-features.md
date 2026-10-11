# 개발 예정 기능

나중에 만들고 싶은 기능 목록입니다. 아직 범위에 들어간 것은 없으며, 하나를 시작할 때는 먼저 [`product-spec.md`](../product-spec.md)로 옮깁니다.

난이도: ★☆☆ 쉬움 (반나절) · ★★☆ 보통 (며칠) · ★★★ 어려움 (일주일 이상, 새로 배울 개념 있음)

## 0. 먼저 할 것

### 0. DB 마이그레이션 도구(Alembic) 도입 — ★★☆

1·2·3번은 모두 이미 있는 `recipes` 테이블에 컬럼을 추가합니다. 그런데 `make_engine()`은 없는 *테이블*만 만들어서, 이미 있는 데이터베이스(로컬 SQLite, Neon dev, Neon 운영)에는 새 컬럼이 생기지 않습니다. 그래서 1번 전에 Alembic을 도입합니다.

Alembic은 DB 구조 변경(DDL)의 이력을 관리하는 도구입니다. 변경마다 마이그레이션 파일을 하나 만들고(앞 파일을 가리켜 순서가 이어짐), 각 DB 안의 `alembic_version` 테이블에 "어디까지 적용했는지"를 기록합니다. `alembic upgrade head`는 그 DB에 아직 적용하지 않은 파일만 차례로 실행합니다. 어느 DB를 바꿀지는 실행하는 곳의 `DATABASE_URL`이 정합니다 (앱과 같은 변수). 도입한 뒤에는 DB 구조를 손으로 바꾸지 않고 항상 마이그레이션 파일로 바꿉니다.

할 일 (순서대로):

1. (완료) **의존성 추가 확인**: `alembic`은 새 의존성이므로 먼저 확인받고 `uv add alembic`.
2. (완료) **Alembic 설정**: `backend/`에서 `uv run alembic init migrations`. `migrations/env.py`가 `app.db`의 `database_url()`과 `normalize_url()`로 주소를 정하고, `target_metadata = Base.metadata`를 쓰게 합니다 (자동 생성이 모델과 비교할 수 있도록). `alembic.ini`에는 DB 주소를 적지 않습니다. SQLite에서도 나중에 컬럼 삭제/변경이 되도록 `render_as_batch=True`를 켭니다.
3. (완료) **출발점(baseline) 마이그레이션**: 지금 구조(`recipes`, `ingredients`, `recipe_meal_times`)를 그대로 만드는 첫 마이그레이션을 만듭니다. 빈 DB에 `alembic revision --autogenerate`로 초안을 만들고 읽어서 확인합니다.
4. (완료) **`make_engine()`에서 `create_all` 제거**: 테이블은 이제 Alembic만 만듭니다. 그대로 두면 빈 DB에서 `create_all`이 테이블을 먼저 만들어서 baseline 마이그레이션이 "이미 있음"으로 실패합니다. 테이블이 필요한 곳은 각각 처리합니다.
   - 테스트: `conftest.py`의 `fresh_engine()`은 이미 `create_all`을 직접 부르므로 그대로 둡니다. `make_engine()`만 쓰는 테스트(`test_copy_db.py`, `test_store.py`의 파일 DB 테스트)는 테이블을 직접 만들게 고칩니다.
   - `app/copy_db.py`: 대상 DB에 테이블이 있어야 하므로, 복사 전에 대상 DB에 `upgrade head`를 실행하게 합니다 (빈 DB를 만들고 바로 복사하는 흐름 유지).
   - `app/seed.py`: 테이블이 없으면 "먼저 `uv run python -m app.migrate`를 실행하라"는 메시지를 보여 줍니다.
5. (완료) **실행 시 자동 적용**: 코드에서 실행하는 `app/migrate.py`(`uv run python -m app.migrate`)를 만들었습니다. 예전 테이블이 있는데 stamp되지 않은 DB는 적용하지 않고, 실행할 stamp 명령을 알려 줍니다.
   - Dockerfile: `migrations/`와 `alembic.ini`를 이미지에 복사하고, 시작 명령을 `python -m app.migrate`를 먼저 실행한 뒤 uvicorn을 실행하도록 바꿉니다. 실패하면 앱이 뜨지 않고 Render 배포가 실패로 표시됩니다 (이전 버전이 계속 서비스됨).
   - 로컬: `app.devserver`(`make run back`)도 시작 전에 `upgrade head`를 실행합니다.
6. (완료) **테스트 추가**:
   - 빈 DB에 `upgrade head`를 한 결과가 모델(`Base.metadata`)과 같은지 확인 (Alembic의 `compare_metadata`). 모델만 바꾸고 마이그레이션 파일을 빼먹으면 이 테스트가 실패합니다. CI에서 SQLite와 PostgreSQL 둘 다 돌아갑니다.
   - `upgrade head` → `downgrade base` → `upgrade head`가 오류 없이 되는지.
   - `tests/compose`: 새 PostgreSQL에서 컨테이너가 테이블을 만들고 정상 동작하는지 (기존 스모크 테스트가 `/api/recipes` 응답을 기다리므로 테이블이 없으면 실패합니다).
7. (완료) **CI 설정**: `.github/workflows/compose.yml`의 `paths`에 `backend/migrations/**`, `backend/alembic.ini`를 추가합니다.
8. (완료) **문서**: `AGENTS.md`(명령어: 마이그레이션 만들기/적용, `db.py` 설명, Deployment의 "스키마 변경은 두 DB에" 주의사항), `docs/testing.md`를 고칩니다. 마이그레이션 만드는 순서: `db.py` 모델 수정 → `uv run alembic revision --autogenerate -m "..."` → 파일 읽고 확인 → `uv run alembic upgrade head` → 모델과 마이그레이션을 같이 커밋.
9. **이미 있는 DB에 출발점 표시(stamp)**: 이미 테이블이 있는 DB는 baseline을 실행하면 안 되므로, "baseline까지 적용됨"이라고 기록만 합니다: `DATABASE_URL=<주소> uv run alembic stamp f9e81a5676ed` (baseline id). 순서가 중요합니다.
   - (완료) 로컬 SQLite 파일 (`backend/mongle_spoon.db`).
   - (완료) 로컬 compose의 PostgreSQL (볼륨 `mongle-spoon-pgdata`): 다음에 `docker compose up` 하기 전에. `docker compose up -d db`로 DB만 켜고 `DATABASE_URL=postgresql://<사용자>:<비밀번호>@127.0.0.1:5432/<DB 이름> uv run alembic stamp f9e81a5676ed`. 안 하면 `app` 컨테이너가 stamp하라는 메시지를 남기고 시작하지 않습니다.
   - Neon dev: 이 작업을 `main`에 푸시**하기 전에**. 안 하면 dev 배포 시 baseline이 실행되어 실패합니다.
   - Neon 운영: prod로 승격**하기 전에**.
   - (새 DB는 비어 있으므로 stamp 없이 Alembic이 테이블을 만듭니다. compose 테스트의 볼륨, 테스트용 DB가 그렇습니다.)
10. **배포 확인**: `main` 푸시 → dev 배포 로그에 Alembic 실행이 보이고 앱이 정상인지 확인 → prod 승격.

알아 둘 것:
- `main` 푸시는 Neon dev만 바꾸고, Neon 운영은 승격할 때 바뀝니다. dev에서 먼저 시험하는 흐름이 자동으로 됩니다.
- prod를 예전 이미지로 롤백해도 DB는 내려가지 않습니다. 비어 있을 수 있는 컬럼 추가(1·2·3번)는 예전 코드가 무시하므로 괜찮지만, 컬럼 삭제나 이름 변경은 예전 코드를 깨뜨립니다. 그런 변경은 두 번에 나눕니다 (먼저 코드가 안 쓰게 배포, 다음 배포에서 삭제).
- 배포하는 짧은 동안 이전 컨테이너가 새 구조의 DB 위에서 돌므로, 같은 이유로 이전 코드가 깨지지 않는 변경이 안전합니다.

## A. 기존 기능을 조금 확장하는 것

### 1. 특정 레시피 최상단 고정 (예: "오늘 만들 것") — ★★☆

고정한 레시피는 평소 정렬과 상관없이 목록 맨 위에 나옵니다.

- 백엔드: `recipes` 테이블에 비어 있을 수 있는 `pinned_at` 날짜 컬럼 추가. `RecipeStore`가 고정된 것을 먼저(최근에 고정한 순), 나머지는 지금처럼 정렬. `models.py`와 `openapi.yaml`에 반영하고, 고정/해제 방법 추가 (수정 요청의 필드로 하거나 `POST/DELETE /api/recipes/{id}/pin`). 고정도 쓰기 작업이므로 `require_write` 필요.
- 프론트엔드: 카드나 상세 화면에 고정 버튼 (`useUnlockGate()`로 비밀번호 확인), 카드에 고정 표시. `httpRecipeService`와 `mockRecipeService` 둘 다 수정.
- 주의: 새 컬럼이므로 0번(Alembic 도입)을 먼저 해야 합니다. 컬럼은 마이그레이션 파일로 추가합니다.

### 2. 최근에 만든 날짜 기록, 목록을 최근에 만든 순으로 정렬 — ★★☆

레시피마다 "최근에 만든 날짜"를 기록하고, 첫 화면 목록을 최근에 만든 순서(내림차순)로 보여줍니다.

- 백엔드: `recipes` 테이블에 비어 있을 수 있는 `last_made_at` 컬럼 추가. `RecipeStore`의 목록 정렬을 지금의 `updated_at` 내림차순에서 `last_made_at` 내림차순으로 바꿈. 한 번도 안 만든 레시피(값이 비어 있음)는 맨 뒤로, 그 안에서는 지금처럼 최근 수정 순. 비어 있는 값을 뒤로 보내는 방법은 SQLite와 PostgreSQL이 기본 동작이 다르므로 `CASE WHEN last_made_at IS NULL` 같은 공통 SQL로 명시합니다. `models.py`와 `openapi.yaml`에 반영. 날짜를 바꾸는 것도 쓰기 작업이므로 `require_write` 필요.
- 프론트엔드: 상세 화면에 "오늘 만들었어요" 버튼 (`useUnlockGate()`로 비밀번호 확인), 카드나 상세에 "마지막으로 만든 날" 표시. 정렬은 서비스 계층(백엔드와 mock)에서 하고 화면에서는 하지 않습니다.
- 스펙 변경: `product-spec.md`의 "List: sorted by most recently updated first"를 바꿔야 합니다.
- 시작 전에 정할 것: 날짜를 버튼으로 "오늘"만 찍을지, 날짜를 직접 고를 수도 있게 할지 (어제 만든 걸 오늘 기록하는 경우). 날짜만 저장할지 시각까지 저장할지. 1번(고정)과 함께 쓰면 고정한 것이 먼저, 그다음 최근에 만든 순입니다.
- 주의: 1번과 같이 새 컬럼이므로 0번(Alembic 도입)이 먼저 필요합니다.

### 3. 남은 양 기록 — ★★☆

레시피마다 만들어 둔 것이 얼마나 남았는지 기록합니다 (예: 냉동 큐브 몇 개).

- 백엔드: `recipes` 테이블에 비어 있을 수 있는 남은 양 컬럼 추가. `models.py`, `openapi.yaml`에 반영. 수정은 `require_write` 필요.
- 프론트엔드: 카드와 상세 화면에 남은 양 표시, 상세 화면에서 바로 바꿀 수 있게 (`useUnlockGate()`). 자주 바꾸는 값이라 수정 화면 전체를 거치지 않는 편이 좋습니다.
- 시작 전에 정할 것: 자유 글("큐브 5개", "반 통")로 할지, 숫자 + 단위로 할지. 숫자면 −/+ 버튼으로 하나씩 줄이기 쉽고 "다 먹은 것"을 구분할 수 있습니다. 2번의 "오늘 만들었어요"를 누를 때 남은 양도 같이 입력하게 할지.
- 주의: 새 컬럼이므로 0번(Alembic 도입)이 먼저 필요합니다. 2번과 함께 하면 컬럼 추가를 마이그레이션 하나로 할 수 있습니다.

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

### 6. 이미지 배포 마무리 — ★☆☆

dev와 prod는 이미 GHCR 이미지로 배포됩니다 (방식은 `AGENTS.md`의 Deployment 참고). `prod` 브랜치는 삭제했습니다 (마지막 커밋은 `v1.0.3` 태그로 남아 있음). 남은 정리:

**Render 설정의 이미지 주소를 움직이는 태그로 바꾸기.** 지금 Render 서비스 설정에 저장된 이미지 주소는 소스를 바꿀 때 넣은 태그(dev `sha-12ae57f`, prod `sha-42c551c`)이고, Deploy Hook으로 배포해도 바뀌지 않습니다. 그래서 Render 화면에서 Manual Deploy를 누르면 예전 이미지가 올라갑니다.
- dev: 설정을 `ghcr.io/karolline/mongle-spoon:dev`로 바꿉니다. 코드 변경 없음. Manual Deploy를 누르면 최신 main 이미지가 올라갑니다.
- prod: 승격 워크플로(`promote.yml`)가 승격한 이미지에 `prod` 태그도 붙이게 하고, 설정을 `:prod`로 바꿉니다. Manual Deploy를 누르면 지금 prod에 있는 이미지가 다시 올라갑니다.
- 끝나면 `AGENTS.md`의 "Manual Deploy를 쓰지 말 것" 주의사항을 고칩니다.

### 7. 이미지 빌드 캐시 추가 — ★☆☆

`ci.yml`의 `image` job은 매번 처음부터 빌드합니다 (`npm ci`, `uv sync`, 프론트엔드 빌드까지 전부). 의존성이 바뀌지 않았으면 그 단계는 이전 결과를 다시 쓸 수 있어서, 캐시를 붙이면 빌드가 빨라집니다.

- 방법: `docker buildx`의 레지스트리 캐시 (`--cache-from`/`--cache-to type=registry,ref=ghcr.io/karolline/mongle-spoon:buildcache,mode=max`). 캐시도 GHCR에 이미지처럼 저장되어 따로 가입하거나 설정할 곳이 없습니다. 이를 쓰려면 job에서 `docker buildx create --use`로 빌더를 하나 만들어야 합니다.
- 다른 방법: `docker/build-push-action` 같은 공식 액션과 GitHub Actions 캐시(`type=gha`). 설정은 더 짧지만 외부 액션(의존성)이 늘어납니다.
- 빌드 시간이 거슬릴 때 하면 됩니다. 캐시는 속도만 바꾸고 결과 이미지는 바꾸지 않습니다.

## D. 운영 관찰(Observability)

Observability는 앱이 어떻게 동작하는지 정보를 모아서, 사고가 났을 때 빨리 알아채고 원인을 찾는 것입니다. 모으는 정보는 세 가지입니다.

| 종류 | 내용 | 역할 |
|---|---|---|
| Metrics | CPU·메모리, RPS(초당 요청 수), 응답 시간, 에러 수 | 숫자로 보는 상태 |
| Logs | 시간이 찍힌 개별 기록 (에러 메시지, 실패한 DB 쿼리) | 무슨 일이 있었는지 자세히 |
| Traces | 요청 하나가 앱을 거치는 단계들(span) | 요청 경로와 단계별 시간 |

OpenTelemetry(OTel)는 이걸 모으는 업계 표준이고, OTLP는 앱이 모은 정보를 보내는 프로토콜입니다. 앱에 수집 코드를 붙이는 것을 계측(instrumenting)이라고 하며, FastAPI는 자동 계측(auto-instrumentation)으로 코드 몇 줄이면 됩니다.

### 8. 싸게 해 둘 기본 관찰 — ★☆☆

OTel 없이, 비용과 의존성 없이 할 수 있는 것들입니다. "사용자보다 먼저 사고를 알아채기"와 "Render 로그만으로 원인 찾기"가 목표입니다.

1. **에러가 로그에 제대로 남는지 확인**: 처리 안 된 예외가 나면 traceback이 Render 로그에 찍히는지 확인합니다. `app/main.py`에 logger가 있지만 거의 쓰이지 않습니다. 빠진 곳이 있으면 로깅을 추가합니다. 사고가 났을 때 원인을 찾는 첫 단서가 됩니다.
2. **헬스 체크 엔드포인트 `/api/health`**: 지금은 없습니다. DB 연결까지 확인하게 만들면(`SELECT 1` 같은 간단한 쿼리) "앱은 떠 있는데 DB가 끊긴" 상황도 잡힙니다. Render 서비스 설정의 Health Check Path에 연결하면, 앱이 응답하지 않을 때 Render가 재시작하고, 새 배포가 뜨지 않으면 배포를 실패로 처리합니다 (이전 버전이 계속 서비스됨). `openapi.yaml`에 추가하고 테스트도 씁니다. dev와 prod 양쪽 Render 설정을 바꿔야 합니다.
3. **외부 업타임 모니터**: UptimeRobot 같은 무료 서비스가 몇 분마다 prod 주소(2번을 하면 `/api/health`)를 호출하고, 응답이 없으면 메일로 알려 줍니다. 코드 변경이 없습니다.

Render가 이미 CPU·메모리 그래프와 stdout 로그를 보여 주므로, 이 세 가지를 더하면 지금 규모에서 필요한 관찰은 충분합니다.

### 9. OpenTelemetry 도입 — ★★☆ (당장 안 해도 됨)

**지금 안 해도 되는 이유:**
- Traces는 요청이 여러 서비스를 거칠 때(API → 다른 서비스 → 큐 → DB) 가치가 큽니다. 지금은 FastAPI 하나와 DB 하나라 요청 경로가 "라우터 → store → DB"로 뻔합니다.
- 앱 코드만으로 끝나지 않습니다. 텔레메트리를 받을 백엔드(Grafana Cloud, Honeycomb 등)에 가입해야 하고, 키 관리, 새 의존성, dev·prod 양쪽 환경 변수 설정이 생깁니다.
- Render가 CPU·메모리 그래프와 로그를 이미 보여 줍니다.
- 동시 사용자가 거의 없어서 RPS나 응답 시간 분포를 봐도 "평소와 다르다"를 판단하기 어렵습니다.
- FastAPI는 자동 계측이 잘 되어 있어서, 필요해졌을 때 붙여도 몇 줄이면 됩니다. 미리 해 둘 이점이 적습니다.

**이럴 때 다시 생각합니다:**
- 실제 사용자가 생겨서 "느리다"는 얘기가 나올 때 (어느 요청, 어느 단계가 느린지 보려면 traces와 응답 시간 metrics가 필요).
- Render 로그만으로 원인을 못 찾은 사고가 한 번이라도 생겼을 때.
- 서비스가 둘 이상으로 나뉠 때 (예: 4번 사진 기능에서 이미지 처리를 따로 떼어 낼 때). 이때부터 traces가 의미 있습니다.

**할 때 할 일:**
- 백엔드 선택 (무료 구간이 있는 Grafana Cloud나 Honeycomb 등). 새 외부 서비스이므로 먼저 정합니다.
- `opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-sqlalchemy`, OTLP exporter 추가 (새 의존성이므로 먼저 확인). FastAPI 요청과 SQLAlchemy 쿼리가 자동으로 span이 됩니다.
- 보낼 주소와 키는 환경 변수(`OTEL_EXPORTER_OTLP_ENDPOINT` 등)로 받고, 없으면 아무것도 보내지 않게 합니다 (로컬과 테스트는 그대로). dev와 prod를 서비스 이름이나 환경 속성으로 구분합니다.
- 먼저 8번을 해 둡니다. 기본 관찰이 없는 상태에서 OTel부터 붙일 이유는 없습니다.

## 추천 순서

0 → 1 → 2 → 3. 0번(Alembic 도입)은 1·2·3번 모두에 필요해서 가장 먼저 합니다. 0번만 따로 배포해서 dev와 prod에서 확인한 뒤 1번을 시작하면, 문제가 생겼을 때 원인을 찾기 쉽습니다.

6번과 7번은 기능과 관계없는 배포 정리라서 언제 해도 됩니다.

8번은 작고 사고 대응에 바로 도움이 되므로 실제 사용자가 늘기 전에 해 두면 좋습니다. 9번은 위의 "이럴 때 다시 생각합니다" 중 하나가 생기면 시작합니다.
