import { SKIP, visit } from 'unist-util-visit';

// 给带 data-filename 的 <pre> 包上 .codeblock + .cb-bar（左文件名、右语言），
// 对照设计稿 .codeblock / .cb-bar 组件。
export function rehypeCbBar() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || parent === null || parent === undefined || index === null) return;
      const filename = node.properties?.['data-filename'];
      if (!filename) return;
      const lang = node.properties?.['data-lang'] ?? '';
      const bar = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['cb-bar'] },
        children: [
          { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: String(filename) }] },
          { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: String(lang) }] },
        ],
      };
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['codeblock'] },
        children: [bar, node],
      };
      return SKIP;
    });
  };
}
