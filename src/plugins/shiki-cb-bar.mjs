// Shiki transformer：把代码块 info string 里的 title="file.ext" 与语言
// 写到 <pre> 的 data 属性上，供 rehype-cb-bar 包标签条使用。
export function cbBarTransformer() {
  return {
    name: 'gezhi-cb-bar-meta',
    pre(node) {
      const meta = this.options.meta?.__raw ?? '';
      const title = /(?:^|\s)title="([^"]+)"/.exec(meta)?.[1];
      if (!title) return;
      node.properties ??= {};
      node.properties['data-filename'] = title;
      node.properties['data-lang'] = this.options.lang ?? '';
    },
  };
}
