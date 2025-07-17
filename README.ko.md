# Apple Docs MCP

[![npm 버전](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp.svg)](https://badge.fury.io/js/@kimsungwhee%2Fapple-docs-mcp)
[![라이선스: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

자연어 쿼리를 통해 Apple 개발자 문서에 원활하게 액세스할 수 있는 강력한 모델 컨텍스트 프로토콜(MCP) 서버입니다. AI 기반 개발 환경에서 직접 Apple 프레임워크, API, 샘플 코드 등을 검색, 탐색하고 상세 정보를 얻을 수 있습니다.

[English](README.md) | [日本語](README.ja.md) | **한국어** | [简体中文](README.zh-CN.md)

## ✨ 기능

- 🔍 **스마트 검색**: Apple 개발자 문서 전반에 걸친 지능적 검색과 향상된 결과 포맷팅
- 📚 **완전한 문서 액세스**: 상세한 문서 내용을 위한 Apple JSON API 완전 액세스
- 🔧 **프레임워크 인덱스**: 모든 Apple 프레임워크의 계층적 API 구조 탐색
- 📋 **기술 카탈로그**: 카테고리별로 정리된 모든 Apple 기술 및 프레임워크 목록
- 📰 **문서 업데이트**: WWDC 발표, 기술 업데이트, 릴리스 노트 추적
- 🔗 **관련 API 발견**: 지능적 추천을 통한 관련, 유사 및 대안 API 찾기
- 📊 **플랫폼 호환성**: Apple 생태계 전반의 플랫폼 지원 및 버전 호환성 분석
- ⚡ **고성능**: 콘텐츠 타입별 최적화된 TTL을 가진 메모리 기반 캐싱 시스템
- 🌐 **멀티플랫폼**: iOS, macOS, watchOS, tvOS, visionOS 문서 지원
- 🏷️ **베타 및 상태 추적**: 적절한 상태 표시기로 베타, 사용 중단 및 새 API 식별

## 🚀 빠른 시작

### Claude Desktop (권장)

Claude Desktop 구성 파일에 다음을 추가하세요:

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

> **참고**: 이전 버전이 사용되는 문제가 발생하면 `@latest`를 추가하여 최신 버전을 강제합니다:
> ```json
> "args": ["-y", "@kimsungwhee/apple-docs-mcp@latest"]
> ```

Claude Desktop을 재시작하고 Apple API에 대해 질문해보세요!

## 📦 설치

<details>
<summary><strong>📱 Claude Code</strong></summary>

```bash
claude mcp add apple-docs -- npx -y @kimsungwhee/apple-docs-mcp@latest
```

[📖 Claude Code MCP 문서](https://docs.anthropic.com/en/docs/claude-code/mcp)

</details>

<details>
<summary><strong>🖱️ Cursor</strong></summary>

**설정을 통해**: 설정 → Cursor 설정 → MCP → 새 글로벌 MCP 서버 추가

**구성 파일을 통해**: `~/.cursor/mcp.json`에 추가:

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

[📖 Cursor MCP 문서](https://docs.cursor.com/context/mcp)

</details>

<details>
<summary><strong>🔷 VS Code</strong></summary>

VS Code MCP 구성에 추가:

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

[📖 VS Code MCP 문서](https://code.visualstudio.com/docs/editor/mcp)

</details>

<details>
<summary><strong>🌊 Windsurf</strong></summary>

Windsurf MCP 구성에 추가:

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

[📖 Windsurf MCP 문서](https://docs.codeium.com/windsurf/mcp)

</details>

<details>
<summary><strong>⚡ Zed</strong></summary>

Zed `settings.json`에 추가:

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

[📖 Zed 컨텍스트 서버 문서](https://zed.dev/docs/context-servers)

</details>

<details>
<summary><strong>🔧 Cline</strong></summary>

**마켓플레이스를 통해**:
1. Cline 열기 → 메뉴 (☰) → MCP 서버 → 마켓플레이스
2. "Apple Docs MCP" 검색 → 설치

**구성을 통해**: `cline_mcp_settings.json`에 추가:

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

Windows 시스템의 경우:

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
<summary><strong>⚙️ 고급 설치</strong></summary>

**전역 설치**:
```bash
# pnpm 사용 (권장)
pnpm add -g @kimsungwhee/apple-docs-mcp

# npm 사용
npm install -g @kimsungwhee/apple-docs-mcp
```

**직접 사용**:
```bash
npx @kimsungwhee/apple-docs-mcp --help
```

**개발 환경 설정**:
```bash
git clone https://github.com/kimsungwhee/apple-docs-mcp.git
cd apple-docs-mcp

# pnpm 사용 (권장)
pnpm install && pnpm run build

# npm 사용
npm install && npm run build
```

</details>

## 💬 사용 예제

### 🔍 스마트 검색
```
"SwiftUI 애니메이션 검색"
"CoreML 모델 로딩 방법 찾기"
"Swift async/await 패턴 찾아보기"
"AlarmKit 스케줄링 예제 보여줘"
```

### 📚 프레임워크 심화 탐구
```
"SwiftUI 프레임워크의 상세 정보 가져오기"
"iOS 18 프레임워크의 새로운 기능은?"
"Vision 프레임워크 기능에 대해 알려줘"
"모든 WeatherKit API 보여줘"
```

### 🔧 API 탐색
```
"UIViewController 라이프사이클 메서드 보여줘"
"SwiftData 모델 생성 세부사항 가져오기"
"AlarmAttributes 속성은 무엇인가?"
"모든 ARKit 앵커 타입 나열"
```

### 💡 샘플 코드 및 튜토리얼
```
"알람 스케줄링 샘플 코드 찾기"
"SwiftUI 튜토리얼 예제 보여줘"
"카메라 캡처 샘플 코드 가져오기"
"Core Data 마이그레이션 예제 찾기"
```

### 📋 기술 발견
```
"iOS 18의 모든 베타 프레임워크 나열"
"그래픽 & 게임 기술 보여줘"
"어떤 머신러닝 프레임워크가 사용 가능한가?"
"모든 watchOS 프레임워크 탐색"
```

### 📰 문서 업데이트
```
"최신 WWDC 업데이트 보여줘"
"SwiftUI의 새로운 기능은?"
"iOS 기술 업데이트 가져오기"
"Xcode 릴리스 노트 보여줘"
"최신 업데이트에서 베타 기능 찾기"
```

## 🛠️ 사용 가능한 도구

| 도구 | 설명 | 주요 기능 |
|------|------|----------|
| `search_apple_docs` | Apple 개발자 문서 검색 | 공식 검색 API, 향상된 포맷팅, 플랫폼 필터링 |
| `get_apple_doc_content` | 상세한 문서 내용 가져오기 | JSON API 액세스, 선택적 향상 분석 (관련/유사 API, 플랫폼 호환성) |
| `list_technologies` | 모든 Apple 기술 탐색 | 카테고리 필터링, 언어 지원, 베타 상태 |
| `get_documentation_updates` | Apple 문서 업데이트 추적 | WWDC 발표, 기술 업데이트, 릴리스 노트, 베타 필터링 |
| `get_framework_index` | 프레임워크 API 구조 트리 | 계층적 탐색, 깊이 제어, 타입 필터링 |
| `get_related_apis` | 관련 API 찾기 | 상속, 준수, "참고" 관계 |
| `resolve_references_batch` | API 참조 일괄 해결 | 문서에서 모든 참조 추출 및 해결 |
| `get_platform_compatibility` | 플랫폼 호환성 분석 | 버전 지원, 베타 상태, 사용 중단 정보 |
| `find_similar_apis` | 유사한 API 발견 | Apple 공식 권장사항, 주제 그룹화 |

## 🏗️ 기술 아키텍처

```
apple-docs-mcp/
├── 🔧 src/
│   ├── index.ts                      # MCP 서버 진입점, 모든 도구 포함
│   ├── tools/                        # MCP 도구 구현
│   │   ├── search-parser.ts          # HTML 검색 결과 파싱
│   │   ├── doc-fetcher.ts            # JSON API 문서 가져오기
│   │   ├── list-technologies.ts      # 기술 카탈로그 처리
│   │   ├── get-documentation-updates.ts # 문서 업데이트 추적
│   │   ├── get-framework-index.ts    # 프레임워크 구조 인덱싱
│   │   ├── get-related-apis.ts       # 관련 API 발견
│   │   ├── resolve-references-batch.ts # 일괄 참조 해결
│   │   ├── get-platform-compatibility.ts # 플랫폼 분석
│   │   └── find-similar-apis.ts      # 유사한 API 추천
│   └── utils/                        # 유틸리티 함수 및 헬퍼
│       ├── cache.ts                  # TTL 지원 메모리 캐시
│       ├── constants.ts              # 애플리케이션 상수 및 URL
│       ├── error-handler.ts          # 오류 처리 및 검증
│       ├── http-client.ts            # 성능 추적 HTTP 클라이언트
│       └── url-converter.ts          # URL 변환 유틸리티
├── 📦 dist/                          # 컴파일된 JavaScript
├── 🧪 tests/                         # 테스트 스위트
├── 📄 package.json                   # 패키지 구성
└── 📖 README.md                      # 이 파일
```

### 🚀 성능 기능

- **지능형 캐싱**: 콘텐츠 타입별로 최적화된 TTL을 가진 LRU 캐시
- **스마트 검색**: 결과 순위를 가진 우선순위 프레임워크 검색
- **오류 복원력**: 재시도 로직을 가진 우아한 성능 저하
- **타입 안전성**: Zod를 사용한 런타임 검증과 완전한 TypeScript

### 💾 캐싱 전략

| 콘텐츠 타입 | 캐시 기간 | 캐시 크기 | 이유 |
|-------------|-----------|----------|------|
| API 문서 | 30분 | 500 항목 | 자주 액세스됨, 적당한 업데이트 |
| 검색 결과 | 10분 | 200 항목 | 동적 콘텐츠, 사용자별 |
| 프레임워크 인덱스 | 1시간 | 100 항목 | 안정적인 구조, 변경 빈도 낮음 |
| 기술 목록 | 2시간 | 50 항목 | 거의 변경되지 않음, 대용량 콘텐츠 |
| 문서 업데이트 | 30분 | 100 항목 | 정기 업데이트, WWDC 발표 |

## 🧪 개발

### 빠른 명령어

```bash
# 자동 재로드 개발
pnpm run dev    # 또는: npm run dev

# 프로덕션 빌드
pnpm run build  # 또는: npm run build

# 타입 체크
pnpm exec tsc --noEmit  # 또는: npx tsc --noEmit

# 빌드 결과물 정리
pnpm run clean  # 또는: npm run clean
```

### 로컬 테스트

```bash
# MCP 서버 직접 테스트
node dist/index.js

# 샘플 쿼리로 테스트
npx @kimsungwhee/apple-docs-mcp --test
```

## 🤝 기여

기여를 환영합니다! 시작하는 방법:

1. 저장소를 **Fork**
2. 기능 브랜치 **생성**: `git checkout -b feature/amazing-feature`
3. 변경사항 **커밋**: `git commit -m 'Add amazing feature'`
4. 브랜치에 **푸시**: `git push origin feature/amazing-feature`
5. Pull Request **열기**

## 📄 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE)를 참조하세요.

## ⚠️ 면책조항

이 프로젝트는 Apple Inc.와 제휴하거나 승인받지 않았습니다. 교육 및 개발 목적으로 공개적으로 사용 가능한 Apple 개발자 문서 API를 사용합니다.

---

<div align="center">

**Apple 개발자 커뮤니티를 위해 ❤️로 제작**

[문제 신고](https://github.com/kimsungwhee/apple-docs-mcp/issues) • [기능 요청](https://github.com/kimsungwhee/apple-docs-mcp/issues/new) • [문서](https://github.com/kimsungwhee/apple-docs-mcp)

</div>