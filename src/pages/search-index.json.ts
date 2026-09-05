import { getCollection } from 'astro:content';

// 构建期生成全站搜索索引：标题 + 正文纯文本，前端子串匹配（中文无需分词）。
// 正文由 Markdown 源码剥除语法得到，保留代码块与行内代码文本（可搜代码标识符）；
// 首次搜索时才 fetch，体积不占首屏。
function toPlainText(body: string): string {
  return body
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1') // 围栏代码 → 保留代码文本
    .replace(/`([^`]+)`/g, '$1') // 行内代码 → 保留代码文本
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → 只留说明文字
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 只留链接文字
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // 标题记号
    .replace(/^\s*[-*+]\s+/gm, '') // 列表记号
    .replace(/^\s*>\s?/gm, '') // 引用记号
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 粗体
    .replace(/\*([^*\n]+)\*/g, '$1') // 斜体
    .replace(/^\s*(?:---+|\*\*\*+)\s*$/gm, '') // 分隔线
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function GET() {
  const ai = await getCollection('ai');
  const stack = await getCollection('stack');
  const base = import.meta.env.BASE_URL;
  const items = [
    ...ai.map((e) => ({ title: e.data.title, dom: 'AI', url: `${base}ai/${e.id}/`, date: e.data.date, text: toPlainText(e.body ?? '') })),
    ...stack.map((e) => ({ title: e.data.title, dom: '全栈', url: `${base}stack/${e.id}/`, date: e.data.date, text: toPlainText(e.body ?? '') })),
  ].sort((a, b) => +b.date - +a.date);
  return new Response(
    JSON.stringify(items.map(({ title, dom, url, text }) => ({ title, dom, url, text }))),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
