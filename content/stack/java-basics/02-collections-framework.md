---
title: 集合框架：List、Map、Set 与 Stream
date: 2026-09-05
tags: [Java基础]
summary: List 对照 Array、Map 对照 Object/Map、Set 对照 Set——映射关系天然顺；真正的新东西是接口与实现的分离，以及 Stream 这个 Java 版链式调用。
---

集合是业务代码里出现频率最高的 API。好消息是映射关系天然顺畅：**List ≈ Array，Map ≈ Object/Map，Set ≈ Set**。需要重建的心智只有两点：Java 集合是"接口 + 多实现"的体系（先声明接口，再选实现），以及处理集合的现代姿势是 Stream。

## List：可增删的数组

```java title="list.java"
List<String> names = new ArrayList<>();     // 接口在前，实现在后 —— 固定写法
names.add("张三");                           // 对照 arr.push()
names.add("李四");
names.get(0);                                // 对照 arr[0]
names.size();                                // 对照 arr.length（不是 length 属性！）
names.remove("李四");
```

`ArrayList` 与 `LinkedList` 都实现了 List 接口：前者底层是数组（随机访问快，**默认选它**），后者是链表（头尾插删快）。日常 99% 用 ArrayList——这个"选实现"的动作，JS 里不存在（Array 只有一种），Java 里永远在做。

## Map：键值对

```java title="map.java"
Map<String, Integer> scoreMap = new HashMap<>();
scoreMap.put("张三", 90);                    // 对照 obj["张三"] = 90 / map.set()
scoreMap.get("张三");                        // 90；键不存在返回 null（不是 undefined）
scoreMap.getOrDefault("李四", 0);            // 对照 obj.x ?? 0
scoreMap.containsKey("张三");
scoreMap.entrySet();                         // 对照 Object.entries()
```

实现选择：`HashMap`（默认，无序）、`TreeMap`（按键排序）。**遍历顺序无保证**——JS 的对象键序有规则，HashMap 真随机，依赖顺序就是 bug。键不存在时 `get` 返回 null 而不是 undefined，配合 NPE 风险（见[基础语法篇](01-syntax-and-oop.md)），`getOrDefault` / `containsKey` 要成为肌肉记忆。

`ConcurrentHashMap` 是多线程场景的 HashMap 替代品（线程安全），在[多线程篇](04-concurrency.md)展开；先记住：业务代码里"全局共享的 Map"要用它。

## Set：去重与存在性

```java title="set.java"
Set<String> tags = new HashSet<>();
tags.add("java");
tags.add("java");
tags.size();                  // 1 —— 自动去重
tags.contains("java");        // O(1)，对照 new Set().has()
```

用途和 JS 的 Set 完全一致：去重、存在性判断。`TreeSet` 有序、`LinkedHashSet` 保插入序。

## 遍历与排序：从 forEach 到 Stream

```java title="iterate.java"
List<Integer> nums = List.of(5, 3, 8, 1);

// for-each：对照 for...of
for (Integer n : nums) { System.out.println(n); }

// 传统排序：Comparator（对照 arr.sort((a,b) => a-b)）
nums.sort(Integer::compareTo);

// Stream：Java 版函数式链式 —— 对照 filter/map/reduce
List<Integer> result = nums.stream()
        .filter(n -> n > 2)              // 对照 filter
        .map(n -> n * 10)                // 对照 map
        .sorted()                        // 对照 sort
        .collect(Collectors.toList());   // 收尾：Stream 是惰性的，collect 才执行
```

Stream 是现代 Java 处理集合的标准姿势，语义与 JS 的 filter/map/reduce 链一一对应，两个差异要适应：①中间操作是惰性的，必须 `collect()`（或 `forEach`）收尾才执行；②`stream()` 用完即弃，每个流只能消费一次，重用要重新 `stream()`。分组统计一步到位：`Collectors.groupingBy(User::getCity)` 对照 reduce 聚合。

## 坑两则

- **`Arrays.asList(...)` 返回固定长度列表**：add/remove 抛 UnsupportedOperationException——要可变列表用 `new ArrayList<>(Arrays.asList(...))`
- **重写 equals 必须重写 hashCode**：否则该对象放进 HashMap/HashSet 后查不到。用 Lombok 或 IDE 生成时两者会成对出现，手写时别漏

## 参考与延伸

- [Java 全栈知识体系 · 集合框架](https://pdai.tech/md/java/collection/java-collection-all.html)
- [JavaGuide · Java 集合框架](https://javaguide.cn/java/collection/java-collection-questions-01.html)
