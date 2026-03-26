# Stack

## 语言与运行时

| 项目 | 版本 | 说明 |
|------|------|------|
| TypeScript | ^5.7.3 | 严格模式开启（`strict: true`），ES2020 target，ESNext 模块 |
| Node.js | ^20.17.0 | 通过 `.nvmrc` 和 `engines` 锁定 |
| ES Modules | - | `"type": "module"`，全项目使用 ESM |

## 核心框架与依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@modelcontextprotocol/sdk` | ^1.17.5 | MCP 协议核心 SDK，提供 McpServer、StdioServerTransport、SSEServerTransport、StreamableHTTPServerTransport |
| `express` | ^4.21.2 | HTTP 服务器，承载 SSE/StreamableHTTP/Callback 端点 |
| `axios` | ^1.7.9 | HTTP 客户端，用于调用飞书 Open API |
| `zod` | ^3.24.2 | 运行时参数校验，所有 MCP 工具入参均通过 Zod Schema 验证 |
| `dotenv` | ^16.4.7 | 环境变量加载 |
| `form-data` | ^4.0.3 | multipart 文件上传（图片素材） |
| `remeda` | ^2.20.1 | 函数式工具库 |
| `yargs` | ^17.7.2 | CLI 命令行解析 |
| `cross-env` | ^7.0.3 | 跨平台环境变量设置 |

## 开发工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| `tsx` | ^4.19.2 | 开发时 TypeScript 直接执行（watch 模式） |
| `tsc-alias` | ^1.8.10 | 构建后路径别名解析 |
| `eslint` | ^9.20.1 | 代码检查，搭配 `@typescript-eslint` 插件 |
| `prettier` | ^3.5.0 | 代码格式化 |
| `jest` | ^29.7.0 | 测试框架（已配置但无测试文件） |
| `ts-jest` | ^29.2.5 | Jest TypeScript 支持 |

## 构建与运行

- **构建**：`tsc && tsc-alias` → 输出到 `dist/`
- **开发服务器**：`cross-env NODE_ENV=development tsx watch src/index.ts`
- **生产启动**：`node dist/index.js`（HTTP 模式）或 `cross-env NODE_ENV=cli node dist/index.js`（stdio 模式）
- **CLI 入口**：`dist/cli.js` → 注册命令 `feishu-mcp`、`feishu-mcp-tool`、`feishu-tool`

## 包管理

- 使用 **pnpm** 管理依赖（`pnpm-lock.yaml` 存在）
- 自引用 override：`"feishu-mcp": "link:"` 支持本地开发

## 部署

- Docker 支持：`Dockerfile` + `docker-compose.yaml`
- 基础镜像：`node:20.17.0`
- 暴露端口：3333
- npm 发布：`pnpm build && npm publish`（含 `--tag test` 测试发布）

## 配置管理

通过 `.env` 文件和环境变量配置，核心配置项见 `src/utils/config.ts`（Config 单例）。
