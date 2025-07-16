# Apple Docs MCP

[![npm 版本](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp.svg)](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp)
[![许可证: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

强大的模型上下文协议 (MCP) 服务器，通过自然语言查询提供对 Apple 开发者文档的无缝访问。在您的 AI 开发环境中直接搜索、探索和获取有关 Apple 框架、API、示例代码等的详细信息。

[English](README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | **简体中文**

## ✨ 功能特性

- 🔍 **智能搜索**: 跨 Apple 开发者文档的智能搜索，具有增强的结果格式化
- 📚 **完整文档访问**: 完全访问 Apple JSON API 获取详细文档内容
- 🔧 **框架索引**: 所有 Apple 框架的分层 API 结构浏览
- 📋 **技术目录**: 按类别组织的所有 Apple 技术和框架列表
- 🔗 **相关 API 发现**: 通过智能推荐查找相关、类似和替代 API
- 📊 **平台兼容性**: 分析 Apple 生态系统中的平台支持和版本兼容性
- ⚡ **高性能**: 基于内存的缓存系统，按内容类型优化 TTL
- 🌐 **多平台**: 支持 iOS、macOS、watchOS、tvOS 和 visionOS 文档
- 🏷️ **Beta 和状态跟踪**: 识别 beta、已弃用和新 API，带有适当的状态指示器

## 🚀 快速开始

### Claude Desktop（推荐）

将此配置添加到您的 Claude Desktop 配置文件中：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "@kimsungwhee/apple-docs-mcp"]
    }
  }
}
```

> **注意**: 如果遇到使用旧版本的问题，添加 `@latest` 以强制使用最新版本：
> ```json
> "args": ["-y", "@kimsungwhee/apple-docs-mcp@latest"]
> ```

重启 Claude Desktop 并开始询问 Apple API！

## 📦 安装指南

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y @kimsungwhee/apple-docs-mcp@latest
```

[📖 Claude Code MCP 文档](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

**通过设置**: 设置 → Cursor 设置 → MCP → 添加新的全局 MCP 服务器

**通过配置文件**: 添加到 `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "@kimsungwhee/apple-docs-mcp"]
    }
  }
}
```

[📖 Cursor MCP 文档](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

添加到您的 VS Code MCP 配置：

```json
{
  "mcp": {
    "servers": {
      "apple-docs": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@kimsungwhee/apple-docs-mcp"]
      }
    }
  }
}
```

[📖 VS Code MCP 文档](https://code.visualstudio.com/docs/editor/mcp)

</details>

<details>
<summary><strong>🌊 Windsurf</strong></summary>

添加到您的 Windsurf MCP 配置：

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "@kimsungwhee/apple-docs-mcp"]
    }
  }
}
```

[📖 Windsurf MCP 文档](https://docs.codeium.com/windsurf/mcp)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

添加到您的 Zed `settings.json`:

```json
{
  "context_servers": {
    "Apple Docs": {
      "command": {
        "path": "npx",
        "args": ["-y", "@kimsungwhee/apple-docs-mcp"]
      },
      "settings": {}
    }
  }
}
```

[📖 Zed 上下文服务器文档](https://zed.dev/docs/context-servers)

</details>

<details>
<summary><strong>🔧 Cline</strong></summary>

**通过市场**:
1. 打开 Cline → 菜单 (☰) → MCP 服务器 → 市场
2. 搜索 "Apple Docs MCP" → 安装

**通过配置**: 添加到 `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "@kimsungwhee/apple-docs-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

</details>

<details>
<summary><strong>🪟 Windows</strong></summary>

对于 Windows 系统，使用：

```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@kimsungwhee/apple-docs-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

</details>

<details>
<summary><strong>⚙️ 高级安装</strong></summary>

**全局安装**:
```bash
# 使用 pnpm（推荐）
pnpm add -g @kimsungwhee/apple-docs-mcp

# 使用 npm
npm install -g @kimsungwhee/apple-docs-mcp
```

**直接使用**:
```bash
npx @kimsungwhee/apple-docs-mcp --help
```

**开发环境设置**:
```bash
git clone https://github.com/kimsungwhee/apple-docs-mcp.git
cd apple-docs-mcp

# 使用 pnpm（推荐）
pnpm install && pnpm run build

