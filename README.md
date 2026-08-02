# @metyatech/workspace-template-generator

VS Code ワークスペーステンプレートを TypeScript で宣言し、ビルド時にファイルを生成して VS Code から開ける deeplink を返すユーティリティです。

## 特長

- ドキュメントやスクリプトからテンプレート構造を宣言
- ビルド時に `.workspace-launch/templates/<workspaceId>` 配下へ素材を自動生成
- VS Code の拡張 `workspace-launch-by-link` 用 deeplink を生成
- 依存パッケージなしで Node.js 18 以降で動作

## インストール

```bash
npm install @metyatech/workspace-template-generator
```

ローカルパスから取り込みたい場合は、Git サブモジュール/ワークスペースを利用して `file:` 参照してください。

## 使い方

```ts
import { createWorkspaceTemplate, directory, file } from '@metyatech/workspace-template-generator';

const launchUrl = createWorkspaceTemplate({
  workspaceId: 'hello-world',
  structure: [
    directory('src', [file('main.py', 'print("Hello")')]),
    file('README.md', `# Hello Workspace\n\n1. VS Code のリンクをクリックします。`),
  ],
});

console.log(launchUrl);
```

テンプレートは Node.js 上でのみファイルシステムへ書き込まれます。ブラウザなどでインポートした場合は副作用が発生しません。

## オプション設定 (CreateWorkspaceTemplateOptions)

`createWorkspaceTemplate` 関数はオプションのプロパティを持つ設定オブジェクトを受け取ります:

- `server?: string`
  - 説明: 生成される deeplink に埋め込むサーバーのベース URL。指定されている場合はこの値が優先されます。
  - デフォルト: 指定がない場合は環境変数 `WORKSPACE_LAUNCH_SERVER` が使用されます。環境変数も未設定の場合、デフォルトは `http://localhost:8787` です。

- `ownerId?: string`
  - 説明: deeplink の `ownerId` クエリパラメータ。指定がない場合のデフォルトは `ownerId` です。

- `token?: string`
  - 説明: 認証が必要な場合に deeplink に `token` クエリパラメータを追加します。指定がない場合はクエリに含まれません。

### 環境変数の挙動

- `WORKSPACE_LAUNCH_SERVER`: `server` オプションが指定されなかった場合のデフォルトとして使用されます。未設定の場合は `http://localhost:8787` が使われます。

#### 使用例

```ts
createWorkspaceTemplate({
  workspaceId: 'hello-world',
  structure: [
    /* ... */
  ],
  server: 'https://workspace.example.com',
  ownerId: 'my-owner',
  token: 'secret-token',
});
```

## スクリプト

- `npm run build`: TypeScript を `dist/` へコンパイルします
- `npm run clean`: 出力物を削除します

パッケージは `prepare` フックで自動ビルドされるため、`npm install` 時に `dist/` が生成されます。

## ライセンス

MIT License
