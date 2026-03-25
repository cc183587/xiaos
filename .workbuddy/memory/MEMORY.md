# 工作记忆

## 项目：工厂产量工资管理系统（index.html）

**文件路径**: `c:\Users\J.s\WorkBuddy\20260323021915\index.html`
**技术栈**: 纯 HTML + JS + localStorage（单文件系统）

### 报损/结束批次功能（2026-03-24 补充）
- **场景**：入库500件但只能出货495件（次品/缺料），无法100%出完
- **新增状态**：`closed`（已结束），用于手动关闭未出完的批次
- **结束批次弹窗**：出库弹窗新增"结束批次"选项卡，填写报损数量+原因（缺料/次品/返工损耗/其他）+备注
- **批次卡片**：closed状态灰色标识，进度条下方显示报损件数和原因
- **利润**：报损部分不计利润，只累计已出货利润
- **统计修正**：入库量统计改为所有状态均按创建月份计入（不再只计in状态）
- **Excel导出**：批次表新增报损数量、报损原因列，并附报损子行
- **问题**：原来一次出库就把整批次标记为"已出库"，不支持分批出货
- **改造**：
  - 批次新增 `deliveries` 数组，每次出货存一条记录（date/qty/cost/wageShare/profit）
  - 批次状态扩展：`in`（入库中）→ `partial`（部分出库）→ `out`（完全出库）
  - 出库按钮支持连续点击，弹窗显示剩余库存，可多次分批出库
  - 批次卡片新增出库进度条 + 出货历史明细表
  - 总览统计改为按每次出货的日期归入对应月份
  - Excel 导出批次表新增剩余库存、状态列、并附出货明细子行
- **Bug修复（2026-03-24）**：员工登记产量时，批次查找只认 `status === 'in'`，导致部分出库（`partial`）状态的批次无法关联，提示"请联系老板"。已修复为同时接受 `in` 和 `partial`。
- **今日总览（2026-03-24）**：总览页新增「☀️ 今日总览」卡片，展示今日出货数量、员工工资、今日收益（出货量×单价-工资）。新增 `extractDateStr` 辅助函数兼容中文 toLocaleString 格式的日期解析。
- **总览页 UI 重设计（2026-03-25）**：全面重新设计总览页样式。今日总览改为深色渐变卡片（`sv-today`），本月/上月/累计使用带彩色圆点标题的白色区块（`sv-section`），KPI 指标改用带图标的彩色小卡片（`sv-kpi`），新增导出/备份按钮美化。CSS 新增 `sv-*` 前缀专属样式类，JS 中提取 `renderKpiGrid()` 辅助函数统一渲染四个统计格。
- **登录与 UI 细节优化（2026-03-25）**：① 员工登录 toast 改为"登录成功"，欢迎语改为时间段问候+名字+同学（如"早上好！廖雪晴 同学"），新增 `getGreeting()` 辅助函数；② 登录页删除管理员账号和工号格式的提示文字；③ 首页输入框 placeholder 改为"请输入工号"；④ 出入库状态标签改为彩色底色+深色文字的 badge 风格（入库中=黄底/部分出库=蓝底/已出库=绿底/已结束=灰底）；⑤ 员工管理列表工号列加上 `text-align:center` 确保列内容与表头对齐。
- **工资统计列表样式改版（2026-03-25）**：按用户提供的参考样式重写工资统计卡片。原 `wage-stat-card` 等旧 class 全部替换为 `salary-summary-card`，去掉了 `position:absolute` 固定表头方案，改为普通流布局。表头浅蓝底色、5列等宽（`flex:1`）、员工金额蓝紫色、合计行红色加粗大字，完全对齐参考设计。
- **刷新页面保持登录状态（2026-03-25）**：新增登录状态管理功能，登录成功后保存会话到 localStorage，页面加载时自动检查并恢复登录状态。支持管理员和员工两种角色，会话有效期8小时。解决刷新页面跳回登录界面的问题。

## 项目：个人博客网站（SQLite + Node.js 后端）

