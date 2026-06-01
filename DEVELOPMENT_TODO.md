# 闲心子墨 - 功能升级开发计划

> 创建日期：2026-05-17  
> 计划周期：6个月（分阶段执行）

---

## 阶段一：P0 核心增强（文学功能深化）

### 1.1 拼音注音系统

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] pinyin-schema-add | 数据库：`Article` 添加 `pinyin` 字段（已存在，检查是否填充） | TODO |
| [ ] pinyin-api-parse | 后端API：添加 `/api/admin/articles/[id]/pinyin` - 调用LLM生成拼音 | TODO |
| [ ] pinyin-ruby-component | 前端组件：`<RubyText>` 组件，支持 `<ruby>` 标签渲染 | TODO |
| [ ] pinyin-article-update | 文章详情页：正文关键位置显示拼音（可选toggle） | TODO |
| [ ] pinyin-admin-panel | 后台编辑页：添加「生成拼音」按钮 | TODO |

### 1.2 繁体/简体切换

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] conversion-lib-install | 安装 `chinese-simplified` / `han-loc` 转换库 | TODO |
| [ ] conversion-context | 创建 `LanguageContext` - 全局简繁体状态 | TODO |
| [ ] conversion-toggle-ui | Header/Footer：添加切换按钮 | TODO |
| [ ] conversion-article-apply | 文章内容：实时转换（正文/注释/译文/赏析） | TODO |
| [ ] conversion-persistence | localStorage 记住用户偏好 | TODO |

### 1.3 译文对照模式

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] parallel-view-component | 新组件 `<ParallelView>` - 左右对照布局 | TODO |
| [ ] parallel-view-toggle | PanelGroup：添加「对照」模式切换 | TODO |
| [ ] parallel-view-responsive | 移动端改为上下对照（译文在下方） | TODO |

### 1.4 朗读功能（可选）

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] tts-integration | 集成 Web Speech API (speechSynthesis) | TODO |
| [ ] audio-player-ui | 底部浮动播放器：播放/暂停/进度 | TODO |
| [ ] audio-voice-select | 支持选择不同语音（中文男/女） | TODO |
| [ ] audio-speed-control | 语速调节：0.5x / 1x / 1.5x | TODO |

---

## 阶段二：P1 内容增强（知识发现）

### 2.1 作者专页

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] author-route-create | 路由：`/author/[name]` | TODO |
| [ ] author-api-endpoint | API：`GET /api/authors` - 获取所有作者列表 | TODO |
| [ ] author-api-articles | API：`GET /api/authors/[name]/articles` - 获取作者作品 | TODO |
| [ ] author-page-component | 页面：作者头像/简介/作品列表/朝代 | TODO |
| [ ] author-dynasty-tag | 作者页：关联朝代标签，可点击跳转 | TODO |

### 2.2 朝代专题页

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] dynasty-route-create | 路由：`/dynasty/[tang\|song\|yuan\|ming\|qing]` | TODO |
| [ ] dynasty-api-endpoint | API：`GET /api/dynasties` - 获取所有朝代及作品数 | TODO |
| [ ] dynasty-page-component | 页面：朝代简介/代表作者/代表作品 | TODO |

### 2.3 作品集/系列

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] collection-model | Prisma 新模型：`Collection` (id, name, description, slug) | TODO |
| [ ] collection-relation | Prisma：`Article` 添加 `collectionId` 字段 | TODO |
| [ ] collection-api-crud | API：`/api/admin/collections` CRUD | TODO |
| [ ] collection-ui-management | 后台：创建/编辑/删除作品集 | TODO |
| [ ] collection-page | 页面：`/collection/[slug]` - 作品集详情页 | TODO |

### 2.4 相似推荐

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] recommendation-api | API：`GET /api/articles/[slug]/related` - 基于标签/类型推荐 | TODO |
| [ ] recommendation-algorithm | 算法：同标签 > 同类型 > 同作者 > 同朝代 | TODO |
| [ ] recommendation-ui | 文章详情页底部：「相关推荐」区块 | TODO |

---

## 阶段三：P2 体验优化（阅读深度）

### 3.1 用户批注系统

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] note-model | Prisma 新模型：`Note` (id, articleId, userId, content, position, createdAt) | TODO |
| [ ] note-auth-required | 批注需要登录（可选：匿名批注） | TODO |
| [ ] note-api-crud | API：`/api/notes` CRUD | TODO |
| [ ] note-ui-annotate | 文章页：选中文本 → 弹出「添加批注」 | TODO |
| [ ] note-ui-display | 批注以浮层形式显示（类似微信读书） | TODO |
| [ ] note-my-page | 用户页面：`/my/notes` - 我的批注列表 | TODO |

### 3.2 阅读进度与状态

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] reading-progress-model | Prisma 新模型：`ReadingProgress` (articleId, userId, status, progress) | TODO |
| [ ] reading-status-enum | 状态：`unread` | `reading` | `completed` | TODO |
| [ ] reading-api | API：更新阅读进度/状态 | TODO |
| [ ] reading-ui-indicator | 文章详情页：显示「在读/已读」标记 | TODO |
| [ ] reading-my-page | 用户页面：`/my/reading` - 阅读历史与进度 | TODO |

