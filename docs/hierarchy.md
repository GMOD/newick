# Walking a tree

`@gmod/newick` carries the `d3-hierarchy` traversals a tree viewer actually
needs, as free functions rather than methods — `leaves(root)` instead of
`root.leaves()`. Nothing about them is Newick-specific: `hierarchy` takes any
nested data, so the walks below apply to whatever shape you hand it.

Every traversal here is iterative, over an explicit stack. That matters more
than it sounds: a phylogeny or a single-linkage dendrogram can be a caterpillar,
as deep as it has leaves, and the recursive form throws
`RangeError: Maximum call stack size exceeded` at around 5000 tips.

## `hierarchy`

`hierarchy(data, childrenAccessor)` wraps plain nested data in nodes that know
where they sit in the tree. The accessor pulls the child array off your data, so
`d => d.items` works as well as `d => d.children`.

```js
import { hierarchy, parseNewick } from '@gmod/newick'

const root = hierarchy(
  parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;'),
  d => d.children,
)

root.data.name // 'F' — the original object, untouched
root.parent // null at the root
root.depth // 0 — edges down from the root
root.height // 2 — edges down to the deepest leaf

const e = root.children[2]
e.data.name // 'E'
e.depth // 1
e.height // 1
e.parent === root // true
e.children[0].children // null at a leaf, not []
```

## The traversals

Each one takes a node as its first argument and walks the subtree under it, so
passing a non-root node traverses only that branch.

| call                          | returns                                                                          | order                                                 |
| ----------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `descendants(node)`           | the node and everything under it                                                 | pre-order — a parent before its children              |
| `forEachDescendant(node, cb)` | nothing; calls `cb(n)`                                                           | same, without building the array                      |
| `eachAfter(node, cb)`         | nothing; calls `cb(n)`                                                           | post-order — children, left to right, then the parent |
| `leaves(node)`                | the childless nodes                                                              | left to right                                         |
| `links(node)`                 | `{ source, target }` per branch                                                  | depth-first, left to right                            |
| `forEachLink(node, cb)`       | nothing; calls `cb(source, target)`                                              | same, without building the array                      |
| `find(node, predicate)`       | the first match, or `undefined`                                                  | pre-order                                             |
| `sum(node, valueFn)`          | `node`, with `.value` set on every node to `valueFn(n.data)` plus its children's | post-order                                            |
| `sort(node, compareFn)`       | `node`, with every level's children sorted in place                              | —                                                     |

Against the same `root` as above:

```js
descendants(root).map(n => n.data.name) // ['F', 'A', 'B', 'E', 'C', 'D']
leaves(root).map(n => n.data.name) // ['A', 'B', 'C', 'D']
leaves(root.children[2]).map(n => n.data.name) // ['C', 'D']

links(root).map(l => `${l.source.data.name}->${l.target.data.name}`)
// ['F->A', 'F->B', 'F->E', 'E->C', 'E->D']

find(root, n => n.data.name === 'C').data.length // 0.3
find(root, n => n.data.name === 'Z') // undefined

const names = []
eachAfter(root, n => names.push(n.data.name))
names // ['A', 'B', 'C', 'D', 'E', 'F']

sum(root, d => (d.children ? 0 : 1)).value // 4 — leaves under the root
root.children[2].value // 2 — and under E

sort(root, (a, b) => b.data.name.localeCompare(a.data.name))
root.children.map(n => n.data.name) // ['E', 'B', 'A']
```

`forEachDescendant` and `forEachLink` are the same walks without the
intermediate array, for a render loop that would throw it away:

```js
forEachLink(root, (source, target) => drawBranch(source, target))
```

## Picking one

Which traversal you want usually follows from the direction the information
flows. Reading a parent's value down into its children — an inherited x
position, a colour — wants `descendants` or `forEachDescendant`, since a parent
is visited first. Deriving a parent's value from its children — a subtree count,
the mean y in [docs/drawing.md](drawing.md) — wants `eachAfter`, since the
children must already be done.

`eachAfter` is not `descendants().reverse()`. Both put children before parents,
but the reversal walks siblings right to left, which shows up the moment a
callback depends on sibling order.

## Types

There are three: `HierarchyNode<Datum>`, `HierarchyLink<Node>`, and
`TreeLike<Node>`, which is all a traversal asks of a node:

```ts
interface TreeLike<N> {
  children: N[] | null
}
```

Every traversal is generic over the _node_ rather than over its data —
`descendants<N extends TreeLike<N>>(node: N): N[]` — so a caller that extends
`HierarchyNode` with its own layout fields gets that type back, and a nested
shape that is not a `HierarchyNode` at all still walks:

```ts
interface MyNode extends HierarchyNode<Datum> {
  children: MyNode[] | null
  x?: number
  y?: number
}

declare const myRoot: MyNode
leaves(myRoot) // MyNode[], not HierarchyNode<Datum>[]
leaves(myRoot)[0].x // fine, no cast
```

`d3-hierarchy` preserves subtypes too, but its traversals are methods on a node
class, so it does the job with polymorphic `this` instead of a generic
parameter. That mechanism costs its node interface a `new(data: Datum): this`
constructor signature to hold the trick together, and it means the layouts'
`x`/`y` have to live on the base node because there is nowhere else to put them.
It also carries a `this`-binding convention through every traversal —
`each<T = undefined>(func: (this: T, node: this, index: number, thisNode: this) => void, that?: T): this`
against our `forEachDescendant(node, cb)`. Free functions over a bare structural
constraint need none of that: extend the node in your own file and the
traversals follow, no module augmentation.

Do not read `@types/d3-hierarchy`'s 928 lines as a like-for-like count against
the three types here, though — most of them are the layouts and `stratify`,
which this package does not have.
