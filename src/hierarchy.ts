/**
 * The d3-hierarchy traversals a tree viewer actually needs, without the
 * dependency.
 *
 * Every traversal here is iterative (an explicit stack, or a reversed pre-order
 * walk) rather than recursive. That is the whole point of the file: a
 * phylogenetic tree or a single-linkage dendrogram can be a caterpillar, whose
 * depth equals its leaf count, and the recursive form throws
 * `RangeError: Maximum call stack size exceeded` somewhere around 5000 tips.
 */

export interface HierarchyNode<T> {
  data: T
  children: HierarchyNode<T>[] | null
  parent: HierarchyNode<T> | null
  depth: number
  height: number
  /** set by `sum`, and otherwise absent */
  value?: number
}

export interface HierarchyLink<N> {
  source: N
  target: N
}

/**
 * What a traversal needs of a node, and the whole of it.
 *
 * The traversals are generic over the *node* type rather than over its data —
 * `N extends TreeLike<N>` — so a caller that extends HierarchyNode with its own
 * layout fields gets its own type back instead of the base one, and a shape
 * that is not a HierarchyNode at all still walks.
 */
export interface TreeLike<N> {
  children: N[] | null
}

/** A node `sum` can write to. */
interface Summable<N> extends TreeLike<N> {
  data: unknown
  value?: number
}

function pushChildren<N extends TreeLike<N>>(stack: N[], node: N) {
  if (node.children) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]!)
    }
  }
}

/**
 * Pre-order: every parent precedes all of its descendants. Iterating the result
 * in reverse therefore yields a valid post-order (children before parents),
 * which the accumulation helpers rely on.
 */
export function descendants<N extends TreeLike<N>>(node: N): N[] {
  const result: N[] = []
  forEachDescendant(node, n => {
    result.push(n)
  })
  return result
}

export function forEachDescendant<N extends TreeLike<N>>(
  node: N,
  cb: (n: N) => void,
) {
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    cb(n)
    pushChildren(stack, n)
  }
}

export function leaves<N extends TreeLike<N>>(node: N): N[] {
  const result: N[] = []
  forEachDescendant(node, n => {
    if (!n.children) {
      result.push(n)
    }
  })
  return result
}

/**
 * Every parent->child edge, depth-first and left to right, so a link's whole
 * subtree is visited before its next sibling.
 *
 * The parent travels on the stack rather than being read back off the node, so
 * this works for a node type that carries no `parent` pointer.
 */
export function forEachLink<N extends TreeLike<N>>(
  node: N,
  cb: (source: N, target: N) => void,
) {
  const stack: { source: N | null; target: N }[] = [
    { source: null, target: node },
  ]
  while (stack.length > 0) {
    const { source, target } = stack.pop()!
    if (source) {
      cb(source, target)
    }
    if (target.children) {
      for (let i = target.children.length - 1; i >= 0; i--) {
        stack.push({ source: target, target: target.children[i]! })
      }
    }
  }
}

export function links<N extends TreeLike<N>>(node: N): HierarchyLink<N>[] {
  const result: HierarchyLink<N>[] = []
  forEachLink(node, (source, target) => {
    result.push({ source, target })
  })
  return result
}

/**
 * Post-order: a node's children, left to right, then the node.
 *
 * Not `descendants().reverse()`, which also puts children before parents but
 * walks siblings right to left. Reversing a pre-order that pushes children
 * left-to-right (so the rightmost pops first) gives the real thing.
 */
export function eachAfter<N extends TreeLike<N>>(node: N, cb: (n: N) => void) {
  const order: N[] = []
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    order.push(n)
    if (n.children) {
      for (const child of n.children) {
        stack.push(child)
      }
    }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    cb(order[i]!)
  }
}

function computeHeight<T>(node: HierarchyNode<T>) {
  eachAfter(node, n => {
    let h = 0
    if (n.children) {
      for (const child of n.children) {
        if (child.height + 1 > h) {
          h = child.height + 1
        }
      }
    }
    n.height = h
  })
}

/** Wrap plain data in hierarchy nodes, filling in depth, height and parent. */
export function hierarchy<T>(
  data: T,
  childrenAccessor: (d: T) => T[] | undefined | null,
): HierarchyNode<T> {
  const root: HierarchyNode<T> = {
    data,
    children: null,
    parent: null,
    depth: 0,
    height: 0,
  }
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    const kids = childrenAccessor(node.data)
    if (kids?.length) {
      node.children = kids.map(d => ({
        data: d,
        children: null,
        parent: node,
        depth: node.depth + 1,
        height: 0,
      }))
      for (const child of node.children) {
        stack.push(child)
      }
    }
  }
  computeHeight(root)
  return root
}

/**
 * Accumulate a value up the tree, each node summing its children's.
 *
 * One type parameter, with the datum reached through `N['data']`: a second one
 * for the datum cannot be inferred from the arguments, so callers would have to
 * write both out or get `unknown` in the callback.
 */
export function sum<N extends Summable<N>>(
  node: N,
  valueFn: (d: N['data']) => number,
): N {
  eachAfter(node, n => {
    let s = valueFn(n.data)
    if (n.children) {
      for (const child of n.children) {
        s += child.value!
      }
    }
    n.value = s
  })
  return node
}

/** Sort every node's children in place. */
export function sort<N extends TreeLike<N>>(
  node: N,
  compareFn: (a: N, b: N) => number,
): N {
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    if (n.children) {
      n.children.sort(compareFn)
      for (const child of n.children) {
        stack.push(child)
      }
    }
  }
  return node
}

/** First node matching the predicate, in pre-order. */
export function find<N extends TreeLike<N>>(
  node: N,
  predicate: (n: N) => boolean,
): N | undefined {
  const stack = [node]
  while (stack.length > 0) {
    const n = stack.pop()!
    if (predicate(n)) {
      return n
    }
    pushChildren(stack, n)
  }
  return undefined
}
