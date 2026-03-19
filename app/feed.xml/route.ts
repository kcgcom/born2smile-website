import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { getBlogPostUrl, getCategoryLabel } from "@/lib/blog";
import { BASE_URL, CLINIC } from "@/lib/constants";

export const revalidate = 3600; // 1시간

export async function GET() {
  const posts = await getAllPublishedPostMetas();

  // 최신순 정렬, 최대 50개
  const sorted = [...posts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  const lastBuildDate = sorted[0]
    ? new Date(sorted[0].date).toUTCString()
    : new Date().toUTCString();

  const items = sorted
    .map((post) => {
      const url = `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`;
      const pubDate = new Date(post.date).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <category>${escapeXml(getCategoryLabel(post.category))}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CLINIC.name)} 블로그</title>
    <link>${BASE_URL}/blog</link>
    <description>${escapeXml(CLINIC.name)} 치과 건강 정보 블로그</description>
    <language>ko</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
