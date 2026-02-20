import React, { type ReactNode } from 'react';
import concepts, { type ConceptEntry } from '../data/conceptRegistry';
import ConceptLink from '../components/ui/ConceptLink';

const sorted = [...concepts].sort((a, b) => b.term.length - a.term.length);

const pattern = sorted
  .map((c) => {
    const escaped = c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return c.wordBoundary ? `\\b${escaped}\\b` : escaped;
  })
  .join('|');

const regex = new RegExp(`(${pattern})`, 'i');

const termMap = new Map<string, ConceptEntry>();
for (const c of sorted) {
  const key = c.term.toLowerCase();
  if (!termMap.has(key)) termMap.set(key, c);
}

export function processChildren(children: ReactNode, currentModuleId: string | null): ReactNode {
  const linked = new Set<string>();
  return processNode(children, currentModuleId, linked);
}

function processNode(
  node: ReactNode,
  currentModuleId: string | null,
  linked: Set<string>,
): ReactNode {
  if (node == null || typeof node === 'boolean') return node;

  if (typeof node === 'string') {
    return processString(node, currentModuleId, linked);
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => {
      const result = processNode(child, currentModuleId, linked);
      if (React.isValidElement(result) && result.key == null) {
        return React.cloneElement(result, { key: 'cl-' + i });
      }
      if (Array.isArray(result)) {
        return <React.Fragment key={'clf-' + i}>{result}</React.Fragment>;
      }
      return result;
    });
  }

  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (props['data-no-concept']) return node;
    if (node.type === ConceptLink) return node;
    if (props.children) {
      return React.cloneElement(
        node,
        {},
        processNode(props.children as ReactNode, currentModuleId, linked),
      );
    }
  }

  return node;
}

function processString(
  text: string,
  currentModuleId: string | null,
  linked: Set<string>,
): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const match = remaining.match(regex);
    if (!match) {
      parts.push(remaining);
      break;
    }

    const matchedText = match[0];
    const concept = termMap.get(matchedText.toLowerCase());
    const idx = match.index!;

    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    const termKey = concept ? concept.term.toLowerCase() : matchedText.toLowerCase();
    if (!concept || concept.moduleId === currentModuleId || linked.has(termKey)) {
      parts.push(matchedText);
    } else {
      linked.add(termKey);
      parts.push(
        <ConceptLink
          key={'clink-' + keyIdx++}
          moduleId={concept.moduleId}
          display={concept.display}
          desc={concept.desc}
        >
          {matchedText}
        </ConceptLink>,
      );
    }

    remaining = remaining.slice(idx + matchedText.length);
  }

  return parts.length === 1 ? parts[0] : parts;
}
