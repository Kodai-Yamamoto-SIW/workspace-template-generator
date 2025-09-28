declare const __non_webpack_require__: typeof require | undefined;

export type FileEncoding = 'utf8' | 'base64';

export type TemplateNode = TemplateDirectoryNode | TemplateFileNode;

export type TemplateDirectoryNode = {
  type: 'directory';
  name: string;
  children?: TemplateNode[];
};

export type TemplateFileNode = {
  type: 'file';
  name: string;
  content: string;
  encoding?: FileEncoding;
};

type TemplateFileEntry = {
  path: string;
  content: string;
  encoding: FileEncoding;
};

export type CreateWorkspaceTemplateOptions = {
  workspaceId: string;
  structure: TemplateNode[];
  server?: string;
  ownerId?: string;
  token?: string;
};

type TemplateSpec = {
  workspaceId: string;
  directories: string[];
  files: TemplateFileEntry[];
};

type TemplateRegistry = {
  specs: Map<string, string>;
};

const REGISTRY_SYMBOL = Symbol.for('workspace.launch.template.registry');

const registry: TemplateRegistry = (() => {
  const globalObj = globalThis as unknown as Record<string | symbol, unknown>;
  if (!globalObj[REGISTRY_SYMBOL]) {
    globalObj[REGISTRY_SYMBOL] = {
      specs: new Map<string, string>(),
    } satisfies TemplateRegistry;
  }
  return globalObj[REGISTRY_SYMBOL] as TemplateRegistry;
})();

export function directory(name: string, children: TemplateNode[] = []): TemplateDirectoryNode {
  return { type: 'directory', name, children };
}

export function file(
  name: string,
  content: string,
  options: { encoding?: FileEncoding } = {}
): TemplateFileNode {
  return {
    type: 'file',
    name,
    content,
    encoding: options.encoding,
  };
}

export function createWorkspaceTemplate(
  options: CreateWorkspaceTemplateOptions
): string {
  const { workspaceId, structure, server, ownerId, token } = options;

  const parsed = collectNodes(structure);
  const directories = Array.from(parsed.directories).sort();
  const files = [...parsed.files].sort((a, b) => a.path.localeCompare(b.path));

  ensureTemplateMaterialized({
    workspaceId,
    directories,
    files,
  });

  const launchServer = resolveServer(server);
  const launchOwnerId = ownerId ?? 'ownerId';

  const params = new URLSearchParams({
    server: launchServer,
    workspaceId,
    ownerId: launchOwnerId,
  });
  if (token) {
    params.set('token', token);
  }

  return `vscode://Kodai-Yamamoto-SIW.workspace-launch-by-link/start?${params.toString()}`;
}

function collectNodes(nodes: TemplateNode[], parentPath = ''): {
  directories: Set<string>;
  files: TemplateFileEntry[];
} {
  const directories = new Set<string>();
  const files: TemplateFileEntry[] = [];

  nodes.forEach((node) => {
    if (node.type === 'directory') {
      const normalizedPath = normalizeRelativePath(parentPath, node.name);
      if (normalizedPath) {
        directories.add(normalizedPath);
      }
      const nested = collectNodes(node.children ?? [], normalizedPath);
      nested.directories.forEach((dir) => directories.add(dir));
      nested.files.forEach((fileEntry) => files.push(fileEntry));
      return;
    }

    if (node.type === 'file') {
      const normalizedPath = normalizeRelativePath(parentPath, node.name);
      if (!normalizedPath) {
        throw new Error('ファイル名を空にはできません。');
      }
      const content = normalizeContent(node.content, node.encoding);
      files.push({
        path: normalizedPath,
        content,
        encoding: node.encoding ?? 'utf8',
      });
      return;
    }

    const exhaustiveCheck: never = node;
    throw new Error(`未知のノードタイプです: ${exhaustiveCheck}`);
  });

  return { directories, files };
}

function normalizeRelativePath(parentPath: string, childName: string): string {
  const raw = joinPosix(parentPath, childName.trim());
  const segments = splitPathSegments(raw);
  return segments.join('/');
}

