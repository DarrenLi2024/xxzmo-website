# 闲心子墨 全栈项目重构计划

> 基于大厂标准的三维度审查（代码复用 / 质量 / 效率），制定以下详尽重构计划。

---

## 〇、重构目标

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| 代码复用 | 大量复制粘贴（admin chuli/jigu 85-90% 重复） | 单一参数化实现，零副本 |
| 类型安全 | `as any` 绕过类型检查，类型定义分散 | 全链路类型安全，单一类型来源 |
| 渲染策略 | 列表页全量客户端渲染 | RSC + ISR，客户端仅交互孤岛 |
| 数据库效率 | 每标签 4 次查询 (N+1)，全文 LIKE 扫描 | 批量 upsert，FTS5 索引 |
| 错误处理 | 静默 catch、alert() 弹窗 | 统一错误组件，结构化日志 |
| 可访问性 | 无 htmlFor 关联、无 noopener | WCAG 2.1 AA 合规 |
| 依赖管理 | 2 个未使用重型包 | 零冗余依赖 |

---

## 一、架构层重构（第 1 周）

### 1.1 消除页面副本 —— 参数化路由

**问题**：`app/chuli/` 与 `app/jigu/` 的列表页、详情页 100% 重复
**方案**：使用 Next.js 动态路由参数 `[source]`

```
删除: src/app/chuli/page.tsx           (~94行)
删除: src/app/jigu/page.tsx            (~94行)
删除: src/app/chuli/[slug]/page.tsx    (~109行)
删除: src/app/jigu/[slug]/page.tsx     (~105行)
新建: src/app/(articles)/[source]/page.tsx          → 列表
新建: src/app/(articles)/[source]/[slug]/page.tsx   → 详情
```

**收益**：消除 402 行重复代码

### 1.2 统一管理后台文章组件

**问题**：`admin/chuli/page.tsx` 与 `admin/jigu/page.tsx` 85% 重复
**方案**：提取为 `AdminArticleList` 共享组件

```
新建: src/components/admin/AdminArticleList.tsx
重构: admin/chuli/page.tsx → 使用 AdminArticleList(source="chuli")
重构: admin/jigu/page.tsx  → 使用 AdminArticleList(source="jigu")
```

**收益**：消除 150 行重复代码

### 1.3 合并文章新建/编辑表单

**问题**：`chuli/new/` 与 `chuli/[id]/edit/` 表单 80% 重复
**方案**：提取 `ArticleForm` 组件，通过 `mode` prop 切换

```
新建: src/components/admin/ArticleForm.tsx
重构: admin/chuli/new/page.tsx          → <ArticleForm mode="create" source="chuli" />
重构: admin/chuli/[id]/edit/page.tsx    → <ArticleForm mode="edit" source="chuli" />
重构: admin/jigu/[id]/edit/page.tsx     → <ArticleForm mode="edit" source="jigu" />
```

---

## 二、数据层优化（第 1 周）

### 2.1 标签同步批量化

**问题**：每标签 4 次独立查询（N+1），6 个端点均受影响
**方案**：提取 `syncArticleTags()` 函数，使用 `$transaction` 批量 upsert

```typescript
// src/lib/tag-service.ts
export async function syncArticleTags(articleId: string, tagNames: string[]) {
  return prisma.$transaction(async (tx) => {
    // 1. 批量 upsert 标签
    const tags = await Promise.all(tagNames.map(name =>
      tx.tag.upsert({ where: { name }, create: { name }, update: {} })
    ));
    // 2. 清理旧关联
    await tx.tagOnArticle.deleteMany({ where: { articleId } });
    // 3. 批量创建新关联
    await tx.tagOnArticle.createMany({
      data: tags.map(t => ({ articleId, tagId: t.id })),
    });
    // 4. 批量更新计数
    await Promise.all(tags.map(t =>
      tx.tag.update({ where: { id: t.id }, data: { count: { increment: 1 } } })
    ));
  });
}
```

**收益**：标签同步从 O(4n) 次查询降至 O(1) 次事务

### 2.2 文章数据映射统一

**问题**：Prisma → API JSON 映射逻辑在 4 个路由中重复
**方案**：提取 `serializeArticle()` 和 `serializeArticleListItem()` 到 `src/lib/serialize.ts`

