import { getCollection } from 'astro:content';

// 构建期生成 RSS 2.0（零依赖手写）：三个领域的笔记按日期倒序混排，description 取 summary
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const site = import.meta.env.SITE;
  const base = import.meta.env.BASE_URL;
  const ai = await getCollection('ai');
  const backend = await getCollection('backend');
  const front = await getCollection('front');
  const items = [...ai, ...backend, ...front]
    .sort((a, b) => +b.data.date - +a.data.date)
    .map((e) => {
      const url = `${site}${base}${e.collection}/${e.id}/`;
      const summary = e.data.summary ? `\n    <description>${escapeXml(e.data.summary)}</description>` : '';
      return `  <item>\n    <title>${escapeXml(e.data.title)}</title>\n    <link>${url}</link>\n    <guid>${url}</guid>\n    <pubDate>${e.data.date.toUTCString()}</pubDate>${summary}\n  </item>`;
    })
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>格致</title>\n    <link>${site}${base}</link>\n    <description>格致 · 个人知识库：前端、后端与 AI / Agent 的笔记与资料</description>\n    <atom:link href="${site}${base}rss.xml" rel="self" type="application/rss+xml" />\n    <language>zh-CN</language>\n${items}\n  </channel>\n</rss>\n`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
}
