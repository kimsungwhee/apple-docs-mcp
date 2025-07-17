[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/kimsungwhee-apple-docs-mcp-badge.png)](https://mseep.ai/app/kimsungwhee-apple-docs-mcp)

# Apple Docs MCP

[![npm version](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp.svg)](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Model Context Protocol (MCP) server that provides seamless access to Apple Developer Documentation through natural language queries. Search, explore, and get detailed information about Apple frameworks, APIs, sample code, and more directly in your AI-powered development environment.

**English** | [日本語](README.ja.md) | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

## ✨ Features

- 🔍 **Smart Search**: Intelligent search across Apple Developer Documentation with enhanced result formatting
- 📚 **Complete Documentation Access**: Full access to Apple's JSON API for detailed documentation content
- 🔧 **Framework Index**: Hierarchical API structure browsing for all Apple frameworks
- 📋 **Technology Catalog**: Organized listing of all Apple technologies and frameworks by category
- 🔗 **Related APIs Discovery**: Find related, similar, and alternative APIs with intelligent recommendations
- 📊 **Platform Compatibility**: Analyze platform support and version compatibility across Apple's ecosystem
- ⚡ **High Performance**: Memory-based caching system with optimized TTL per content type
- 🌐 **Multi-Platform**: Support for iOS, macOS, watchOS, tvOS, and visionOS documentation
- 🏷️ **Beta & Status Tracking**: Identify beta, deprecated, and new APIs with proper status indicators

## 🚀 Quick Start

### Claude Desktop (Recommended)

Add this to your Claude Desktop configuration:

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

> **Note**: If you encounter issues with an old version being used, add `@latest` to force the latest version:
> ```json
> "args": ["-y", "@kimsungwhee/apple-docs-mcp@latest"]
> ```

Restart Claude Desktop and start asking about Apple APIs!

## 📦 Installation

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y @kimsungwhee/apple-docs-mcp@latest
```

[📖 Claude Code MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

**Via Settings**: Settings → Cursor Settings → MCP → Add new global MCP server

**Via Config File**: Add to `~/.cursor/mcp.json`:

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

[📖 Cursor MCP docs](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

Add to your VS Code MCP config:

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

[📖 VS Code MCP docs](https://code.visualstudio.com/docs/editor/mcp)

</details>

<details>
<summary><strong>🌊 Windsurf</strong></summary>

Add to your Windsurf MCP config:

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

[📖 Windsurf MCP docs](https://docs.codeium.com/windsurf/mcp)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

Add to your Zed `settings.json`:

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

[📖 Zed Context Server docs](https://zed.dev/docs/context-servers)

</details>

<details>
<summary><strong>🔧 Cline</strong></summary>

**Via Marketplace**:
1. Open Cline → Menu (☰) → MCP Servers → Marketplace
2. Search "Apple Docs MCP" → Install

**Via Config**: Add to `cline_mcp_settings.json`:

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

For Windows systems, use:

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
<summary><strong>⚙️ Advanced Installation</strong></summary>

**Global Installation**:
```bash
# Using pnpm (recommended)
pnpm add -g @kimsungwhee/apple-docs-mcp

# Using npm
npm install -g @kimsungwhee/apple-docs-mcp
```

**Direct Usage**:
```bash
npx @kimsungwhee/apple-docs-mcp --help
```

**Development Setup**:
```bash
git clone https://github.com/kimsungwhee/apple-docs-mcp.git
cd apple-docs-mcp

# Using pnpm (recommended)
pnpm install && pnpm run build

# Using npm
npm install && npm run build
```

</details>

## 💬 Usage Examples

### 🔍 Smart Search
```
"Search for SwiftUI animations"
"Find withAnimation API documentation"
"Look up async/await patterns in Swift"
"Show me AlarmKit scheduling examples"
```

### 📚 Documentation Access
```
"Get detailed information about the SwiftUI framework"
"Show me withAnimation API with related APIs"
"Get platform compatibility for SwiftData"
"Access UIViewController documentation with similar APIs"
```

### 🔧 Framework Exploration
```
"Show me SwiftUI framework API index"
"List all UIKit classes and methods"
"Browse ARKit framework structure"
"Get WeatherKit API hierarchy"
```

### 🔗 API Discovery
```
"Find APIs related to UIViewController"
"Show me similar APIs to withAnimation"
"Get all references from SwiftData documentation"
"Discover alternatives to Core Data NSManagedObject"
```

### 📋 Technology & Platform Analysis
```
"List all Beta frameworks in iOS 18"
"Show me Graphics & Games technologies"
"What machine learning frameworks are available?"
"Analyze platform compatibility for Vision framework"
```

### 🛠️ Advanced Usage
```
"Find related APIs for @State with platform analysis"
"Resolve all references from SwiftUI documentation"
"Get platform compatibility analysis for Vision framework"
"Find similar APIs to UIViewController with deep search"
```

## 🛠️ Available Tools

| Tool | Description | Key Features |
|------|-------------|--------------|
| `search_apple_docs` | Search Apple Developer Documentation | Official search API, enhanced formatting, platform filtering |
| `get_apple_doc_content` | Get detailed documentation content | JSON API access, optional enhanced analysis (related/similar APIs, platform compatibility) |
| `list_technologies` | Browse all Apple technologies | Category filtering, language support, beta status |
| `get_framework_index` | Framework API structure tree | Hierarchical browsing, depth control, type filtering |
| `get_related_apis` | Find related APIs | Inheritance, conformance, "See Also" relationships |
| `resolve_references_batch` | Batch resolve API references | Extract and resolve all references from documentation |
| `get_platform_compatibility` | Platform compatibility analysis | Version support, beta status, deprecation info |
| `find_similar_apis` | Discover similar APIs | Apple's official recommendations, topic groupings |

## 🏗️ Technical Architecture

```
apple-docs-mcp/
├── 🔧 src/
│   ├── index.ts                      # MCP server entry point with all tools
│   ├── tools/                        # MCP tool implementations
│   │   ├── search-parser.ts          # HTML search result parsing
│   │   ├── doc-fetcher.ts            # JSON API documentation fetching
│   │   ├── list-technologies.ts      # Technology catalog handling
│   │   ├── get-framework-index.ts    # Framework structure indexing
│   │   ├── get-related-apis.ts       # Related API discovery
│   │   ├── resolve-references-batch.ts # Batch reference resolution
│   │   ├── get-platform-compatibility.ts # Platform analysis
│   │   └── find-similar-apis.ts      # Similar API recommendations
│   └── utils/                        # Utility functions and helpers
│       ├── cache.ts                  # Memory cache with TTL support
│       ├── constants.ts              # Application constants and URLs
│       ├── error-handler.ts          # Error handling and validation
│       ├── http-client.ts            # HTTP client with performance tracking
│       └── url-converter.ts          # URL conversion utilities
├── 📦 dist/                          # Compiled JavaScript
├── 📄 package.json                   # Package configuration
└── 📖 README.md                      # This file
```

### 🚀 Performance Features

- **Memory-Based Caching**: Custom cache implementation with automatic cleanup and TTL support
- **Smart Search**: Official Apple search API with enhanced result formatting
- **Enhanced Analysis**: Optional related APIs, platform compatibility, and similarity analysis
- **Error Resilience**: Graceful degradation with comprehensive error handling
- **Type Safety**: Full TypeScript with Zod v4.0.5 runtime validation
- **Latest Dependencies**: MCP SDK v1.15.1, optimized package footprint

### 💾 Caching Strategy

| Content Type | Cache Duration | Cache Size | Reason |
|--------------|----------------|------------|--------|
| API Documentation | 30 minutes | 500 entries | Frequently accessed, moderate updates |
| Search Results | 10 minutes | 200 entries | Dynamic content, user-specific |
| Framework Indexes | 1 hour | 100 entries | Stable structure, less frequent changes |
| Technologies List | 2 hours | 50 entries | Rarely changes, large content |

## 🧪 Development

### Quick Commands

```bash
# Development with auto-reload
pnpm run dev    # or: npm run dev

# Build for production  
pnpm run build  # or: npm run build

# Type checking
pnpm exec tsc --noEmit  # or: npx tsc --noEmit

# Clean build artifacts
pnpm run clean  # or: npm run clean
```

### Testing Locally

```bash
# Test the MCP server directly
node dist/index.js

# Test with sample queries
npx @kimsungwhee/apple-docs-mcp --test
```

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

This project is not affiliated with or endorsed by Apple Inc. It uses publicly available Apple Developer Documentation APIs for educational and development purposes.

---

<div align="center">

**Made with ❤️ for the Apple Developer Community**

[Report Issues](https://github.com/kimsungwhee/apple-docs-mcp/issues) • [Request Features](https://github.com/kimsungwhee/apple-docs-mcp/issues/new) • [Documentation](https://github.com/kimsungwhee/apple-docs-mcp)

</div>