# 使用 npm
npm install && npm run build
```

</details>

## 💬 使用示例

### 🔍 智能搜索
```
"搜索 SwiftUI 动画"
"查找 withAnimation API 文档"
"查询 Swift 中的 async/await 模式"
"显示 AlarmKit 调度示例"
```

### 📚 文档访问
```
"获取 SwiftUI 框架的详细信息"
"显示 withAnimation API 及相关 API"
"获取 SwiftData 的平台兼容性"
"访问 UIViewController 文档及类似 API"
```

### 🔧 框架探索
```
"显示 SwiftUI 框架 API 索引"
"列出所有 UIKit 类和方法"
"浏览 ARKit 框架结构"
"获取 WeatherKit API 层次结构"
```

### 🔗 API 发现
```
"查找与 UIViewController 相关的 API"
"显示与 withAnimation 类似的 API"
"获取 SwiftData 文档中的所有引用"
"发现 Core Data NSManagedObject 的替代方案"
```

### 📋 技术和平台分析
```
"列出 iOS 18 中的所有 Beta 框架"
"显示图形和游戏技术"
"有哪些机器学习框架可用？"
"分析 Vision 框架的平台兼容性"
```

### 🛠️ 高级用法
```
"查找 @State 相关 API 及平台分析"
"解析 SwiftUI 文档中的所有引用"
"获取 Vision 框架的平台兼容性分析"
"深度搜索与 UIViewController 类似的 API"
```

## 🛠️ 可用工具

| 工具 | 描述 | 主要功能 |
|------|------|----------|
| `search_apple_docs` | 搜索 Apple 开发者文档 | 官方搜索 API，增强格式化，平台过滤 |
| `get_apple_doc_content` | 获取详细文档内容 | JSON API 访问，可选增强分析（相关/类似 API，平台兼容性） |
| `list_technologies` | 浏览所有 Apple 技术 | 类别过滤，语言支持，beta 状态 |
| `get_framework_index` | 框架 API 结构树 | 分层浏览，深度控制，类型过滤 |
| `get_related_apis` | 查找相关 API | 继承、遵循、“参见”关系 |
| `resolve_references_batch` | 批量解析 API 引用 | 从文档中提取和解析所有引用 |
| `get_platform_compatibility` | 平台兼容性分析 | 版本支持，beta 状态，弃用信息 |
| `find_similar_apis` | 发现类似 API | Apple 官方推荐，主题分组 |


## 🏗️ 技术架构

```
apple-docs-mcp/
├── 🔧 src/
│   ├── index.ts                      # MCP 服务器入口点，包含所有工具
│   ├── tools/                        # MCP 工具实现
│   │   ├── search-parser.ts          # HTML 搜索结果解析
│   │   ├── doc-fetcher.ts            # JSON API 文档获取
│   │   ├── list-technologies.ts      # 技术目录处理
│   │   ├── get-framework-index.ts    # 框架结构索引
│   │   ├── get-related-apis.ts       # 相关 API 发现
│   │   ├── resolve-references-batch.ts # 批量引用解析
│   │   ├── get-platform-compatibility.ts # 平台分析
│   │   └── find-similar-apis.ts      # 类似 API 推荐
│   └── utils/                        # 工具函数和辅助程序
│       ├── cache.ts                  # 带 TTL 支持的内存缓存
│       ├── constants.ts              # 应用程序常量和 URL
│       ├── error-handler.ts          # 错误处理和验证
│       ├── http-client.ts            # 带性能跟踪的 HTTP 客户端
│       └── url-converter.ts          # URL 转换工具
├── 📦 dist/                          # 编译后的 JavaScript
├── 📄 package.json                   # 包配置
└── 📖 README.md                      # 此文件
```

### 🚀 性能特性

- **基于内存的缓存**: 自定义缓存实现，具有自动清理和 TTL 支持
- **智能搜索**: 官方 Apple 搜索 API，具有增强的结果格式化
- **增强分析**: 可选的相关 API、平台兼容性和相似性分析
- **错误恢复**: 优雅降级，全面的错误处理
- **类型安全**: 完整的 TypeScript，使用 Zod v4.0.5 进行运行时验证
- **最新依赖**: MCP SDK v1.15.1，优化的包占用空间

### 💾 缓存策略

| 内容类型 | 缓存时长 | 缓存大小 | 原因 |
|----------|----------|----------|------|
| API 文档 | 30 分钟 | 500 项 | 频繁访问，适度更新 |
| 搜索结果 | 10 分钟 | 200 项 | 动态内容，用户特定 |
| 框架索引 | 1 小时 | 100 项 | 稳定结构，变化较少 |
| 技术列表 | 2 小时 | 50 项 | 很少变化，内容较大 |

## 🧪 开发

### 常用命令

```bash
# 开发模式（自动重载）
pnpm run dev    # 或: npm run dev

# 生产构建
pnpm run build  # 或: npm run build

# 类型检查
pnpm exec tsc --noEmit  # 或: npx tsc --noEmit

# 清理构建产物
pnpm run clean  # 或: npm run clean
```

### 本地测试

```bash
# 直接测试 MCP 服务器
node dist/index.js

# 使用示例查询测试
npx @kimsungwhee/apple-docs-mcp --test
```

## 🤝 贡献

欢迎贡献！以下是开始的方法：

1. **Fork** 仓库
2. **创建** 功能分支: `git checkout -b feature/amazing-feature`
3. **提交** 更改: `git commit -m 'Add amazing feature'`
4. **推送** 到分支: `git push origin feature/amazing-feature`
5. **打开** Pull Request

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

## ⚠️ 免责声明

此项目与 Apple Inc. 无关联或认可。它使用公开可用的 Apple 开发者文档 API 用于教育和开发目的。

---

<div align="center">

**为 Apple 开发者社区用 ❤️ 制作**

[报告问题](https://github.com/kimsungwhee/apple-docs-mcp/issues) • [请求功能](https://github.com/kimsungwhee/apple-docs-mcp/issues/new) • [文档](https://github.com/kimsungwhee/apple-docs-mcp)

</div>