function joinPosix(parent: string, child: string): string {
  if (!parent) {
    return child;
  }
  if (!child) {
    return parent;
  }
  return `${parent.replace(/\/$/, '')}/${child}`;
}

function splitPathSegments(target: string): string[] {
  return target
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (segment === '.' || segment === '..') {
        throw new Error(`不正なパスセグメントです: "${segment}"`);
      }
      return segment;
    });
}

function normalizeContent(raw: string, encoding: FileEncoding | undefined): string {
  if (encoding === 'base64') {
    return raw.trim();
  }

  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }

  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);

  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return lines
    .map((line) => {
      if (minIndent === 0) {
        return line;
      }
      const leading = line.match(/^\s*/)?.[0] ?? '';
      const removeLength = Math.min(leading.length, minIndent);
      return line.slice(removeLength);
    })
    .join('\n');
}

function resolveServer(explicit?: string): string {
  if (explicit) {
    return explicit;
  }

  const envValue =
    typeof process !== 'undefined' &&
    typeof (process as unknown as { env?: Record<string, string | undefined> }).env !== 'undefined'
      ? (process as unknown as { env?: Record<string, string | undefined> }).env?.WORKSPACE_LAUNCH_SERVER
      : undefined;

  return envValue ?? 'http://localhost:8787';
}

function ensureTemplateMaterialized(spec: TemplateSpec): void {
  if (typeof window !== 'undefined') {
    return;
  }

  const nodeRequire = getNodeRequire();
  if (!nodeRequire) {
    return;
  }

  const normalizedSpecKey = JSON.stringify({
    directories: [...spec.directories].sort(),
    files: [...spec.files]
      .map((file) => ({
        path: file.path,
        content: file.content,
        encoding: file.encoding,
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  });

  const cached = registry.specs.get(spec.workspaceId);
  if (cached === normalizedSpecKey) {
    return;
  }

  registry.specs.set(spec.workspaceId, normalizedSpecKey);

  const fs: typeof import('fs') = nodeRequire('fs');
  const path: typeof import('path') = nodeRequire('path');

  const siteRoot = typeof process !== 'undefined' && typeof process.cwd === 'function'
    ? process.cwd()
    : path.resolve('.');
  const dataRoot = path.join(siteRoot, '.workspace-launch');
  const templatesRoot = path.join(dataRoot, 'templates');
  const workspaceIdDir = path.join(templatesRoot, sanitize(spec.workspaceId));

  fs.mkdirSync(templatesRoot, { recursive: true });
  fs.rmSync(workspaceIdDir, { recursive: true, force: true });
  fs.mkdirSync(workspaceIdDir, { recursive: true });

  spec.directories.forEach((dir) => {
    if (!dir) return;
    const segments = splitPathSegments(dir);
    if (segments.length === 0) return;
    const dirPath = path.join(workspaceIdDir, ...segments);
    fs.mkdirSync(dirPath, { recursive: true });
  });

  spec.files.forEach((file) => {
    const segments = splitPathSegments(file.path);
    const filePath = path.join(workspaceIdDir, ...segments);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const buffer =
      file.encoding === 'base64'
        ? Buffer.from(file.content, 'base64')
        : Buffer.from(file.content, 'utf8');
    fs.writeFileSync(filePath, buffer);
  });

  const relativePath = path.relative(siteRoot, workspaceIdDir) || workspaceIdDir;
  console.log(
    `[WorkspaceTemplate] Materialized template "${spec.workspaceId}" at ${relativePath}`
  );
}

function getNodeRequire(): typeof require | undefined {
  if (typeof __non_webpack_require__ === 'function') {
    return __non_webpack_require__;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return eval('require') as typeof require;
  } catch {
    return undefined;
  }
}

function sanitize(value: string | undefined): string {
  const safe = String(value ?? '').trim();
  return safe.replace(/[^a-zA-Z0-9._-]/g, '_') || 'default';
}
