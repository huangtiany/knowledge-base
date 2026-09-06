import type { EntryLike } from './related';

// 文内互链改写：把渲染产物 HTML 里指向 .md 源文件的相对链接，
// 按写作约定解析为目标文章，改写为目录式路由的绝对 URL，并校验目标存在。
//
// 为什么在页面层做而不是 rehype 插件：Astro 5 的内容层渲染管线拿不到源文件路径
// （vfile 为空），无法解析相对链接的基准目录；entry.id 即文章在栏目内的路径，
// 在页面层解析是确定性的。
//
// 为什么必须是绝对路由而不是保持相对链接：文章页是目录式 URL
// （GitHub Pages 会把无尾斜杠请求 301 到 `xxx/`），浏览器从
// `.../ai/agent/01-workflow-vs-agent/` 解析相对链接时会比源文件目录多套一层，
// 所有相对互链在线上都是 404（2026-09-05 全站实测确认）。

export interface EntryLike {
  collection: string;
  id: string;
  body?: string;
  data: { title: string; date: Date };
}

// 互链目标按“解析出的 id”反查文章；同栏目优先，跨栏目歧义视为错误。
// 跨域链接按文件系统相对路径写（如 ../../backend/javaweb/02-session-cookie-filter.md），
// 解析出的 id 首段恰为栏目名时按「栏目/域内路径」跨域解析。
function findTarget(targetId: string, ownCollection: string, allEntries: EntryLike[]): EntryLike | null {
  let hit: EntryLike | null = null;
  let ambiguous = false;
  for (const e of allEntries) {
    if (e.id !== targetId) continue;
    if (e.collection === ownCollection) return e;
    if (hit) ambiguous = true;
    hit = e;
  }
  if (hit && !ambiguous) return hit;
  if (ambiguous) throw new Error(`[interlinks] 互链目标歧义：id "${targetId}" 在多个栏目中存在，请在链接中写明唯一路径`);
  const slash = targetId.indexOf('/');
  if (slash > 0) {
    const dom = targetId.slice(0, slash);
    const rest = targetId.slice(slash + 1);
    const cross = allEntries.find((e) => e.collection === dom && e.id === rest);
    if (cross) return cross;
  }
  return null;
}

export function posixJoin(dir: string, rel: string): string | null {
  // 只接受站内相对路径；拒绝外链、绝对路径与空目标
  if (/^(https?:)?\/\//.test(rel) || rel.startsWith('/')) return null;
  const segments = [...dir.split('/'), ...rel.split('/')];
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.length ? out.join('/') : null;
}

// ownDir：文章在栏目内的目录（entry.id 去掉文件名）；html：entry.rendered.html
export function rewriteInterlinks(html: string, own: { collection: string; id: string }, allEntries: EntryLike[], base: string): string {
  const ownDir = own.id.includes('/') ? own.id.slice(0, own.id.lastIndexOf('/')) : '.';
  return html.replace(/href="([^"#]+\.md)(#[^"]*)?"/g, (whole, mdPart: string, hash = '') => {
    const joined = posixJoin(ownDir, mdPart);
    if (!joined) return whole;
    const targetId = joined.replace(/\.md$/, '');
    const target = findTarget(targetId, own.collection, allEntries);
    if (!target) {
      throw new Error(`[interlinks] 死链：${own.collection}/${own.id} 里的互链 "${mdPart}" 解析不到任何文章。互链必须指向真实存在的 .md 源文件。`);
    }
    const route = `${base}${target.collection}/${target.id}/${hash}`;
    return `href="${route}"`;
  });
}