### 3.3 收藏夹功能

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] favorite-model | Prisma 新模型：`Favorite` (id, userId, articleId, folderId) | TODO |
| [ ] folder-model | Prisma 新模型：`FavoriteFolder` (id, userId, name, description) | TODO |
| [ ] favorite-api | API：添加收藏/创建文件夹/移动 | TODO |
| [ ] favorite-ui-button | 文章页：添加「收藏」按钮 | TODO |
| [ ] favorite-ui-page | 页面：`/my/favorites` - 收藏夹管理 | TODO |

### 3.4 搜索关键词高亮

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] search-highlight-util | 工具函数：`<mark>` 标签包裹关键词 | TODO |
| [ ] search-highlight-apply | 搜索结果页：对标题/正文应用高亮 | TODO |

### 3.5 夜间模式优化

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] dark-mode-painting | 夜间：配图亮度降低 50% | TODO |
| [ ] dark-mode-typography | 夜间：正文对比度降低（从 #1A1A1A 调至 #B0B0B0） | TODO |
| [ ] dark-mode-toggle-ui | 更直观的昼夜切换图标（太阳/月亮） | TODO |

---

## 阶段四：P3 社区与扩展

### 4.1 评论系统

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] comment-model | Prisma 新模型：`Comment` (articleId, userId, content, parentId) | TODO |
| [ ] comment-api-crud | API：`/api/comments` CRUD | TODO |
| [ ] comment-ui-list | 文章页：评论列表（支持嵌套回复） | TODO |
| [ ] comment-ui-form | 评论框：登录用户可评论 | TODO |
| [ ] comment-moderation | 后台：评论审核（可选） | TODO |

> 注：也可考虑使用 Giscus（GitHub Discussions）替代自建

### 4.2 订阅与通知

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] rss-feed | RSS：`/feed.xml` - 全站文章订阅 | TODO |
| [ ] email-subscription-model | Prisma 新模型：`Subscriber` (email, confirmed, createdAt) | TODO |
| [ ] email-subscribe-ui | 页面：底部订阅表单 | TODO |
| [ ] email-send-logic | 发送逻辑：新文章发布时发送邮件（需邮件服务） | TODO |

### 4.3 数据导出

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] export-favorites | 导出我的收藏：JSON/CSV | TODO |
| [ ] export-reading-history | 导出阅读历史：JSON/CSV | TODO |
| [ ] export-articles | 后台：导出文章数据（支持 Markdown 格式） | TODO |

### 4.4 公开API

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] public-api-auth | 公开API：`/api/v1/articles` - 需API Key认证 | TODO |
| [ ] public-api-docs | API文档页：`/docs` - Swagger UI | TODO |
| [ ] public-api-rate-limit | 频率限制：公开API单独限制 | TODO |

---

## 阶段五：技术升级

### 5.1 数据库升级

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] db-migrate-postgres | 迁移：SQLite → PostgreSQL | TODO |
| [ ] db-fts-index | 添加 FTS5 全文搜索索引 | TODO |
| [ ] db-optimize-queries | 优化慢查询（EXPLAIN ANALYZE） | TODO |

### 5.2 图片优化

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] image-next-image | 替换 `<img>` 为 `next/image` | TODO |
| [ ] image-blur-placeholder | 添加 blurDataURL 加载占位 | TODO |
| [ ] image-cdn-setup | 配置图片CDN（可选） | TODO |

### 5.3 国际化 (i18n)

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] i18n-next-intl | 安装 `next-intl` | TODO |
| [ ] i18n-translations | 翻译文件：`en.json` / `zh.json` | TODO |
| [ ] i18n-ui-toggle | 切换中/英文界面 | TODO |

### 5.4 PWA支持

| 任务 | 描述 | 状态 |
|------|------|------|
| [ ] pwa-manifest | `manifest.json` 配置 | TODO |
| [ ] pwa-service-worker | Service Worker 缓存策略 | TODO |
| [ ] pwa-offline | 离线访问已读文章 | TODO |

---

## 执行优先级矩阵

| 优先级 | 任务组 | 预计工时 | 开始时间 |
|--------|--------|----------|----------|
| P0 | 拼音注音 + 繁体切换 + 译文对照 | 3-4天 | 第1周 |
| P1 | 作者专页 + 朝代专题 + 相似推荐 | 2-3天 | 第2周 |
| P2 | 批注 + 收藏 + 搜索高亮 | 3-4天 | 第3-4周 |
| P3 | 评论 + RSS + 导出 | 2-3天 | 第5-6周 |
| 技升 | 数据库 + 图片 + i18n + PWA | 持续 | 穿插 |

---

## 技术栈依赖（需安装）

```json
{
  "dependencies": {
    "chinese-simplified": "^1.0.0",
    "next-intl": "^3.0.0",
    "@ducanh2912/next-pwa": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

---

## 验收标准

- [ ] 所有新增功能 `tsc --noEmit` 零错误
- [ ] 所有新增页面 `next build` 零警告
- [ ] 功能有对应的单元测试（可选）
- [ ] 用户文档更新（如有）

---

> 计划制定：闲心子墨开发团队  
> 下次评审：待定