import { BASE_URL } from "../constants";
import type { BlogPost } from "./types";

/** 실제 본문에 공개되는 첫 설명 이미지. 장식·숨김 이미지는 검색 대표 이미지에서 제외합니다. */
export function getBlogArticleImage(post: Pick<BlogPost, "blocks">) {
  for (const block of post.blocks) {
    if (block.type !== "image" || block.hidden || block.decorative || !block.src.trim()) continue;

    try {
      const url = new URL(block.src, BASE_URL);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      return {
        url: url.href,
        alt: block.alt,
        ...(block.width && { width: block.width }),
        ...(block.height && { height: block.height }),
      };
    } catch {
      // 잘못된 이미지 URL은 건너뛰고 다음 공개 이미지를 찾습니다.
    }
  }
  return undefined;
}