**创建时间**: 2026-03-23
**项目路径**: `c:\Users\J.s\WorkBuddy\20260323021915\blog\`
**后端路径**: `c:\Users\J.s\WorkBuddy\20260323021915\blog-backend\`
**技术栈**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Node.js + Express + SQLite

### 项目概述
完整的个人博客系统，包含前端（React）和后端（Node.js + Express + SQLite）。支持文章管理、标签分类、搜索功能、Markdown 渲染等。

### 后端技术架构
- **Node.js + Express 4.18.2** - Web 服务器框架
- **better-sqlite3 9.2.2** - SQLite 数据库驱动
- **CORS** - 跨域资源共享
- **ES Modules** - 现代化模块系统

### 数据库设计
- **articles 表**：存储文章内容、元数据（标题、slug、内容、封面、作者、创建时间、阅读量等）
- **tags 表**：存储标签信息（名称、slug）
- **article_tags 表**：文章标签多对多关联
- 外键约束、索引优化

### API 端点
- `GET /api/articles` - 获取文章列表（支持 tag、search、limit、offset 参数）
- `GET /api/articles/:slug` - 获取单篇文章
- `POST /api/articles` - 创建文章
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 删除文章
- `GET /api/articles/stats/overview` - 获取统计信息
- `GET /api/tags` - 获取所有标签
- `GET /api/tags/:slug` - 获取单个标签
- `POST /api/tags` - 创建标签
- `DELETE /api/tags/:id` - 删除标签
- `GET /health` - 健康检查

### 前端技术架构
- **React 19.2.0** + **TypeScript 5.9.3**
- **Vite 7.2.4** - 构建工具
- **Tailwind CSS 3.4.19** + **shadcn/ui**（40+ 组件）
- **React Router 7.1.5** - 路由
- **React Markdown 9.0.1** + **remark-gfm** - Markdown 渲染

### 前端升级内容
1. **API 服务层**：新增 `src/services/api.ts`，统一管理所有 API 调用
2. **移除硬编码数据**：前端不再使用 `src/data/articles.ts` 中的静态数据
3. **类型定义更新**：匹配后端返回的数据格式（id 改为 number，新增 slug、tag_slugs 等字段）
4. **路由参数更新**：从 `id` 改为 `slug`
5. **加载状态和错误处理**：所有页面都添加了 loading 和 error 状态
6. **元数据显示**：显示创建时间、作者、阅读量等信息

### 项目结构
```
workbuddy/
├── blog/                    # 前端项目
│   ├── src/
│   │   ├── components/     # shadcn/ui 组件
│   │   ├── services/       # API 服务层（新增）
│   │   ├── types/          # 类型定义（已更新）
│   │   └── pages/          # 页面组件（已更新）
│   └── .env               # 环境变量（新增）
│
├── blog-backend/            # 后端项目（新建）
│   ├── config/
│   │   └── database.js     # 数据库配置
│   ├── routes/
│   │   ├── articles.js     # 文章 API 路由
│   │   └── tags.js         # 标签 API 路由
│   ├── scripts/
│   │   ├── initDb.js       # 数据库初始化
│   │   └── seedDb.js       # 填充示例数据
│   ├── database/           # SQLite 数据库文件
│   └── package.json
│
├── start.bat               # Windows 启动脚本
└── README-BACKEND.md       # 完整项目文档
```

### 快速启动
1. **一键启动**：运行 `start.bat`（Windows）
2. **手动启动**：
   - 后端：`cd blog-backend && npm install && npm run init-db && npm run seed-db && npm run dev`
   - 前端：`cd blog && npm install && npm run dev`
3. **访问**：
   - 前端：http://localhost:5173
   - 后端：http://localhost:3001

### 核心功能
- ✅ 文章列表和详情页
- ✅ 标签分类和筛选
- ✅ 搜索功能
- ✅ Markdown 渲染（支持代码高亮）
- ✅ 阅读量统计
- ✅ 响应式设计
- ✅ 暗黑模式
- ✅ 加载状态和错误处理

### 环境变量
**后端**（`blog-backend/.env`）：
```
PORT=3001
DATABASE_PATH=./database/blog.db
CORS_ORIGIN=http://localhost:5173
```

**前端**（`blog/.env`）：
```
VITE_API_BASE_URL=http://localhost:3001
```

### 数据管理
- **数据库位置**：`blog-backend/database/blog.db`
- **初始化**：运行 `npm run init-db`
- **填充示例数据**：运行 `npm run seed-db`（5 篇文章 + 7 个标签）
- **数据库工具**：可使用 DB Browser for SQLite 查看

### 设计特点
- RESTful API 设计
- 轻量级 SQLite 数据库（易部署、易备份）
- 类型安全的 TypeScript
- 统一的错误处理
- 加载状态管理
- 响应式设计（移动端友好）

### 文档
- `README-BACKEND.md` - 完整的项目文档，包含技术栈、API 文档、部署指南
- `blog-backend/README.md` - 后端 API 文档
- `blog/README.md` - 前端文档

### 使用说明
1. 安装 Node.js 20+
2. 运行 `start.bat` 或分别启动前后端
3. 访问 http://localhost:5173
4. 查看 README-BACKEND.md 了解详细使用方法

### 扩展功能建议
- 用户认证和授权
- 评论系统
- 图片上传功能
- SEO 优化
- RSS 订阅
- 文章草稿功能
- 管理后台
- 数据分析仪表板
