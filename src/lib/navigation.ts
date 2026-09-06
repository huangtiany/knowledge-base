// 栏目页分组与学习路径链：tags.yaml 清单是组序的唯一事实源（DESIGN.md「标签清单」）。
// 组内按文件名序号排（01-、02-… 即学习路径）；同批写就的笔记日期相同，按日期排会打乱学习顺序。

export interface TagGroups<T> {
  /** 有内容的标签，按清单顺序 */
  filled: string[];
  /** 清单里有、但还没有内容的标签（待学习差集） */
  waiting: string[];
  /** 标签 → 该组文章（组内文件名序号升序）；只含清单内标签 */
  byTag: Map<string, T[]>;
}

export function groupArticlesByTags<T extends { data: { tags: string[] } }>(
  domainTags: string[],
  articles: T[],
): TagGroups<T> {
  const byTag = new Map(domainTags.map((t) => [t, [] as T[]]));
  for (const a of articles) for (const t of a.data.tags) byTag.get(t)?.push(a);
  for (const list of byTag.values()) {
    list.sort((a, b) => (a as any).id.localeCompare((b as any).id, undefined, { numeric: true }));
  }
  return {
    filled: domainTags.filter((t) => byTag.get(t)!.length > 0),
    waiting: domainTags.filter((t) => byTag.get(t)!.length === 0),
    byTag,
  };
}

// 学习路径链：标签清单顺序 × 组内文件名序，把全领域文章拉成一条链（多标签文章取首现位置）。
// 与文章列表页的分组阅读顺序一致，详情页「上一篇 / 下一篇」沿此链走。
export function buildDomainChain<T extends { id: string; data: { tags: string[] } }>(
  domainTags: string[],
  articles: T[],
): T[] {
  const { filled, byTag } = groupArticlesByTags(domainTags, articles);
  const seen = new Set<string>();
  const chain: T[] = [];
  for (const tag of filled) {
    for (const a of byTag.get(tag)!) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      chain.push(a);
    }
  }
  return chain;
}

export function chainNeighbors<T extends { id: string }>(
  chain: T[],
  id: string,
): { prev?: T; next?: T } {
  const i = chain.findIndex((a) => a.id === id);
  if (i < 0) return {};
  return { prev: chain[i - 1], next: chain[i + 1] };
}
