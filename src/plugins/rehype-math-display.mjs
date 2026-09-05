import { visit } from 'unist-util-visit';

// rehype-katex 的块公式输出为根级 <span class="katex-display">；
// 补挂 math-display 类，使全局样式中的公式卡片（白底/边框/居中）生效。
export function rehypeMathDisplay() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'span') return;
      const cls = node.properties?.className;
      if (!Array.isArray(cls) || !cls.includes('katex-display')) return;
      node.properties.className = [...cls, 'math-display'];
    });
  };
}
