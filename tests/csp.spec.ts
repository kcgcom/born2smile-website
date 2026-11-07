import { test, expect } from '@playwright/test';

function getDirective(csp: string, name: string) {
  return csp
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `));
}

test('카카오 지도 SDK의 현재 CDN을 스크립트 소스로 허용한다', async ({ request }) => {
  const response = await request.get('/contact');
  const csp = response.headers()['content-security-policy'];
  expect(csp).toBeTruthy();
  const scriptSrc = getDirective(csp, 'script-src');
  expect(scriptSrc).toContain('https://dapi.kakao.com');
  expect(scriptSrc).toContain('https://t1.kakaocdn.net');
});

test('분석 서비스의 실제 수집 엔드포인트를 CSP에서 허용한다', async ({ request }) => {
  const response = await request.get('/');
  const csp = response.headers()['content-security-policy'];

  expect(csp).toBeTruthy();

  const connectSrc = getDirective(csp, 'connect-src');
  const imageSrc = getDirective(csp, 'img-src');

  expect(connectSrc).toContain('https://*.google-analytics.com');
  expect(connectSrc).toContain('https://analytics.google.com');
  expect(connectSrc).toContain('https://*.analytics.google.com');
  expect(connectSrc).toContain('https://www.googletagmanager.com');
  expect(connectSrc).toContain('https://*.g.doubleclick.net');
  expect(connectSrc).toContain('https://www.google.co.kr');
  expect(connectSrc).toContain('https://nam.veta.naver.com');

  expect(imageSrc).toContain('https://*.google-analytics.com');
  expect(imageSrc).toContain('https://www.googletagmanager.com');
  expect(imageSrc).toContain('https://*.g.doubleclick.net');
  expect(imageSrc).toContain('https://www.google.co.kr');
});
