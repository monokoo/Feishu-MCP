# Structure

## 目录布局

```
Feishu-MCP/
├── src/                          # 源代码根目录
│   ├── index.ts                  # 应用入口：模式选择 (stdio/HTTP)
│   ├── cli.ts                    # CLI 入口
│   ├── server.ts                 # FeishuMcpServer：Express 服务器 + 传输管理
│   │
│   ├── mcp/
│   │   └── feishuMcp.ts          # FeishuMcp：McpServer 子类，动态注册模块工具
│   │
│   ├── modules/                  # 功能模块目录
│   │   ├── FeatureModule.ts      # 模块接口定义
│   │   ├── ModuleRegistry.ts     # 模块注册中心
│   │   ├── index.ts              # 模块导出入口
│   │   │
│   │   ├── document/             # 文档模块
│   │   │   ├── index.ts
│   │   │   ├── tools/            # MCP 工具注册
│   │   │   │   ├── documentTools.ts    # 文档 CRUD 工具
│   │   │   │   ├── blockTools.ts       # 块操作工具
│   │   │   │   ├── folderTools.ts      # 文件夹/知识空间工具
│   │   │   │   └── toolHelpers.ts      # 工具辅助函数
│   │   │   ├── toolApi/          # 工具 API 层
│   │   │   │   ├── documentToolApi.ts
│   │   │   │   ├── blockToolApi.ts
│   │   │   │   ├── folderToolApi.ts
│   │   │   │   └── index.ts
│   │   │   └── services/         # 领域服务
│   │   │       ├── FeishuDocumentService.ts
│   │   │       ├── FeishuBlockService.ts
│   │   │       ├── FeishuFoldService.ts
│   │   │       ├── FeishuSearchService.ts
│   │   │       ├── FeishuWhiteboardService.ts
│   │   │       └── blockFactory.ts
│   │   │
│   │   ├── task/                 # 任务模块（user 认证专用）
│   │   │   ├── index.ts
│   │   │   ├── tools/taskTools.ts
│   │   │   ├── toolApi/taskToolApi.ts
│   │   │   └── services/FeishuTaskService.ts
│   │   │
│   │   ├── calendar/             # 日历模块（user 认证专用）
│   │   │   ├── index.ts
│   │   │   ├── tools/calendarTools.ts
│   │   │   └── services/FeishuCalendarService.ts
│   │   │
│   │   └── member/               # 成员模块（隐式依赖）
│   │       ├── index.ts
│   │       ├── tools/memberTools.ts
│   │       ├── toolApi/memberToolApi.ts
│   │       └── services/FeishuMemberService.ts
│   │
│   ├── services/                 # 全局服务层
│   │   ├── baseService.ts        # BaseApiService 抽象基类
│   │   ├── feishuApiService.ts   # FeishuApiService 门面单例
│   │   ├── feishuAuthService.ts  # AuthService 认证服务
│   │   ├── callbackService.ts    # OAuth 回调处理
│   │   ├── constants/
│   │   │   └── feishuScopes.ts   # 权限范围常量
│   │   └── feishu/
│   │       ├── FeishuBaseApiService.ts   # 飞书 API 基类
│   │       └── FeishuScopeValidator.ts   # 权限校验器
│   │
│   ├── utils/                    # 工具层
│   │   ├── config.ts             # Config 单例（环境变量解析）
│   │   ├── logger.ts             # Logger（多级别日志，stdio 模式自动禁用）
│   │   ├── error.ts              # 错误格式化 + 自定义异常类
│   │   ├── document.ts           # 文档处理工具
│   │   ├── paramUtils.ts         # 参数解析工具
│   │   └── auth/                 # 认证工具集
│   │       ├── index.ts
│   │       ├── tokenCacheManager.ts     # Token 持久化缓存
│   │       ├── tokenRefreshManager.ts   # Token 自动刷新
│   │       ├── userAuthManager.ts       # 会话-用户映射
│   │       ├── userContextManager.ts    # AsyncLocalStorage 上下文
│   │       ├── authUtils.ts             # 认证工具函数
│   │       └── legacyCacheMigration.ts  # 旧缓存迁移
│   │
│   ├── cli/                      # CLI 子系统
│   │   ├── index.ts              # CLI 入口
│   │   ├── dispatcher.ts         # 命令分发器
│   │   └── commands/
│   │       ├── auth.ts           # 认证命令
│   │       ├── config.ts         # 配置命令
│   │       ├── guide.ts          # 引导命令
│   │       └── help.ts           # 帮助命令
│   │
│   ├── manager/
│   │   └── sseConnectionManager.ts  # SSE 连接管理
│   │
│   └── types/                    # 类型定义
│       ├── documentSchema.ts     # 文档相关 Zod Schema
│       ├── taskSchema.ts         # 任务相关 Zod Schema
│       └── memberSchema.ts       # 成员相关 Zod Schema
│
├── tool-schemas/                 # MCP 工具 JSON Schema（静态导出）
├── doc/                          # 文档目录
├── image/                        # 图片资源
├── dist/                         # 构建输出
├── .github/                      # GitHub 配置
├── Dockerfile                    # Docker 镜像定义
├── docker-compose.yaml           # Docker Compose 配置
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── .eslintrc                     # ESLint 配置
├── .prettierrc                   # Prettier 配置
└── .env.example                  # 环境变量模板
```

## 命名约定

| 位置 | 约定 | 示例 |
|------|------|------|
| 模块目录 | 小写单词 | `document/`、`task/`、`calendar/` |
| 服务类 | PascalCase + 前缀 `Feishu` | `FeishuDocumentService`、`FeishuTaskService` |
| 工具文件 | camelCase + 后缀 `Tools` | `documentTools.ts`、`blockTools.ts` |
| 工具 API 文件 | camelCase + 后缀 `ToolApi` | `documentToolApi.ts` |
| 工具类文件 | camelCase | `config.ts`、`logger.ts`、`error.ts` |
| 类型文件 | camelCase + 后缀 `Schema` | `documentSchema.ts`、`taskSchema.ts` |

## 关键位置

| 目的 | 文件路径 |
|------|---------|
| 添加新 MCP 工具 | `src/modules/{module}/tools/{module}Tools.ts` |
| 添加新模块 | `src/modules/{module}/index.ts` + 注册到 `ModuleRegistry.ts` |
| 配置新环境变量 | `src/utils/config.ts` |
| 添加新飞书 API 调用 | `src/modules/{module}/services/Feishu{Module}Service.ts` |
| 添加新 CLI 命令 | `src/cli/commands/{command}.ts` + 注册到 `dispatcher.ts` |
