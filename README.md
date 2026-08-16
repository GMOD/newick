# @gmod/newick

Newick parsing and small tree utilities. No dependencies.

Used by [react-msaview](https://github.com/GMOD/JBrowseMSA) and
[jbrowse-components](https://github.com/GMOD/jbrowse-components), which wanted
the parts of `d3-hierarchy` they used without taking the dependency.

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
parseNewick(text, options?)
```

Returns `{ name?, length?, children? }`.

Handles `(A:0.1,B:0.2)F`, `(A:0.1,B:0.2)F:0.5`, `(A,B)Foo`, `(A,B)1.5`,
single-quoted labels with `''` for a literal quote, unlabelled nodes, and a
whole tree that is one bare node (`A;`).

### `postParenNumeric`

A bare number after a `)` is ambiguous. Newick puts the internal node's _label_
there, so `95` in `((A,B)95,(C,D)80);` is a bootstrap value, but `@gmod/hclust`
reuses the slot for a cluster's merge height. Nothing in the string tells them
apart, hence the option.

| value      | behaviour                                                        |
| ---------- | ---------------------------------------------------------------- |
| `'auto'`   | length only when the tree has no `:` length anywhere _(default)_ |
| `'name'`   | always a name — plain Newick                                     |
| `'length'` | always a length — `@gmod/hclust` output                          |

A quoted post-paren numeric is always a name, under every setting — it is the
only way to name a node something that looks like a number.

## Hierarchy

`hierarchy(data, childrenAccessor)` wraps plain data in nodes carrying `data`,
`children`, `parent`, `depth` and `height`.

These are the same operations `d3-hierarchy` offers, as free functions rather
than methods on the node — `leaves(root)` instead of `root.leaves()`. What is
not here: the layout algorithms (`cluster`, `tree`, `treemap`, `pack`,
`partition`) and `stratify`. If you want those, use `d3-hierarchy`.

| function                            | order                                  |
| ----------------------------------- | -------------------------------------- |
| `descendants` / `forEachDescendant` | pre-order (parents first)              |
| `eachAfter`                         | post-order (children first)            |
| `leaves`                            | left to right                          |
| `links` / `forEachLink`             | depth-first, left to right             |
| `find`                              | first pre-order match                  |
| `sum`                               | accumulates children into `node.value` |
| `sort`                              | sorts every level in place             |

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
