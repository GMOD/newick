import { preorder } from './reroot.ts'

import type { NewickNode } from './newick.ts'

// a name holding any of these reads back as grammar unless it is quoted
const needsQuotes = /[\s(),:;[\]']/

function quote(name: string) {
  return needsQuotes.test(name) ? `'${name.replaceAll("'", "''")}'` : name
}

/**
 * The tree as a Newick string, which `parseNewick` reads back to the same
 * tree. Each subtree's string is dropped once its parent takes it in, since a
 * caterpillar tree is as deep as it has tips and keeping every one is
 * quadratic.
 */
export function writeNewick(root: NewickNode) {
  const written = new Map<NewickNode, string>()
  for (const node of preorder(root).reverse()) {
    let text = ''
    if (node.children?.length) {
      text = `(${node.children.map(c => written.get(c)!).join(',')})`
      for (const child of node.children) {
        written.delete(child)
      }
    }
    text += quote(node.name ?? '')
    if (node.length !== undefined) {
      text += `:${node.length}`
    }
    written.set(node, text)
  }
  return `${written.get(root)!};`
}
