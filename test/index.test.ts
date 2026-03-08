import { describe, it, expect } from 'vitest';
import { createWorkspaceTemplate, directory, file } from '../src/index.js';

describe('createWorkspaceTemplate', () => {
  it('should generate a valid vscode URI with default server', () => {
    const uri = createWorkspaceTemplate({
      workspaceId: 'test-workspace',
      structure: [directory('src', [file('index.ts', 'console.log("hello");')])],
    });

    expect(uri).toContain('vscode://metyatech.workspace-launch-by-link/start?');
    // Ensure URL parameters are present
    const url = new URL(uri);
    const params = url.searchParams;
    expect(params.get('server')).toBe('http://localhost:8787');
    expect(params.get('workspaceId')).toBe('test-workspace');
    expect(params.get('ownerId')).toBe('ownerId'); // Default ownerId
  });

  it('should support custom server and token', () => {
    const uri = createWorkspaceTemplate({
      workspaceId: 'test-workspace-2',
      structure: [],
      server: 'https://example.com',
      ownerId: 'custom-owner',
      token: 'secret-token',
    });

    const url = new URL(uri);
    const params = url.searchParams;
    expect(params.get('server')).toBe('https://example.com');
    expect(params.get('ownerId')).toBe('custom-owner');
    expect(params.get('token')).toBe('secret-token');
  });

  it('should handle nested directories correctly', () => {
    // This test implicitly checks if template materialization doesn't crash
    const uri = createWorkspaceTemplate({
      workspaceId: 'nested-workspace',
      structure: [
        directory('src', [
          directory('utils', [file('helper.ts', 'export const add = (a, b) => a + b;')]),
        ]),
      ],
    });
    expect(uri).toContain('workspaceId=nested-workspace');
  });
});

describe('directory and file helpers', () => {
  it('should create directory nodes', () => {
    const dir = directory('src', []);
    expect(dir).toEqual({ type: 'directory', name: 'src', children: [] });
  });

  it('should create file nodes', () => {
    const f = file('README.md', '# Hi');
    expect(f).toEqual({ type: 'file', name: 'README.md', content: '# Hi', encoding: undefined });
  });
});
