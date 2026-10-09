import { Service } from '@angular/core';
import { CharChain, CharChainNode } from './gve-api.service';

// You can use this online tool to visualize the graph:
//   https://dreampuf.github.io/GraphvizOnline
// You can also append ?engine=dot#... where ... is the graphviz code.

// https://graphviz.org/docs/attr-types/rankdir
export type GraphvizRankdir = 'TB' | 'LR' | 'BT' | 'RL';

@Service()
export class GveGraphvizService {
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private hslToRgb(hue: number, saturation: number, lightness: number): string {
    const chroma =
      ((1 - Math.abs((2 * lightness) / 100 - 1)) * saturation) / 100;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness / 100 - chroma / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (hue >= 0 && hue < 60) {
      r = chroma;
      g = x;
    } else if (hue >= 60 && hue < 120) {
      r = x;
      g = chroma;
    } else if (hue >= 120 && hue < 180) {
      g = chroma;
      b = x;
    } else if (hue >= 180 && hue < 240) {
      g = x;
      b = chroma;
    } else if (hue >= 240 && hue < 300) {
      r = x;
      b = chroma;
    } else if (hue >= 300 && hue < 360) {
      r = chroma;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private getColorForTag(tag: string): string {
    const hash = this.hashString(tag);
    const hue = (hash * 137) % 360; // Use a prime number to spread out the hues
    const saturation = 60 + (hash % 40); // Saturation between 60% and 100%
    const lightness = 50 + (hash % 30); // Lightness between 50% and 80%
    return this.hslToRgb(hue, saturation, lightness);
  }

  private escapeLabel(label: string): string {
    return label.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private getExcludedNodeIds(chain: CharChain, tags?: string[]): Set<number> {
    // get only the desired links
    const links = chain.links.filter((link) =>
      tags ? tags.includes(link.tag) : true
    );
    // return all the nodes not referenced by the links
    const excluded = new Set<number>();
    chain.nodes.forEach((node) => {
      excluded.add(node.id);
    });
    links.forEach((link) => {
      excluded.delete(link.sourceId);
      excluded.delete(link.targetId);
    });
    return excluded;
  }

  /**
   * Represent the received chain as a Graphviz digraph.
   *
   * @param chain The source chain if any.
   * @param tags The tags to show. When set, only the links with these tags are shown.
   * @param rankdir The rank direction.
   * @returns Graphviz representation of the chain.
   */
  public generateGraph(
    chain?: CharChain,
    tags?: string[],
    rankdir: GraphvizRankdir = 'LR'
  ): string {
    if (!chain) {
      return 'digraph G {}';
    }

    const sb: string[] = [];
    const excludedNodeIds = this.getExcludedNodeIds(chain, tags);

    sb.push('digraph G {');
    sb.push('  bgcolor=transparent;');
    sb.push('  node [style=filled];');
    sb.push(`  rankdir=${rankdir};`);
    chain.nodes.forEach((node) => {
      // note that in label we must escape backslashes and double quotes
      sb.push(
        `  ${node.id} [label="${this.escapeLabel(node.label)}"` +
          (node.sourceTag
            ? ` fillcolor="${this.getColorForTag(node.sourceTag)}"`
            : '') +
          (node.sourceTag && excludedNodeIds.has(node.id)
            ? ` xlabel="${node.sourceTag}"`
            : '') +
          '];'
      );
    });
    chain.links.forEach((link) => {
      if (
        !link.sourceId ||
        !link.targetId ||
        (tags && !tags.includes(link.tag))
      ) {
        return;
      }
      const color = this.getColorForTag(link.tag);
      sb.push(
        `  ${link.sourceId} -> ${link.targetId} [label="${link.tag}", color="${color}"];`
      );
    });
    sb.push('}');
    return sb.join('\n');
  }
}
