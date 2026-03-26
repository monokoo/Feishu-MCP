# Testing

## 当前状态

项目已配置 Jest 和 ts-jest，但 **未发现任何测试文件**。

### 测试框架配置

| 工具 | 版本 | 说明 |
|------|------|------|
| `jest` | ^29.7.0 | devDependency，已安装 |
| `ts-jest` | ^29.2.5 | TypeScript 支持 |
| `@types/jest` | ^29.5.11 | 类型定义 |

### 缺失项

- 无 `jest.config.ts` 或 `jest.config.js`
- 无 `__tests__/` 目录或 `*.test.ts` / `*.spec.ts` 文件
- 无 CI 测试运行配置（`.github/workflows/` 中未见测试 job）
- `package.json` 中无 `test` script

### 可测试性评估

| 组件 | 可测试性 | 备注 |
|------|---------|------|
| 模块注册逻辑 | ✅ 高 | `ModuleRegistry` 纯逻辑，易于单元测试 |
| 错误格式化 | ✅ 高 | `formatErrorMessage()` 纯函数 |
| 参数工具 | ✅ 高 | `paramUtils` 纯辅助函数 |
| Block 工厂 | ✅ 高 | `BlockFactory` 纯数据构造 |
| API 服务 | ⚠️ 中 | 依赖飞书 API，需要 mock `axios` |
| 认证流程 | ⚠️ 中 | 涉及 Token 缓存文件系统 I/O |
| MCP 工具 | ⚠️ 中 | 依赖 MCP SDK 的 Server 生命周期 |
| Express 端点 | 🔴 低 | 需要集成测试环境 |

### 建议的测试策略

1. **优先**：为 `ModuleRegistry`、`formatErrorMessage`、`paramUtils` 添加单元测试
2. **其次**：为各模块的 `toolApi/` 层添加单元测试（mock 服务层）
3. **最后**：为 API 服务层添加集成测试（mock axios）
