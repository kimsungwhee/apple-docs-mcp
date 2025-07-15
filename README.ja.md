# Apple Docs MCP

[![npm バージョン](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp.svg)](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp)
[![ライセンス: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

自然言語クエリを通じて Apple 開発者ドキュメントへのシームレスなアクセスを提供する強力なモデルコンテキストプロトコル（MCP）サーバー。AI を活用した開発環境で、Apple フレームワーク、API、サンプルコードなどを直接検索、探索、詳細情報を取得できます。

[English](README.md) | **日本語** | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

## ✨ 機能

- 🔍 **スマート検索**: 90+ の Apple フレームワークを横断する最適化された結果ランキングによるインテリジェント検索
- 📚 **フレームワーク エクスプローラー**: プラットフォームサポートと API カテゴリを含む包括的なフレームワーク情報
- 🔧 **シンボル詳細**: メソッドシグネチャ、パラメータ、例を含む詳細な API ドキュメント
- 📋 **テクノロジー ブラウザ**: すべての Apple テクノロジーとフレームワークのカテゴリ別整理されたカタログ
- 💡 **サンプルコード アクセス**: Apple 公式サンプルコードとチュートリアルへの直接アクセス
- ⚡ **高性能**: LRU 戦略によるインテリジェントキャッシュで高速レスポンス
- 🌐 **マルチプラットフォーム**: iOS、macOS、watchOS、tvOS、visionOS ドキュメントをサポート

## 🚀 クイックスタート

### Claude Desktop（推奨）

Claude Desktop 設定ファイルに以下を追加してください：

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

> **注意**: 古いバージョンが使用される問題が発生した場合、`@latest` を追加して最新バージョンを強制します：
> ```json
> "args": ["-y", "@kimsungwhee/apple-docs-mcp@latest"]
> ```

Claude Desktop を再起動して Apple API について質問を始めましょう！

## 📦 インストール

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y @kimsungwhee/apple-docs-mcp@latest
```

[📖 Claude Code MCP ドキュメント](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

**設定経由**: 設定 → Cursor 設定 → MCP → 新しいグローバル MCP サーバーを追加

**設定ファイル経由**: `~/.cursor/mcp.json` に追加:

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

[📖 Cursor MCP ドキュメント](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

VS Code MCP 設定に追加:

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

[📖 VS Code MCP ドキュメント](https://code.visualstudio.com/docs/editor/mcp)

</details>

<details>
<summary><strong>🌊 Windsurf</strong></summary>

Windsurf MCP 設定に追加:

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

[📖 Windsurf MCP ドキュメント](https://docs.codeium.com/windsurf/mcp)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

Zed の `settings.json` に追加:

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

[📖 Zed コンテキストサーバー ドキュメント](https://zed.dev/docs/context-servers)

</details>

<details>
<summary><strong>🔧 Cline</strong></summary>

**マーケットプレイス経由**:
1. Cline を開く → メニュー (☰) → MCP サーバー → マーケットプレイス
2. "Apple Docs MCP" を検索 → インストール

**設定経由**: `cline_mcp_settings.json` に追加:

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

Windows システムの場合:

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
<summary><strong>⚙️ 高度なインストール</strong></summary>

**グローバルインストール**:
```bash
# pnpm を使用（推奨）
pnpm add -g @kimsungwhee/apple-docs-mcp

# npm を使用
npm install -g @kimsungwhee/apple-docs-mcp
```

**直接使用**:
```bash
npx @kimsungwhee/apple-docs-mcp --help
```

**開発環境セットアップ**:
```bash
git clone https://github.com/kimsungwhee/apple-docs-mcp.git
cd apple-docs-mcp

# pnpm を使用（推奨）
pnpm install && pnpm run build

# npm を使用
npm install && npm run build
```

</details>

## 💬 使用例

### 🔍 スマート検索
```
"SwiftUI アニメーションを検索"
"CoreML モデル読み込み方法を見つける"
"Swift の async/await パターンを調べる"
"AlarmKit スケジューリング例を表示"
```

### 📚 フレームワーク深掘り
```
"SwiftUI フレームワークの詳細情報を取得"
"iOS 18 フレームワークの新機能は？"
"Vision フレームワークの機能について教えて"
"すべての WeatherKit API を表示"
```

### 🔧 API 探索
```
"UIViewController ライフサイクルメソッドを表示"
"SwiftData モデル作成の詳細を取得"
"AlarmAttributes のプロパティは何？"
"すべての ARKit アンカータイプをリスト"
```

### 💡 サンプルコードとチュートリアル
```
"アラームスケジューリングのサンプルコードを見つける"
"SwiftUI チュートリアル例を表示"
"カメラキャプチャのサンプルコードを取得"
"Core Data マイグレーション例を見つける"
```

### 📋 テクノロジー発見
```
"iOS 18 のすべてのベータフレームワークをリスト"
"グラフィックス & ゲームテクノロジーを表示"
"どの機械学習フレームワークが利用可能？"
"すべての watchOS フレームワークを閲覧"
```

## 🛠️ 利用可能なツール

| ツール | 説明 | 主要機能 |
|-------|------|----------|
| `search_documentation` | Apple ドキュメントのスマート検索 | 90+ フレームワーク、インテリジェントランキング、ベータサポート |
| `get_framework_info` | 詳細なフレームワーク情報 | プラットフォームサポート、API カテゴリ、バージョン情報 |
| `get_symbol_details` | 包括的な API ドキュメント | メソッドシグネチャ、パラメータ、例 |
| `get_sample_code` | サンプルコードとチュートリアルへのアクセス | Apple 公式例、ステップバイステップガイド |
| `list_technologies` | テクノロジーカタログの閲覧 | カテゴリ別整理、プラットフォームフィルタリング |

## 🏗️ 技術アーキテクチャ

```
apple-docs-mcp/
├── 🔧 src/
│   ├── index.ts          # MCP サーバーエントリーポイント
│   ├── api/              # Apple API クライアントとキャッシュ
│   ├── tools/            # MCP ツール実装
│   ├── types/            # TypeScript 定義
│   └── utils/            # フォーマッター、パーサー、ユーティリティ
├── 📦 dist/              # コンパイル済み JavaScript
├── 📄 package.json       # パッケージ設定
└── 📖 README.md          # このファイル
```

### 🚀 パフォーマンス機能

- **インテリジェントキャッシュ**: コンテンツタイプごとに最適化された TTL を持つ LRU キャッシュ
- **スマート検索**: 結果ランキングを持つ優先フレームワーク検索
- **エラー回復力**: リトライロジックによる優雅な劣化
- **型安全性**: Zod を使用したランタイム検証による完全な TypeScript

### 💾 キャッシュ戦略

| コンテンツタイプ | キャッシュ期間 | 理由 |
|------------------|----------------|------|
| テクノロジー | 24時間 | 滅多に変更されない |
| フレームワーク | 1時間 | 安定したコンテンツ |
| シンボル | 30分 | 頻繁にアクセスされる |
| サンプルコード | 2時間 | 適度な更新 |

## 🧪 開発

### クイックコマンド

```bash
# 自動リロード付き開発
pnpm run dev    # または: npm run dev

# プロダクションビルド
pnpm run build  # または: npm run build

# 型チェック
pnpm exec tsc --noEmit  # または: npx tsc --noEmit

# ビルド成果物のクリーン
pnpm run clean  # または: npm run clean
```

### ローカルテスト

```bash
# MCP サーバーを直接テスト
node dist/index.js

# サンプルクエリでテスト
npx @kimsungwhee/apple-docs-mcp --test
```

## 🤝 コントリビューション

コントリビューション歓迎！始め方：

1. リポジトリを **Fork**
2. 機能ブランチを **作成**: `git checkout -b feature/amazing-feature`
3. 変更を **コミット**: `git commit -m 'Add amazing feature'`
4. ブランチに **プッシュ**: `git push origin feature/amazing-feature`
5. Pull Request を **開く**

## 📄 ライセンス

MIT ライセンス - 詳細は [LICENSE](LICENSE) をご覧ください。

## ⚠️ 免責事項

このプロジェクトは Apple Inc. と提携または承認されていません。教育および開発目的で公開されている Apple 開発者ドキュメント API を使用しています。

---

<div align="center">

**Apple 開発者コミュニティのために ❤️ で作成**

[問題を報告](https://github.com/kimsungwhee/apple-docs-mcp/issues) • [機能リクエスト](https://github.com/kimsungwhee/apple-docs-mcp/issues/new) • [ドキュメント](https://github.com/kimsungwhee/apple-docs-mcp)

</div>