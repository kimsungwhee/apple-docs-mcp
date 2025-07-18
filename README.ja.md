# Apple Docs MCP - Apple 開発者ドキュメント モデルコンテキストプロトコルサーバー

[![npm バージョン](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp.svg)](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp)
[![ライセンス: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Apple 開発者ドキュメント MCP サーバー - モデルコンテキストプロトコルで Apple 公式開発者ドキュメント、フレームワーク、API、SwiftUI、UIKit、WWDC ビデオにアクセス。AI 自然言語クエリで iOS、macOS、watchOS、tvOS、visionOS ドキュメントを検索。Claude、Cursor、または MCP 対応 AI アシスタントで Swift/Objective-C コード例、API リファレンス、技術ガイドを即座に取得。

[English](README.md) | **日本語** | [한국어](README.ko.md) | [简体中文](README.zh-CN.md)

## ✨ 機能

- 🔍 **スマート検索**: SwiftUI、UIKit、Foundation、CoreData、ARKit などの Apple 開発者ドキュメントのインテリジェント検索
- 📚 **完全なドキュメントアクセス**: Swift、Objective-C、フレームワークドキュメントのための Apple JSON API への完全アクセス
- 🔧 **フレームワークインデックス**: iOS、macOS、watchOS、tvOS、visionOS フレームワークの階層 API 構造を閲覧
- 📋 **テクノロジーカタログ**: SwiftUI、UIKit、Metal、Core ML、Vision、ARKit を含む Apple テクノロジーを探索
- 📰 **ドキュメント更新**: WWDC 2024/2025 発表、iOS 26、macOS 26、最新 SDK リリースを追跡
- 🎯 **テクノロジー概要**: Swift、SwiftUI、UIKit、すべての Apple 開発プラットフォームの包括的なガイド
- 💻 **サンプルコードライブラリ**: iOS、macOS、クロスプラットフォーム開発のための Swift および Objective-C コード例
- 🎥 **WWDC ビデオライブラリ**: WWDC 2014-2025 セッションを検索、トランスクリプト、Swift/SwiftUI コード例、リソース付き
- 🔗 **関連 API 発見**: SwiftUI ビュー、UIKit コントローラー、フレームワーク固有の API 関係を検索
- 📊 **プラットフォーム互換性**: iOS 13+、macOS 10.15+、watchOS 6+、tvOS 13+、visionOS 互換性分析
- ⚡ **高性能**: Xcode、Swift Playgrounds、AI 駆動開発環境に最適化
- 🌐 **マルチプラットフォーム**: 完全な iOS、iPadOS、macOS、watchOS、tvOS、visionOS ドキュメントサポート
- 🏷️ **ベータ & ステータス追跡**: iOS 26 ベータ API、非推奨 UIKit メソッド、新しい SwiftUI 機能を追跡

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
"iOS 26 のすべてのベータフレームワークをリスト"
"グラフィックス & ゲームテクノロジーを表示"
"どの機械学習フレームワークが利用可能？"
"すべての watchOS フレームワークを閲覧"
```

### 📰 ドキュメント更新
```
"最新の WWDC 更新を表示"
"SwiftUI の新機能は？"
"iOS のテクノロジー更新を取得"
"Xcode のリリースノートを表示"
"最新更新のベータ機能を検索"
```

### 🎯 テクノロジー概要
```
"アプリデザインと UI のテクノロジー概要を表示"
"ゲーム開発の包括的なガイドを取得"
"AI と機械学習の概要を探索"
"iOS 専用のテクノロジーガイドを表示"
"データ管理テクノロジーの概要を取得"
```

### 💻 サンプルコードライブラリ
```
"SwiftUI サンプルコードプロジェクトを表示"
"機械学習のサンプルコードを検索"
"UIKit サンプルプロジェクトを取得"
"注目の WWDC サンプルコードを表示"
"Core Data サンプル実装を検索"
"ベータサンプルコードプロジェクトのみを表示"
```

### 🎥 WWDC ビデオ検索
```
"SwiftUI に関する WWDC ビデオを検索"
"機械学習の WWDC セッションを検索"
"WWDC 2024 ビデオを表示"
"async/await WWDC トークを検索"
"Swift 並行処理に関する WWDC ビデオを検索"
"アクセシビリティに焦点を当てた WWDC セッションを表示"
```

### 📺 WWDC ビデオ詳細
```
"WWDC セッション 10176 の詳細を取得"
"WWDC23 SwiftData セッションのトランスクリプトを表示"
"WWDC ビデオ 10019 のコード例を取得"
"Vision Pro WWDC セッションのリソースを表示"
"'Meet async/await in Swift' セッションのトランスクリプトを取得"
```

### 📋 WWDC トピックと年度
```
"すべての WWDC トピックをリスト"
"Swift トピックの WWDC ビデオを表示"
"開発者ツールに関する WWDC ビデオを取得"
"2023 年の WWDC ビデオをリスト"
"すべての SwiftUI および UI フレームワークセッションを表示"
"機械学習 WWDC コンテンツを取得"
```

## 🛠️ 利用可能なツール

| ツール | 説明 | 主要機能 |
|-------|------|----------|
| `search_apple_docs` | Apple 開発者ドキュメント検索 | 公式検索 API、拡張フォーマット、プラットフォームフィルタリング |
| `get_apple_doc_content` | 詳細なドキュメントコンテンツ取得 | JSON API アクセス、オプション拡張分析（関連/類似 API、プラットフォーム互換性） |
| `list_technologies` | すべての Apple テクノロジー閲覧 | カテゴリフィルタリング、言語サポート、ベータステータス |
| `get_documentation_updates` | Apple ドキュメント更新追跡 | WWDC 発表、テクノロジー更新、リリースノート、ベータフィルタリング |
| `get_technology_overviews` | テクノロジー概要とガイド取得 | 包括的なガイド、階層ナビゲーション、プラットフォームフィルタリング |
| `get_framework_index` | フレームワーク API 構造ツリー | 階層ブラウジング、深度制御、タイプフィルタリング |
| `get_related_apis` | 関連 API 検索 | 継承、準拠、「参照」関係 |
| `resolve_references_batch` | API 参照バッチ解決 | ドキュメントからすべての参照を抽出・解決 |
| `get_platform_compatibility` | プラットフォーム互換性分析 | バージョンサポート、ベータステータス、非推奨情報 |
| `find_similar_apis` | 類似 API 発見 | Apple 公式推奨、トピックグループ化 |
| `search_wwdc_videos` | WWDC ビデオセッション検索 | キーワード検索、トピック/年度フィルタリング、セッションメタデータ |
| `get_wwdc_video_details` | WWDC ビデオ詳細とトランスクリプト | 完全なトランスクリプト、コード例、リソース、プラットフォーム情報 |
| `list_wwdc_topics` | 利用可能なすべての WWDC トピックをリスト | Swift から空間コンピューティングまで 19 のトピックカテゴリ |
| `list_wwdc_years` | 利用可能なすべての WWDC 年度をリスト | ビデオ数と共に年度情報 |

## 🏗️ 技術アーキテクチャ

```
apple-docs-mcp/
├── 🔧 src/
│   ├── index.ts                      # MCP サーバーエントリーポイント、すべてのツールを含む
│   ├── tools/                        # MCP ツール実装
│   │   ├── search-parser.ts          # HTML 検索結果解析
│   │   ├── doc-fetcher.ts            # JSON API ドキュメント取得
│   │   ├── list-technologies.ts      # テクノロジーカタログ処理
│   │   ├── get-documentation-updates.ts # ドキュメント更新追跡
│   │   ├── get-technology-overviews.ts # テクノロジー概要とガイド
│   │   ├── get-sample-code.ts        # サンプルコードライブラリブラウザー
│   │   ├── get-framework-index.ts    # フレームワーク構造インデックス
│   │   ├── get-related-apis.ts       # 関連 API 発見
│   │   ├── resolve-references-batch.ts # バッチ参照解決
│   │   ├── get-platform-compatibility.ts # プラットフォーム分析
│   │   ├── find-similar-apis.ts      # 類似 API 推奨
│   │   └── wwdc/                     # WWDC ビデオツール
│   │       ├── wwdc-handlers.ts      # WWDC ツールハンドラ
│   │       ├── content-extractor.ts  # ビデオコンテンツ抽出
│   │       ├── topics-extractor.ts   # トピックリスト
│   │       └── video-list-extractor.ts # ビデオリスト解析
│   └── utils/                        # ユーティリティ関数とヘルパー
│       ├── cache.ts                  # TTL サポート付きメモリキャッシュ
│       ├── constants.ts              # アプリケーション定数と URL
│       ├── error-handler.ts          # エラー処理と検証
│       ├── http-client.ts            # パフォーマンス追跡 HTTP クライアント
│       └── url-converter.ts          # URL 変換ユーティリティ
├── 📦 dist/                          # コンパイル済み JavaScript
├── 🧪 tests/                         # テストスイート
├── 📄 package.json                   # パッケージ設定
└── 📖 README.md                      # このファイル
```

### 🚀 パフォーマンス機能

- **インテリジェントキャッシュ**: コンテンツタイプごとに最適化された TTL を持つ LRU キャッシュ
- **スマート検索**: 結果ランキングを持つ優先フレームワーク検索
- **エラー回復力**: リトライロジックによる優雅な劣化
- **型安全性**: Zod を使用したランタイム検証による完全な TypeScript

### 💾 キャッシュ戦略

| コンテンツタイプ | キャッシュ期間 | キャッシュサイズ | 理由 |
|------------------|----------------|----------------|------|
| API ドキュメント | 30分 | 500 エントリ | 頻繁にアクセスされる、適度な更新 |
| 検索結果 | 10分 | 200 エントリ | 動的コンテンツ、ユーザー固有 |
| フレームワークインデックス | 1時間 | 100 エントリ | 安定した構造、変更頻度が低い |
| テクノロジーリスト | 2時間 | 50 エントリ | 滅多に変更されない、大容量コンテンツ |
| ドキュメント更新 | 30分 | 100 エントリ | 定期更新、WWDC 発表 |
| WWDC ビデオデータ | 2時間 | 無制限 | 安定したコンテンツ、ローカル JSON ファイル |

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

Apple 開発者ドキュメント検索 | iOS 開発 | macOS 開発 | Swift プログラミング | SwiftUI | UIKit | Xcode | WWDC ビデオ | モデルコンテキストプロトコル | MCP サーバー

[問題を報告](https://github.com/kimsungwhee/apple-docs-mcp/issues) • [機能リクエスト](https://github.com/kimsungwhee/apple-docs-mcp/issues/new) • [ドキュメント](https://github.com/kimsungwhee/apple-docs-mcp)

</div>