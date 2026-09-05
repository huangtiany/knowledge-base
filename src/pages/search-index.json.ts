import { getCollection } from 'astro:content';

// 构建期生成全站文章标题索引（只搜文章标题，不做全文索引）
export async function GET() {
  const ai = await getCollection('ai');
  const stack = await getCollection('stack');
  const base = import.meta.env.BASE_URL;
  const items = [
    ...ai.map((e) => ({ title: e.data.title, dom: 'AI', url: `${base}ai/${e.id}/`, date: e.data.date })),
    ...stack.map((e) => ({ title: e.data.title, dom: '全栈', url: `${base}stack/${e.id}/`, date: e.data.date })),
  ].sort((a, b) => +b.date - +a.date);
  return new Response(
    JSON.stringify(items.map(({ title, dom, url }) => ({ title, dom, url }))),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
