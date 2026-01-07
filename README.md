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
import {
  createWorkspaceTemplate,
  directory,
  file,
} from '@metyatech/workspace-template-generator';

const launchUrl = createWorkspaceTemplate({
  workspaceId: 'hello-world',
  structure: [
    directory('src', [file('main.py', 'print("Hello")')]),
    file(
      'README.md',
      `# Hello Workspace\n\n1. VS Code のリンクをクリックします。`
    ),
  ],
});

console.log(launchUrl);
```

テンプレートは Node.js 上でのみファイルシステムへ書き込まれます。ブラウザなどでインポートした場合は副作用が発生しません。

## スクリプト

- `npm run build`: TypeScript を `dist/` へコンパイルします
- `npm run clean`: 出力物を削除します

パッケージは `prepare` フックで自動ビルドされるため、`npm install` 時に `dist/` が生成されます。

## ライセンス

MIT License
