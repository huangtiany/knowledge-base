import { formatShortDate } from './format';
import { posixJoin, type EntryLike } from './interlinks';

// 文内互链解析：从文章 Markdown 正文提取指向本站 .md 的相对链接，
// 按写作约定解析为目标文章，供文章页 relbox（相关笔记）渲染。
const MD_LINK = /\[[^\]]*\]\(([^)\s]+\.md)\)/g;

export type { EntryLike };

export interface RelatedNote {
  title: string;
  url: string;
  dateShort: string;
}

export function extractRelated(entry: EntryLike, allEntries: EntryLike[], base: string): RelatedNote[] {
  if (!entry.body) return [];
  const seen = new Set<string>();
  const related: RelatedNote[] = [];
  for (const match of entry.body.matchAll(MD_LINK)) {
    // 链接目标相对文章文件所在目录；entry.id 即文章在栏目内的路径（不含扩展名）
    const ownDir = entry.id.includes('/') ? entry.id.slice(0, entry.id.lastIndexOf('/')) : '.';
    const joined = posixJoin(ownDir, match[1]);
    if (!joined) continue;
    const targetId = joined.replace(/\.md$/, '');
    const target = allEntries.find((e) => e.id === targetId);
    if (!target || target.id === entry.id || seen.has(target.id)) continue;
    seen.add(target.id);
    related.push({
      title: target.data.title,
      url: `${base}${target.collection}/${target.id}/`,
      dateShort: formatShortDate(target.data.date),
    });
  }
  return related;
}
