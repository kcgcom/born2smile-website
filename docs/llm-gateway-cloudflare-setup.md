# LLM Gateway Cloudflare Tunnel + Access 설정 가이드

대상 환경:

- 앱: Vercel 배포 유지
- Cloudflare Tunnel 실행 호스트: `root@192.168.1.1` (OPNsense)
- LLM gateway 서버: `dev@192.168.1.201`
- gateway 코드 위치: `~/totoro-gateway`
- 목표:
  - 로컬/LAN에서는 무인증으로 편하게 사용
  - 외부(Vercel)에서는 Cloudflare Access Service Token이 있는 요청만 허용
  - gateway 프로세스는 1개만 운영

## 권장 토폴로지

```text
로컬/LAN 클라이언트
  -> http://192.168.1.201:8000
  -> totoro-gateway

Vercel
  -> https://llm.born2smile.co.kr
  -> Cloudflare Access (Service Auth 정책)
  -> Cloudflare Tunnel on 192.168.1.1
  -> http://192.168.1.201:8000
  -> totoro-gateway
```

핵심은 **인증 책임을 Cloudflare Access에 두고**, gateway 앱 자체는 하나만 두는 것입니다.

---

## 1) gateway는 LAN용으로만 열기

gateway가 `0.0.0.0:8000` 또는 `192.168.1.201:8000`에서 떠 있어도 괜찮지만, 공개 인터넷에서 직접 접근되면 안 됩니다.

예시(UFW 사용 시):

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8000 proto tcp
sudo ufw deny 8000/tcp
sudo ufw status numbered
```

서버 외부 인바운드는 막고, LAN만 직접 접근하도록 유지합니다.

---

## 2) cloudflared 설치 및 tunnel 생성

권장 예시는 gateway 서버와 같은 머신이지만, 현재 운영 상태는 **OPNsense(`192.168.1.1`)의 cloudflared가 `192.168.1.201:8000`으로 프록시**하는 구조입니다.

같은 머신에 둘 경우 예시:

```bash
cloudflared --version
cloudflared tunnel login
cloudflared tunnel create totoro-gateway
```

tunnel 생성 후 UUID와 credentials 파일 경로를 확인합니다.

공식 참고:
- Cloudflare Tunnel configuration file
- Cloudflare Tunnel firewall guidance

---

## 3) tunnel 설정 파일 작성

예시 파일: `/etc/cloudflared/config.yml`

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: llm.born2smile.co.kr
    service: http://127.0.0.1:8000
  - service: http_status:404
```

검증:

```bash
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://llm.born2smile.co.kr
```

DNS 라우팅:

```bash
cloudflared tunnel route dns totoro-gateway llm.born2smile.co.kr
```

서비스 등록:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

---

## 4) Cloudflare Access로 외부 경로 보호

Cloudflare Zero Trust에서:

1. **Self-hosted application** 생성
   - Domain: `llm.born2smile.co.kr`
2. 정책 추가
   - **Action: Service Auth**
   - 허용 대상: 생성할 service token

그 다음 **Service Token** 생성:

1. `Access controls > Service credentials > Service Tokens`
2. `Create Service Token`
3. 발급된 값 저장
   - `Client ID`
   - `Client Secret`

이 값은 **한 번만** 완전하게 보여줄 수 있으니 즉시 보관합니다.

---

## 5) Vercel 환경변수 설정

Vercel 프로젝트 환경변수:

```env
LLM_BASE_URL=https://llm.born2smile.co.kr
LLM_MODEL=fast
CLOUDFLARE_ACCESS_CLIENT_ID=<service-token-client-id>
CLOUDFLARE_ACCESS_CLIENT_SECRET=<service-token-client-secret>
LLM_UPSTREAM_TIMEOUT_MS=55000
```

이 저장소의 `app/api/admin/ai-write/route.ts`는 위 값이 있으면 자동으로 아래 헤더를 붙입니다.

- `CF-Access-Client-Id`
- `CF-Access-Client-Secret`

---

## 6) born2smile 앱 동작 방식

현재 앱은:

1. 관리자 브라우저가 `/api/admin/ai-write` 호출
2. Next.js 서버가 Access 헤더를 붙여 `LLM_BASE_URL` 호출
3. Cloudflare Access가 service token 검증
4. 통과하면 tunnel이 `192.168.1.201:8000`의 gateway로 전달

즉 브라우저는 gateway 비밀값을 전혀 알 필요가 없습니다.

---

## 6-1) 2026-04-04 현재 운영 상태

현재 실제로 반영된 상태:

