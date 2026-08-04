import type { BodySelection } from '../types'

/**
 * Map a DOM Selection inside `[data-body]` to plain-body string offsets.
 * Walks text nodes under the body root in document order.
 */
export function captureBodySelection(bodyRoot: HTMLElement): BodySelection | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

  const range = sel.getRangeAt(0)
  if (!bodyRoot.contains(range.commonAncestorContainer)) return null

  const text = sel.toString().replace(/\u00a0/g, ' ')
  if (!text.trim()) return null

  const start = offsetInBody(bodyRoot, range.startContainer, range.startOffset)
  const end = offsetInBody(bodyRoot, range.endContainer, range.endOffset)
  if (start === null || end === null || start === end) return null

  const a = Math.min(start, end)
  const b = Math.max(start, end)
  return { start: a, end: b, text: bodyRoot.textContent?.slice(a, b) ?? text }
}

function offsetInBody(root: HTMLElement, node: Node, offset: number): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let total = 0
  let current: Node | null = walker.nextNode()

  while (current) {
    if (current === node) {
      return total + offset
    }
    // Selection may land in an element; resolve via comparing positions
    total += current.textContent?.length ?? 0
    current = walker.nextNode()
  }

  // If node is an element child of root, compute via range
  try {
    const pre = document.createRange()
    pre.selectNodeContents(root)
    pre.setEnd(node, offset)
    return pre.toString().length
  } catch {
    return null
  }
}

export function selectionRectsRelativeTo(
  anchor: HTMLElement,
): { top: number; left: number; bottom: number; height: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  const parent = anchor.getBoundingClientRect()
  return {
    top: rect.top - parent.top + anchor.scrollTop,
    left: rect.left - parent.left + anchor.scrollLeft,
    bottom: rect.bottom - parent.top + anchor.scrollTop,
    height: rect.height,
  }
}
