# Architecture

## 整体架构模式

**分层架构 + 模块化注册 + 门面模式 (Facade)**

```
┌─────────────────────────────────────────────────────┐
│                   传输层 (Transport)                  │
│   Stdio │ SSE │ StreamableHTTP                      │
├─────────────────────────────────────────────────────┤
│               MCP 服务层 (FeishuMcp)                  │
│   继承 McpServer，动态注册各模块的 MCP Tools          │
├─────────────────────────────────────────────────────┤
│             功能模块层 (Modules)                      │
│   document │ task │ calendar │ member                │
│   每个模块: tools/ → toolApi/ → services/            │
├─────────────────────────────────────────────────────┤
│           API 服务门面 (FeishuApiService)              │
│   Facade 单例，委托给各领域 Service                    │
├─────────────────────────────────────────────────────┤
│           基础服务层 (BaseApiService)                  │
│   HTTP 请求、认证 Token 管理、错误处理                 │
├─────────────────────────────────────────────────────┤
│             飞书 Open API                             │
└─────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 入口与服务器 (`src/index.ts` + `src/server.ts`)

- `src/index.ts`：启动入口，根据 `NODE_ENV` 选择 stdio 或 HTTP 模式
- `FeishuMcpServer`：服务器管理类，负责：
  - 创建 Express 应用并注册端点
  - 管理 SSE 连接（`SSEConnectionManager`）
  - 管理用户认证会话（`UserAuthManager`）
  - 用户请求上下文（`UserContextManager` - 基于 `AsyncLocalStorage`）
  - Token 自动刷新（`TokenRefreshManager`）

### 2. MCP 核心 (`src/mcp/feishuMcp.ts`)

- `FeishuMcp` 继承 `McpServer`
- 构造函数中初始化 `FeishuApiService` 单例
- 通过 `ModuleRegistry.getEnabledModules()` 按配置动态加载功能模块
- 根据 `authType`（tenant/user）过滤模块可用性

### 3. 模块系统 (`src/modules/`)

- `FeatureModule` 接口定义模块契约：`id`、`name`、`description`、`requiredScopes`、`registerTools()`
- `ModuleRegistry`：模块注册中心，支持按 ID 启用、隐式依赖解析、认证类型过滤
- 隐式依赖：`task` → `member`，`calendar` → `member`
- 仅 user 认证支持的模块：`task`、`calendar`、`member`

每个模块内部三层结构：
- `tools/` — MCP 工具定义（Schema + 调用入口）
- `toolApi/` — 工具 API 层（参数处理、格式化响应）
- `services/` — 领域服务（封装具体的飞书 API 调用）

### 4. API 服务层 (`src/services/`)

- `FeishuApiService`：门面单例，统一对外入口，持有 8 个领域服务实例
- `BaseApiService`：抽象基类，提供 `request()`、`get()`、`post()` 等 HTTP 方法，自动处理认证和 Token 刷新
- `AuthService`：认证服务，实现 Token 获取和刷新逻辑

### 5. 认证体系 (`src/utils/auth/`)

- `TokenCacheManager`：持久化 Token 缓存（文件存储），支持 tenant 和 user 两种 Token
- `TokenRefreshManager`：定时自动刷新即将过期的 Token
- `UserAuthManager`：维护 sessionId → userKey 映射
- `UserContextManager`：基于 `AsyncLocalStorage`，隔离并发请求的用户上下文
- `AuthUtils`：工具函数（clientKey 生成、state 编码等）

## 数据流

```
Client Request
  → Transport (Stdio/SSE/StreamableHTTP)
    → FeishuMcpServer (Express 中间件，注入 userContext)
      → FeishuMcp (McpServer 协议处理)
        → Module Tool Handler (tools/*.ts)
          → ToolApi (toolApi/*.ts) — 参数校验、格式化
            → Domain Service (services/*.ts) — 业务逻辑
              → BaseApiService.request() — 自动 Token 注入
                → Axios → 飞书 Open API
```

## 关键设计决策

| 决策 | 理由 |
|------|------|
| 模块化按需加载 | 减少 AI 上下文占用，最小化 API 权限申请 |
| Facade 模式 | 统一聚合 8 个领域服务，对外提供简洁 API |
| AsyncLocalStorage 上下文 | 支持多用户并发请求的上下文隔离 |
| Token 持久化缓存 | 减少 Token 请求频率，支持跨进程复用 |
| 三种传输方式并存 | 兼容不同 MCP 客户端（Claude Desktop stdio、Web 客户端 SSE/HTTP） |