```typescript
// 统一序列化，消除 dateParsed?.toISOString() ?? null 在 8 处的重复
export function serializeArticle(article: PrismaArticleWithRelations): ArticleDetail
export function serializeArticleListItem(article: PrismaArticleWithRelations): ArticleListItem
```

### 2.3 全文搜索索引

**问题**：`contains` 搜索执行全表 LIKE 扫描
**方案**：为 SQLite 添加 FTS5 虚拟表（可选：生产环境迁移至 PostgreSQL 使用 `tsvector`）

```
Prisma schema 新增: 手动 FTS5 迁移脚本
API 层: 搜索优先查询 FTS 表，回退至 LIKE
```

### 2.4 去除冗余标签计数查询

**问题**：`/api/tags` 既取 `count` 列又取 `_count.articles`（重复计算）
**修复**：移除 `include: { _count: ... }`，仅从 `Tag.count` 读取

---

## 三、渲染策略升级（第 2 周）

### 3.1 列表页 RSC + ISR

**问题**：`chuli/page.tsx`, `jigu/page.tsx`, `page.tsx` 全量客户端渲染
**方案**：

```
# 列表页：服务端组件 + ISR
src/app/(articles)/[source]/page.tsx
  - 服务端直接查询 Prisma（无需 fetch /api/articles）
  - revalidate = 60 (ISR)
  - FilterBar 作为客户端孤岛单独引入
  - 首屏文章卡片服务端渲染

# 文章流 (无限滚动)
src/components/article/ArticleFlow.tsx
  - 保留为客户端组件
  - 接受 serverProps: { initialArticles, hasMore }
  - 仅从第 2 页开始发起客户端请求
```

### 3.2 Footer 消除 "use client"

**问题**：Footer 只为检测 `/admin` 路径而全量客户端渲染
**方案**：

```typescript
// src/app/layout.tsx — 通过条件布局排除 Footer
import { AdminLayoutWrapper } from "@/components/layout/AdminLayoutWrapper";

// admin 路径不渲染 Footer，消除 Footer 的客户端水合
```

### 3.3 详情页避免自体 HTTP 请求

**问题**：`chuli/[slug]/page.tsx` 在服务端通过 `fetch(localhost)` 请求自己的 API
**方案**：直接导入 Prisma Client 查询

```typescript
// Before (多余HTTP往返):
const res = await fetch(`${API_BASE}/api/articles/${slug}`);
// After (直接查询):
const article = await prisma.article.findUnique({ where: { slug } });
```

### 3.4 管理后台懒加载

对管理端重页面（API 配置、辑古台、导入页）使用 `dynamic(() => import(...), { ssr: false })` 优化首屏。

---

## 四、类型系统重构（第 2 周）

### 4.1 单一类型来源

**问题**：`ArticleType` 在两个文件中分别定义
**方案**：

```
删除: src/types/article.ts 中的 ArticleType 字面量定义
保留: src/lib/constants.ts  中的 ARTICLE_TYPES (唯一真相源)
从 constants 导出 derive 类型:
  export type ArticleType = (typeof ARTICLE_TYPES)[number];
```

### 4.2 消除 `as any`

**问题**：`api/admin/articles/route.ts:35` 使用 `as any` 绕过 Prisma 类型检查
**方案**：使用 Prisma 生成的 `ArticleCreateInput` 类型构建数据对象

### 4.3 前端接口统一使用集中类型

**问题**：8 个组件/页面各自内联定义 `interface ArticleItem`
**方案**：全部从 `@/types/article` 导入 `ArticleListItem` / `ArticleDetail`

---

## 五、错误处理与日志（第 2 周）

### 5.1 API 错误包装器

**问题**：try-catch 模式在 6+ 个 API 路由中重复
**方案**：创建 API 错误处理中间件/包装器

```typescript
// src/lib/api-handler.ts
export function apiHandler(handler: ApiRouteHandler) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const status = error instanceof ValidationError ? 400 : 500;
      console.error(`[API Error]`, error);
      return NextResponse.json({ error: message }, { status });
    }
  };
}
```

### 5.2 前端错误状态替代 alert()

**问题**：3 个管理表单使用 `alert()` 提示错误
**方案**：所有表单统一使用内联错误状态组件

### 5.3 静默 catch 改为结构化日志

