import { fetchAdminResponse } from "./useAdminApi";

export async function readAdminUpdates<T>(endpoint: string, onUpdate: (update: T) => void, parseJson?: (data: T) => T) {
  const response = await fetchAdminResponse(endpoint, "application/x-ndjson");
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const { data } = await response.json() as { data: T };
    onUpdate(parseJson ? parseJson(data) : data);
    return;
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("성과 응답을 읽지 못했습니다.");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = JSON.parse(line) as { update?: T; done?: true };
        if (event.done) return;
        if (event.update) onUpdate(event.update);
      }
    }
    throw new Error("성과 조회가 끝나기 전에 연결이 끊겼습니다.");
  } finally {
    await reader.cancel().catch(() => {});
  }
}
