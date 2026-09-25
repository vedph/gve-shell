import { beforeEach, describe, expect, it } from 'vitest';

import { GveGraphvizService } from './gve-graphviz.service';
import { CharChain } from './gve-api.service';

describe('GveGraphvizService', () => {
  let service: GveGraphvizService;

  const chain: CharChain = {
    nodes: [
      { id: 1, label: 'a', data: 'a', sourceTag: 'v0' },
      { id: 2, label: 'b', data: 'b', sourceTag: 'v0' },
      { id: 3, label: 'c', data: 'c', sourceTag: 'v1' },
    ],
    links: [
      { tag: 'v0', sourceId: 1, targetId: 2 },
      { tag: 'v1', sourceId: 2, targetId: 3 },
    ],
  };

  beforeEach(() => {
    service = new GveGraphvizService();
  });

  it('should return an empty graph without chain', () => {
    expect(service.generateGraph()).toBe('digraph G {}');
  });

  it('should render header, nodes and links', () => {
    const graph = service.generateGraph(chain);
    const lines = graph.split('\n');
    expect(lines[0]).toBe('digraph G {');
    expect(lines).toContain('  bgcolor=transparent;');
    expect(lines).toContain('  node [style=filled];');
    expect(lines).toContain('  rankdir=LR;');
    expect(lines[lines.length - 1]).toBe('}');
    expect(graph).toMatch(/ {2}1 \[label="a" fillcolor="#[0-9a-f]{6}"\];/);
    expect(graph).toMatch(
      / {2}1 -> 2 \[label="v0", color="#[0-9a-f]{6}"\];/,
    );
    expect(graph).toMatch(
      / {2}2 -> 3 \[label="v1", color="#[0-9a-f]{6}"\];/,
    );
  });

  it('should honor the rankdir argument', () => {
    expect(service.generateGraph(chain, undefined, 'TB')).toContain(
      'rankdir=TB;',
    );
  });

  it('should use the same color for the same tag', () => {
    const graph = service.generateGraph(chain);
    const c1 = graph.match(/ {2}1 \[label="a" fillcolor="(#[0-9a-f]{6})"/)![1];
    const c2 = graph.match(/ {2}2 \[label="b" fillcolor="(#[0-9a-f]{6})"/)![1];
    expect(c1).toBe(c2);
  });

  it('should render only the links with the requested tags', () => {
    const graph = service.generateGraph(chain, ['v1']);
    expect(graph).not.toContain('1 -> 2');
    expect(graph).toContain('2 -> 3');
  });

  it('should add xlabel to nodes not referenced by the shown links', () => {
    const graph = service.generateGraph(chain, ['v1']);
    // node 1 is only linked by v0, which is filtered out
    expect(graph).toMatch(/ {2}1 \[label="a" fillcolor="#[0-9a-f]{6}" xlabel="v0"\];/);
    expect(graph).not.toMatch(/ {2}2 \[[^\]]*xlabel/);
  });

  it('should not add fillcolor to nodes without source tag', () => {
    const graph = service.generateGraph({
      nodes: [{ id: 1, label: 'x', data: 'x' }],
      links: [],
    });
    expect(graph).toContain('  1 [label="x"];');
  });

  it('should skip links with missing endpoints', () => {
    const graph = service.generateGraph({
      nodes: [{ id: 1, label: 'x', data: 'x' }],
      links: [{ tag: 'v1', sourceId: 0, targetId: 1 }],
    });
    expect(graph).not.toContain('->');
  });

  it('should generate valid colors for any tag', () => {
    const tags = Array.from({ length: 60 }, (_, i) => `tag${i}`);
    const graph = service.generateGraph({
      nodes: tags.map((t, i) => ({
        id: i + 1,
        label: 'x',
        data: 'x',
        sourceTag: t,
      })),
      links: [],
    });
    const colors = [...graph.matchAll(/fillcolor="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(colors).toHaveLength(60);
    colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
    // colors are spread across hues
    expect(new Set(colors).size).toBeGreaterThan(30);
  });

  it('should escape double quotes and backslashes in labels', () => {
    const graph = service.generateGraph({
      nodes: [
        { id: 1, label: '"', data: '"' },
        { id: 2, label: '\\', data: '\\' },
      ],
      links: [],
    });
    expect(graph).toContain('  1 [label="\\""];');
    expect(graph).toContain('  2 [label="\\\\"];');
  });
});
