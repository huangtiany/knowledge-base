import { visit } from 'unist-util-visit';

// 文内互链按架构文档写作约定指向 .md 源文件；
// 构建期把 "/path/to/note.md" 改写为目录式路由 "/path/to/note/"。
// 相对链接保持相对：浏览器基于当前文章页 URL 解析，天然携带 /knowledge-base/ 前缀。
export function rehypeMdLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string' || !href.endsWith('.md')) return;
      node.properties.href = `${href.slice(0, -'.md'.length)}/`;
    });
  };
}
