# ai-ops-agent

Rust 기반 운영 AI 에이전트 서비스 스캐폴드입니다.

## 역할
- `/healthz` 헬스체크
- `/ai-ops/briefing` 운영 브리핑 API
- `/ai-ops/suggestions` 제안 생성/조회 API
- `/ai-ops/suggestions/:id/{approve|reject|apply}` 상태 전이 API
- `/ai-ops/activity` 활동 로그 API
- `/ai-ops/targets` 대상 목록 API

현재는 **빌드 가능한 골격 + 계약 고정용 더미 응답**만 포함합니다. 실제 Supabase/LLM/잡 큐 연결은 후속 구현 단계에서 추가합니다.

## 환경변수
- `AI_OPS_AGENT_BIND_ADDR` — 기본값 `0.0.0.0:8787`
- `AI_OPS_DATABASE_URL` — 향후 Postgres/SQLx 연결용
- `AI_OPS_LLM_BASE_URL` — 향후 내부 LLM HTTP 엔드포인트 연결용
- `AI_OPS_LLM_MODEL` — 향후 사용할 모델 이름
- `AI_OPS_SHARED_SECRET` — Next.js 프록시와 공유하는 비밀값. 설정 시 모든 요청에 `X-AI-Ops-Secret` 헤더가 필요합니다.
- `RUST_LOG` — 예: `info`, `debug`

## 실행
```bash
cargo run
```

## 검증
```bash
cargo check
cargo test
```
