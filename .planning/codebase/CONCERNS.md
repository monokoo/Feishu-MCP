# Concerns

## 1. 无测试覆盖 🔴

**严重程度：高**

项目当前零测试文件。对于一个与飞书 Open API 深度集成的 MCP 服务器来说，缺乏测试意味着：
- 重构风险高
- API 变更无法自动检测
- 认证流程的边界情况无法验证

**建议**：优先为核心逻辑（ModuleRegistry、错误处理、Token 管理）建立单元测试基线。

## 2. Token 缓存系统复杂度 ⚠️

**严重程度：中**

`src/utils/auth/tokenCacheManager.ts`（`20,887 字节`）是项目中最大的单文件，负责：
- 文件系统持久化
- Tenant 和 User 两种 Token 的缓存/刷新/过期检查
- 并发安全
- 旧缓存格式迁移（`legacyCacheMigration.ts`）

**风险**：
- 文件写入竞态条件（多 stdio 进程共享同一个缓存文件）
- Token 刷新失败的降级路径可能不够健壮
- 缺少加密存储（敏感 Token 以明文持久化）

## 3. 日历模块未完成 ⚠️

**严重程度：中**

`src/modules/calendar/tools/calendarTools.ts` 中存在：
```
// TODO: 注册日历 MCP 工具
```

说明日历模块的 MCP 工具注册尚未实现，但模块已在 `ModuleRegistry` 中注册。

## 4. FeishuApiService 门面膨胀 ⚠️

**严重程度：低-中**

`feishuApiService.ts`（450 行）作为门面类，委托了 8 个领域服务的所有公共方法。随着功能增加，这个文件会持续膨胀。但因为每个方法都是纯委托（一行代码），实际维护成本可控。

## 5. 错误消息中的硬编码中文 ℹ️

**严重程度：低**

`baseService.ts`、`error.ts`、`feishuMcp.ts` 等文件中的错误消息和日志大量使用硬编码中文。如果未来需要国际化支持，需要提取为常量或使用 i18n 方案。

## 6. stdio 模式端口占用 ℹ️

**严重程度：低**

stdio 模式下仍会启动一个 HTTP 服务器（用于 OAuth callback）。当多个 stdio 进程同时运行时，端口占用被静默忽略（`EADDRINUSE` → `resolve()`），这是有意设计但可能导致难以排查的问题。

## 7. 无类型导出汇总 ℹ️

**严重程度：低**

项目没有顶层的 `index.ts` 导出汇总（`src/index.ts` 是启动入口而非导出入口）。作为 npm 包发布时，外部消费者需要直接引用内部路径。
