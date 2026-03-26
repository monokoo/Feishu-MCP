# Integrations

## 飞书 Open API（核心集成）

所有外部 API 调用均通过 `src/services/baseService.ts` 的 `BaseApiService` 抽象类发起。

### 基础 URL

```
https://open.feishu.cn/open-apis
```

可通过 `FEISHU_BASE_URL` 环境变量覆盖。

### 认证方式

| 类型 | 说明 | Token 获取 |
|------|------|-----------|
| `tenant` | 应用级认证（默认） | `app_access_token` → `tenant_access_token` |
| `user` | 用户级 OAuth 认证 | OAuth 授权码流程 → `user_access_token` + `refresh_token` |

认证逻辑集中在：
- `src/services/feishuAuthService.ts` — AuthService，负责获取/刷新 Token
- `src/utils/auth/tokenCacheManager.ts` — 持久化 Token 缓存（文件存储）
- `src/utils/auth/tokenRefreshManager.ts` — 自动刷新定时器
- `src/utils/auth/userAuthManager.ts` — 会话到用户的映射管理
- `src/utils/auth/userContextManager.ts` — AsyncLocalStorage 用户上下文

### 权限范围（Scopes）

权限声明和校验通过：
- `src/services/constants/feishuScopes.ts` — 各模块所需 Scope 常量
- `src/services/feishu/FeishuScopeValidator.ts` — 运行时权限验证
- 每个 `FeatureModule` 接口声明 `requiredScopes`（`tenant` + `userOnly`）

### 集成的 API 域

| 模块 | 飞书 API 域 | 对应服务 |
|------|------------|---------|
| document | 云文档、块操作、图片上传、搜索、知识空间、画板 | `FeishuDocumentService`、`FeishuBlockService`、`FeishuFoldService`、`FeishuSearchService`、`FeishuWhiteboardService` |
| task | 任务 CRUD、成员管理、提醒 | `FeishuTaskService` |
| calendar | 日历事件 | `FeishuCalendarService` |
| member | 通讯录搜索、批量查询 | `FeishuMemberService` |

### OAuth 回调

- `GET /callback` — 用户授权回调端点
- 实现：`src/services/callbackService.ts`
- stdio 模式下也启动最小化 HTTP 服务器以提供此端点

## MCP 客户端集成

作为 MCP 服务器，支持三种传输协议：

| 传输方式 | 端点 | 说明 |
|---------|------|------|
| Stdio | 标准输入输出 | CLI 模式，通过 `--stdio` 或 `NODE_ENV=cli` 触发 |
| SSE | `GET /sse` + `POST /messages` | 传统 SSE 长连接 |
| StreamableHTTP | `POST /mcp` | 新版 MCP 协议，基于 session 的 HTTP 流 |

## 外部工具

- **MCP Inspector**：`pnpx @modelcontextprotocol/inspector`，用于调试 MCP 工具定义
