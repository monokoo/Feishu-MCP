# Conventions

## 代码风格

- **严格 TypeScript**：`strict: true`，`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch` 均开启
- **ESM 模块**：所有导入使用 `.js` 后缀（TypeScript ESM 约定）
- **格式化**：Prettier 统一格式（见 `.prettierrc`）

## 类命名约定

| 类型 | 命名模式 | 示例 |
|------|---------|------|
| 领域服务 | `Feishu{Domain}Service` | `FeishuDocumentService`、`FeishuTaskService` |
| 基础服务 | `{Name}Service` | `AuthService`、`BaseApiService` |
| 管理器 | `{Name}Manager` | `TokenCacheManager`、`SSEConnectionManager` |
| MCP 服务器 | `FeishuMcp` | 继承 `McpServer` |
| 外部包装 | `FeishuMcpServer` | Express 服务器管理 |
| 接口 | `{Name}` | `FeatureModule`、`ApiResponse` |

## 设计模式

### 单例模式
广泛使用，典型实现方式：

```typescript
class Foo {
  private static instance: Foo;
  static getInstance(): Foo {
    if (!Foo.instance) Foo.instance = new Foo();
    return Foo.instance;
  }
}
```

使用方：`Config`、`FeishuApiService`、`TokenCacheManager`、`UserAuthManager`、`UserContextManager`、`TokenRefreshManager`

### 模块注册模式
`FeatureModule` 接口 + `ModuleRegistry` 静态注册中心：
- 模块自声明 `id`、`requiredScopes`、`registerTools()`
- `ModuleRegistry` 负责按配置过滤、解析隐式依赖

### 门面模式 (Facade)
`FeishuApiService` 聚合 8 个领域服务，对外统一暴露方法。

### 抽象基类
`BaseApiService` 提供通用 HTTP 请求处理，子服务继承并实现 `getBaseUrl()` 和 `getAccessToken()`。

## 错误处理

- 自定义异常类：`AuthRequiredError`、`ScopeInsufficientError`
- 统一错误格式化：`formatErrorMessage()` 函数
- 飞书 API 错误码映射：`errorGuides` 对象提供排查建议
- `BaseApiService.handleApiError()` 将 Axios 错误转为标准 `ApiError` 结构

## 日志规范

- `Logger` 工具类，支持多级别（DEBUG、INFO、LOG、WARN、ERROR）
- stdio 模式下自动禁用控制台输出（避免污染 MCP 协议）
- 支持时间戳格式自定义

## 参数校验

- MCP 工具入参通过 **Zod Schema** 校验（定义在 `src/types/` 下的 `*Schema.ts`）
- `src/utils/paramUtils.ts` 提供通用参数解析辅助