**问题**：8 处 `.catch(() => {})` 或 `catch { // ignore }`
**方案**：至少 `console.error("[ComponentName]", error)`

---

## 六、可访问性修复（第 3 周）

### 6.1 Form Label 关联

所有管理表单 `<label>` + `<input>` 组合添加 `htmlFor`/`id` 配对。

### 6.2 target="_blank" 安全修复

所有外链添加 `rel="noopener noreferrer"`。

### 6.3 交互元素焦点管理

模态框(每日名句)、移动端菜单添加焦点陷阱和键盘导航(ESC 关闭)。

---

## 七、依赖清理与配置优化（第 3 周）

### 7.1 移除未使用依赖

```
删除: framer-motion (未导入, ~32KB gzipped)
删除: fuse.js       (未导入, ~10KB gzipped)
```

### 7.2 常量提取

| 常量 | 位置 | 用途 |
|------|------|------|
| `EXCERPT_MAX_LENGTH` = 80 | `constants.ts` | 卡片摘录长度 |
| `MAX_VISIBLE_TAGS` = 6 | `constants.ts` | TagBar 显示上限 |
| `ISR_REVALIDATE` = 60 | `constants.ts` | ISR 刷新间隔 |
| `AUTH_RATE_LIMIT` = { max: 5, window: 60000 } | `constants.ts` | 登录频率限制 |
| `COOKIE_MAX_AGE` = 604800 | `constants.ts` | 7天 session |
| `ARTICLE_STATUS` = ["draft", "published"] | `constants.ts` | 状态枚举 |
| `DEFAULT_PAGE_SIZE` = 10 | `constants.ts` | 默认分页 |

### 7.3 Split 大型组件

- `AdminApiConfigPage` (208行) → 提取 `ProviderCard` + `ProviderEditForm`
- `DailyQuoteSection` (84行) → 提取 `DailyQuoteModal`
- `ChuliImportPage` (192行) → 提取 `parseImportText` 到 `src/lib/parse-import.ts`

---

## 八、安全性加固（第 3 周）

### 8.1 Rate Limiter 内存泄漏修复

**问题**：`setInterval` 在 HMR 时累积不清理
**方案**：延迟清理策略 —— 仅在 `checkRateLimit()` 调用时惰性清除过期条目，移除持久化 interval

### 8.2 请求体大小限制

添加请求体大小限制防止内存耗尽攻击。

### 8.3 CSRF 保护

管理后台 API 添加 `SameSite=Strict` cookie 策略和自定义请求头校验。

---

## 九、实施路线图

```
第1周 ─────────────────────────────────────────────
│ Day 1-2:  [P0] 参数化路由 (1.1) + 管理组件提取 (1.2) + 表单合并 (1.3)
│ Day 3-4:  [P0] 标签批量优化 (2.1) + 序列化统一 (2.2) + N+1 修复
│ Day 5:    [P1] 依赖清理 (7.1) + 常量提取 (7.2) + Rate-limiter 修复 (8.1)
│
第2周 ─────────────────────────────────────────────
│ Day 1-2:  [P0] RSC + ISR 渲染策略 (3.1-3.3) + 自体fetch消除 (3.3)
│ Day 3-4:  [P0] 类型系统重构 (4.1-4.3) + 消除 as any
│ Day 5:    [P1] 错误处理统一 (5.1-5.3)
│
第3周 ─────────────────────────────────────────────
│ Day 1-2:  [P1] A11y 修复 (6.1-6.3)
│ Day 3:    [P2] 组件拆分 (7.3) + 管理懒加载 (3.4)
│ Day 4:    [P2] FTS 搜索优化 (2.3) + CSRF (8.3)
│ Day 5:    [P2] 测试验证 + 文档更新
```

> **P0 = 立即修复（高影响），P1 = 本迭代修复，P2 = 可排到下个迭代**

---

## 十、验收标准

- [ ] 零 `as any` 类型断言
- [ ] 零页面/组件副本（chuli vs jigu 合并）
- [ ] 列表页 TTFP < 1.5s（ISR 静态生成）
- [ ] 标签同步 < 3 次 DB 查询
- [ ] 所有管理表单 `<label htmlFor="..."/>` 正确关联
- [ ] 零静默 catch 块
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npx next build` 零警告
- [ ] 管理后台每个页面首屏 < 100KB JS
