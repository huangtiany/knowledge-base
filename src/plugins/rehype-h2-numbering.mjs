import { visit } from 'unist-util-visit';

// 构建期给 h2 生成 "§ N" 编号（对照设计稿 .hno）；
// 在 rehype-slug 之后执行，锚点 id 由原标题文本产生，不受影响。
export function rehypeH2Numbering() {
  return (tree) => {
    let n = 0;
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2') return;
      n += 1;
      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { className: ['hno'] },
        children: [{ type: 'text', value: `§ ${n}` }],
      });
    });
  };
}
