# @gmod/newick

[![NPM version](https://img.shields.io/npm/v/@gmod/newick.svg?style=flat-square)](https://npmjs.org/package/@gmod/newick)
[![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/newick/publish.yml?branch=main)](https://github.com/GMOD/newick/actions/workflows/publish.yml)

Newick parsing and small tree utilities. No dependencies.

Used by [react-msaview](https://github.com/GMOD/JBrowseMSA) and
[jbrowse-components](https://github.com/GMOD/jbrowse-components), which wanted
the parts of `d3-hierarchy` they used without the pure ESM requirement, and
somewhat simpler typescript types.

```sh
npm install @gmod/newick
```

```js
import { hierarchy, leaves, links, parseNewick } from '@gmod/newick'

const root = hierarchy(
  parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;'),
  d => d.children,
)
leaves(root).map(n => n.data.name) // ['A', 'B', 'C', 'D']
```

Two things worth knowing, since both differ from the obvious implementation: the
traversals are iterative, so a deep tree does not overflow the stack (a
dendrogram can be nearly as deep as it has leaves), and the parser reads
single-quoted labels, so a name containing a `,` or a `:` stays one label.

## Drawing one

There is no layout function here, because a layout is a dozen lines once you
have the traversals. Leaves get evenly spaced rows and an internal node sits at
the mean of its children, which is what `eachAfter` is for — a parent has to be
placed after the children it averages:

```js
const root = hierarchy(parseNewick(text), d => d.children)

const rows = leaves(root)
rows.forEach((leaf, i) => {
  leaf.y = (i + 0.5) * (height / rows.length)
})
eachAfter(root, n => {
  if (n.children) {
    n.y = n.children.reduce((total, c) => total + c.y, 0) / n.children.length
  }
  n.x = n.depth * 40
})

// one elbow per branch: down the parent's column, then across to the child
ctx.beginPath()
for (const { source, target } of links(root)) {
  ctx.moveTo(source.x, source.y)
  ctx.lineTo(source.x, target.y)
  ctx.lineTo(target.x, target.y)
}
ctx.stroke()

for (const leaf of rows) {
  ctx.fillText(leaf.data.name, leaf.x + 4, leaf.y + 4)
}
```

Swap `n.depth * 40` for a cumulative branch-length sum to get a phylogram
instead of a cladogram.

## Newick

```js
parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;')
// { name: 'F', children: [
//   { name: 'A', length: 0.1 },
//   { name: 'B', length: 0.2 },
//   { name: 'E', length: 0.5, children: [
//     { name: 'C', length: 0.3 },
//     { name: 'D', length: 0.4 },
//   ] },
// ] }
```

Every field is optional: a node is
`{ name?: string, length?: number, children?: NewickNode[] }`, and a node with
no `children` is a leaf. The parser handles `(A:0.1,B:0.2)F`,
`(A:0.1,B:0.2)F:0.5`, `(A,B)Foo`, `(A,B)1.5`, single-quoted labels with `''` for
a literal quote, unlabelled nodes, and a whole tree that is one bare node
(`A;`).

Nothing else in this package is Newick-specific — `hierarchy` takes any nested
data — so pass the result on if you want `parent`, `depth` and the traversals.

### The `postParenNumeric` option

You should not need this. It exists for one ambiguity, and the default resolves
that ambiguity correctly for both dialects that produce it.

A bare number after a `)` has two readings. The Newick grammar puts the internal
node's _label_ there, so `95` in `((A,B)95,(C,D)80);` is a bootstrap support
value — a name. But `@gmod/hclust` reuses the same slot for a cluster's merge
height, so `1.5` in `(A,B)1.5;` is a length. Nothing in the string tells the two
apart, which is why this is a parameter rather than a guess.

```js
parseNewick(text, { postParenNumeric: 'name' })
```

| value      | reads `(A,B)1.5` as | use when                                     |
| ---------- | ------------------- | -------------------------------------------- |
| `'auto'`   | either, see below   | you don't know which dialect _(default)_     |
| `'name'`   | `{ name: '1.5' }`   | plain Newick, and the numbers are bootstraps |
| `'length'` | `{ length: 1.5 }`   | `@gmod/hclust` output                        |

`'auto'` reads the number as a length only when the tree contains no `:` branch
length _anywhere_, which is the shape hclust writes and one a real phylogeny
essentially never has. Reach for `'name'` or `'length'` when you know what wrote
the file and want the reading pinned rather than inferred.

A quoted post-paren numeric is always a name, under every setting — quoting is
the writer saying "this is a label", and it is the only way to name a node
something that looks like a number.

## Hierarchy

`hierarchy(data, childrenAccessor)` wraps plain nested data in nodes that know
where they sit in the tree:

```js
const root = hierarchy(parseNewick(text), d => d.children)
// { data, children, parent, depth, height }
```

`data` is the original object, `children` is `null` at a leaf, `parent` is
`null` at the root, `depth` counts edges down from the root, and `height` counts
edges down to the deepest leaf. The second argument pulls the child array off
your data, so any nested shape works — `d => d.items` for something that is not
Newick at all.

Everything below takes such a node as its first argument and walks the subtree
under it, so passing a non-root node traverses only that branch. These are the
same operations `d3-hierarchy` offers, as free functions rather than methods —
`leaves(root)` instead of `root.leaves()`.

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

Which traversal you want usually follows from the direction the information
flows. Reading a parent's value into its children (an inherited x position, a
colour) wants `descendants`; deriving a parent's value from its children (the
mean y in the drawing above, a subtree count) wants `eachAfter`, since the
children must already be done.

```js
find(root, n => n.data.name === 'C') // the node for leaf C
sum(root, d => (d.children ? 0 : 1)) // root.value is now the leaf count
sort(root, (a, b) => a.data.name.localeCompare(b.data.name))
forEachLink(root, (source, target) => drawBranch(source, target))
```

What is not here: the layout algorithms (`cluster`, `tree`, `treemap`, `pack`,
`partition`) and `stratify`. If you want those, use `d3-hierarchy`.

The traversals are generic over the _node_ type rather than its data, so a
caller that extends `HierarchyNode` with its own layout fields gets its own type
back:

```ts
interface MyNode extends HierarchyNode<Datum> {
  children: MyNode[] | null
  x?: number
}
leaves(myRoot) // MyNode[], not HierarchyNode<Datum>[]
```

## License

MIT
