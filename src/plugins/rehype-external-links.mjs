import { visit } from 'unist-util-visit';

// 正文外链默认新页签打开：http(s) 的 <a> 补 target=_blank + rel=noopener noreferrer。
// 站内互链改写后的绝对路由（/knowledge-base/...）不带协议，不会命中；已有 rel 做并集不覆盖。
export function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string' || !/^https?:\/\//.test(href)) return;
      node.properties.target = '_blank';
      const rel = new Set(String(node.properties.rel ?? '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      node.properties.rel = [...rel].join(' ');
    });
  };
}
