import React from 'react';
import concepts from '../data/conceptRegistry';
import ConceptLink from '../components/ui/ConceptLink';

// Sort longest-first to avoid partial matches
const sorted = [...concepts].sort((a, b) => b.term.length - a.term.length);

// Build a single regex: (term1|term2|...) with word boundaries where needed
const pattern = sorted
  .map((c) => {
    const escaped = c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return c.wordBoundary ? `\\b${escaped}\\b` : escaped;
  })
  .join('|');

const regex = new RegExp(`(${pattern})`, 'i');

// Map lowercase term → concept for lookup
const termMap = new Map();
for (const c of sorted) {
  const key = c.term.toLowerCase();
  if (!termMap.has(key)) termMap.set(key, c);
}

/**
 * Process React children: scan string children for concept terms and replace
 * first occurrences with <ConceptLink> components. Skips elements with
 * data-no-concept attribute.
 *
 * @param {React.ReactNode} children - The children to process
 * @param {string|null} currentModuleId - Suppress self-links to this module
 * @returns {React.ReactNode}
 */
export function processChildren(children, currentModuleId) {
  const linked = new Set(); // Track first-occurrence-only per call
  return processNode(children, currentModuleId, linked);
}

function processNode(node, currentModuleId, linked) {
  if (node == null || typeof node === 'boolean') return node;

  if (typeof node === 'string') {
    return processString(node, currentModuleId, linked);
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => {
      const result = processNode(child, currentModuleId, linked);
      // Add key to fragments if needed
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
    // Skip elements marked with data-no-concept
    if (node.props?.['data-no-concept']) return node;
    // Don't recurse into ConceptLink itself
    if (node.type === ConceptLink) return node;
    // Recurse into children
    if (node.props?.children) {
      return React.cloneElement(node, {}, processNode(node.props.children, currentModuleId, linked));
    }
  }

  return node;
}

function processString(text, currentModuleId, linked) {
  const parts = [];
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
    const idx = match.index;

    // Add text before match
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    // Check: skip self-links and already-linked terms
    const termKey = concept ? concept.term.toLowerCase() : matchedText.toLowerCase();
    if (!concept || concept.moduleId === currentModuleId || linked.has(termKey)) {
      // Output as plain text
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
        </ConceptLink>
      );
    }

    remaining = remaining.slice(idx + matchedText.length);
  }

  return parts.length === 1 ? parts[0] : parts;
}
