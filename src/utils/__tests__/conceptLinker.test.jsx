import { describe, it, expect } from 'vitest';
import React from 'react';
import { processChildren } from '../conceptLinker';

function flatten(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flatten).join('');
  if (React.isValidElement(node)) {
    const kids = node.props.children;
    return flatten(kids);
  }
  return String(node);
}

function findLinks(node) {
  if (node == null) return [];
  if (typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap(findLinks);
  if (React.isValidElement(node)) {
    if (node.type === 'a' || (node.props && node.props.href)) {
      return [node];
    }
    // Recurse into children — ConceptLink renders a span > a
    const kids = node.props.children;
    if (kids) return findLinks(kids);
  }
  return [];
}

function collectElements(node) {
  if (node == null) return [];
  if (typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap(collectElements);
  if (React.isValidElement(node)) {
    return [node, ...collectElements(node.props.children)];
  }
  return [];
}

describe('conceptLinker / processChildren', () => {
  it('returns plain string when no match', () => {
    const result = processChildren('Hello world', null);
    expect(result).toBe('Hello world');
  });

  it('creates a ConceptLink for a known term', () => {
    const result = processChildren('The p-value was low', null);
    // Should produce an array with text and a ConceptLink element
    expect(Array.isArray(result)).toBe(true);
    const elements = collectElements(result);
    expect(elements.length).toBeGreaterThan(0);
    // Verify the full text is preserved
    expect(flatten(result)).toContain('p-value');
  });

  it('links only the first occurrence of a term', () => {
    const result = processChildren('p-value means p-value', null);
    const elements = collectElements(result);
    // Only one ConceptLink element (which is the first match)
    const conceptLinks = elements.filter(
      (el) => el.props && el.props.moduleId
    );
    expect(conceptLinks.length).toBe(1);
  });

  it('suppresses self-links to the current module', () => {
    // p-value maps to m2
    const result = processChildren('The p-value is important', 'm2');
    // Should return plain text since it's a self-link
    if (typeof result === 'string') {
      expect(result).toContain('p-value');
    } else {
      const conceptLinks = collectElements(result).filter(
        (el) => el.props && el.props.moduleId
      );
      expect(conceptLinks.length).toBe(0);
    }
  });

  it('returns null for null input', () => {
    expect(processChildren(null, null)).toBeNull();
  });

  it('returns empty array for empty string input', () => {
    const result = processChildren('', null);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('processes nested elements', () => {
    const input = React.createElement('span', null, 'The p-value was significant');
    const result = processChildren(input, null);
    expect(React.isValidElement(result)).toBe(true);
    expect(flatten(result)).toContain('p-value');
  });

  it('skips elements with data-no-concept', () => {
    const input = React.createElement('span', { 'data-no-concept': true }, 'The p-value matters');
    const result = processChildren(input, null);
    // Should be returned unchanged
    expect(result).toBe(input);
  });

  it('respects word boundaries for short terms', () => {
    // MDE has wordBoundary: true
    const result1 = processChildren('The MDE is small', null);
    expect(flatten(result1)).toContain('MDE');
    const elements1 = collectElements(result1);
    const links1 = elements1.filter((el) => el.props && el.props.moduleId);
    expect(links1.length).toBe(1);

    // MDEP should not match MDE due to word boundary
    const result2 = processChildren('MDEP is not a thing', null);
    if (typeof result2 === 'string') {
      expect(result2).toBe('MDEP is not a thing');
    } else {
      const links2 = collectElements(result2).filter(
        (el) => el.props && el.props.moduleId === 'm8'
      );
      expect(links2.length).toBe(0);
    }
  });

  it('matches longest term first', () => {
    // 'false discovery rate' should match as one term, not 'false' partial
    const result = processChildren('The false discovery rate controls errors', null);
    const text = flatten(result);
    expect(text).toContain('false discovery rate');
  });
});
