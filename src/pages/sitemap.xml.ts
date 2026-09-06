import { getCollection } from 'astro:content';

// 构建期生成 sitemap.xml（零依赖手写；import.meta.env.SITE 即 astro.config 的 site）
export async function GET() {
  const site = import.meta.env.SITE;
  const base = import.meta.env.BASE_URL;
  const ai = await getCollection('ai');
  const backend = await getCollection('backend');
  const front = await getCollection('front');
  const routes: { path: string; lastmod?: Date }[] = [
    { path: '' },
    { path: 'about/' },
    { path: 'ai/' },
    { path: 'backend/' },
    { path: 'front/' },
    { path: 'ai/resources/' },
    { path: 'backend/resources/' },
    { path: 'front/resources/' },
    ...[...ai, ...backend, ...front].map((e) => ({ path: `${e.collection}/${e.id}/`, lastmod: e.data.date })),
  ];
  const urls = routes
    .map(({ path, lastmod }) => {
      const lm = lastmod ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
      return `  <url>\n    <loc>${site}${base}${path}</loc>${lm}\n  </url>`;
    })
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
