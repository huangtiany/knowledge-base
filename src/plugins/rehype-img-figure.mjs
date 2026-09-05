import { visit } from 'unist-util-visit';

// "只含一张图片的段落" → figure + figcaption(alt)，
// 对齐设计稿文章页图片的呈现方式。
export function rehypeImgFigure() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || parent === null || parent === undefined || index === null) return;
      if (node.children.length !== 1) return;
      const img = node.children[0];
      if (img.type !== 'element' || img.tagName !== 'img') return;
      const alt = typeof img.properties?.alt === 'string' ? img.properties.alt : '';
      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: {},
        children: [
          img,
          ...(alt
            ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: alt }] }]
            : []),
        ],
      };
    });
  };
}
