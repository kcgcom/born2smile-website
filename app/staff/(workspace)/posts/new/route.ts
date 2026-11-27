export function GET() {
  return new Response("요청하신 페이지를 찾을 수 없습니다.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