- Tunnel 이름: `totoro-gateway-llm`
- 공개 hostname: `llm.born2smile.co.kr`
- Cloudflare Access app 이름: `totoro-gateway-llm-public`
- Tunnel 실행 호스트: `root@192.168.1.1` (OPNsense)
- origin: `http://192.168.1.201:8000`
- OPNsense 서비스명: `cloudflared_llm`

OPNsense에 생성된 파일:

- `/usr/local/etc/rc.d/cloudflared_llm`
- `/etc/rc.conf.d/cloudflared_llm`
- `/usr/local/etc/cloudflared/llm-token`

민감 정보가 들어 있는 파일:

- `/root/llm-service-token.json`
  - Vercel 서버가 Cloudflare Access를 통과할 때 쓰는 `client_id`, `client_secret`

주의:

- 위 두 token 파일은 **프로젝트 저장소에 커밋하지 않습니다.**
- 토큰을 잃어버리면 **Cloudflare에서 재발급/재생성**하면 됩니다.

---

## 6-2) 현재 필요한 Vercel 환경변수

Production 기준:

```env
LLM_BASE_URL=https://llm.born2smile.co.kr
LLM_MODEL=fast
LLM_UPSTREAM_TIMEOUT_MS=55000
CLOUDFLARE_ACCESS_CLIENT_ID=<from /root/llm-service-token.json>
CLOUDFLARE_ACCESS_CLIENT_SECRET=<from /root/llm-service-token.json>
```

추가 메모:

- `Development`는 로컬 `.env.local`로도 동일 값을 넣어두었습니다.
- `Preview`는 Vercel CLI가 브랜치 지정 없이 일괄 적용하기 까다로워 **Dashboard에서 수동 추가**하는 방식을 권장합니다.

---

## 7) 점검 순서

### 로컬/LAN 직접 점검

LAN에서:

```bash
curl http://192.168.1.201:8000/v1/models
```

### Cloudflare Access 보호 점검

토큰 없이:

```bash
curl -i https://llm.born2smile.co.kr/v1/models
```

토큰 포함:

```bash
curl -i \
  -H "CF-Access-Client-Id: <CLIENT_ID>" \
  -H "CF-Access-Client-Secret: <CLIENT_SECRET>" \
  https://llm.born2smile.co.kr/v1/models
```

### 앱 경유 점검

Vercel 배포 후 관리자 화면에서 AI 작성 도우미 실행:

- 성공 시 `/api/admin/ai-write`가 SSE 응답을 중계
- 실패 시 서버 로그에서 `[ai-write] upstream_error` 또는 `[ai-write] upstream_unavailable` 확인

---

## 8) 장애 시 체크리스트

- `cloudflared` 서비스가 실행 중인지
- `llm.born2smile.co.kr` DNS가 tunnel에 연결되었는지
- Access app 정책이 `Service Auth`인지
- Vercel env의 client id/secret 오타가 없는지
- `192.168.1.201:8000`가 로컬에서 실제 응답하는지
- 서버 방화벽이 `8000/tcp`를 LAN에서만 허용하는지
- `LLM_UPSTREAM_TIMEOUT_MS`가 너무 짧지 않은지

---

## 9) 운영 팁

- service token 만료 알림을 Cloudflare Notifications에서 설정합니다.
- 공개 hostname은 gateway 전용으로 분리하고 다른 용도로 재사용하지 않습니다.
- 장기적으로 필요하면 Cloudflare Access 단일 헤더 모드도 검토할 수 있지만, 현재는 기본 `CF-Access-Client-Id/Secret` 쌍이 가장 단순합니다.
- `root@192.168.1.1`에서 상태 확인:

```sh
service cloudflared_llm onestatus
```

- 로컬 origin 확인:

```sh
curl http://192.168.1.201:8000/v1/models
```

- 공개 경로 보호 확인:

```sh
curl -i https://llm.born2smile.co.kr/v1/models
```

403이면 Access 보호가 살아 있는 정상 상태입니다.

---

## 10) 재생성/복구 원칙

이 구성의 핵심 토큰/앱/터널은 모두 **재생성 가능**합니다.

즉, 장기 백업의 우선순위는 비밀값 자체보다 아래 정보입니다:

- hostname: `llm.born2smile.co.kr`
- Tunnel 이름: `totoro-gateway-llm`
- Access app 이름: `totoro-gateway-llm-public`
- OPNsense 서비스명: `cloudflared_llm`
- origin: `http://192.168.1.201:8000`
- Vercel에 필요한 env 5개

비밀값 유출/분실 시에는:

1. Cloudflare service token 재발급
2. 필요하면 tunnel token 재발급
3. Vercel env 갱신
4. `service cloudflared_llm restart`

로 복구하면 됩니다.
