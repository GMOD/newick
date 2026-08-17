# @gmod/newick

[![NPM version](https://img.shields.io/npm/v/@gmod/newick.svg?style=flat-square)](https://npmjs.org/package/@gmod/newick)
[![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/newick/publish.yml?branch=main)](https://github.com/GMOD/newick/actions/workflows/publish.yml)

Newick parsing and small tree utilities. No dependencies.

```sh
npm install @gmod/newick
```

```js
import { hierarchy, leaves, parseNewick } from '@gmod/newick'

const tree = parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;')
// { name: 'F', children: [
//   { name: 'A', length: 0.1 },
//   { name: 'B', length: 0.2 },
//   { name: 'E', length: 0.5, children: [
//     { name: 'C', length: 0.3 },
//     { name: 'D', length: 0.4 },
//   ] },
// ] }

const root = hierarchy(tree, d => d.children)
leaves(root).map(n => n.data.name) // ['A', 'B', 'C', 'D']
```

[react-msaview](https://github.com/GMOD/JBrowseMSA) and
[jbrowse-components](https://github.com/GMOD/jbrowse-components) use it for the
parts of `d3-hierarchy` they needed, without the pure ESM requirement and with
[somewhat simpler types](docs/hierarchy.md#types).

Every field `parseNewick` produces is optional — a node is
`{ name?: string, length?: number, children?: NewickNode[] }` — so a node with
no `children` is a leaf, and a whole tree can be one bare node:

```js
parseNewick('A;') // { name: 'A' }
parseNewick('(A,B)Foo;') // { name: 'Foo', children: [{ name: 'A' }, { name: 'B' }] }
parseNewick('(A:0.1,B:0.2)F:0.5;')
// { name: 'F', length: 0.5, children: [
//   { name: 'A', length: 0.1 },
//   { name: 'B', length: 0.2 },
// ] }
```

Single-quoted labels keep a name containing `,`, `:` or parens in one piece,
with `''` for a literal quote. Without them a comma inside a label splits one
leaf into two, which returns the wrong _tree_ rather than merely a bad name:

```js
parseNewick("('A,x','B (y)','it''s')Root;")
// { name: 'Root', children: [
//   { name: 'A,x' },
//   { name: 'B (y)' },
//   { name: "it's" },
// ] }
```

A bare number after a `)` sits in the grammar's label slot, so in a phylogeny it
is a bootstrap support value. A tree carrying no `:` branch length _anywhere_ is
not a phylogeny, though — it is a dendrogram, where that number is the height
the cluster merged at — and `parseNewick` reads the two accordingly:

```js
parseNewick('((A:1,B:1)95,(C:1,D:1)80);') // 95 and 80 are names
parseNewick('(A,B)1.5;') // { length: 1.5, children: [{ name: 'A' }, { name: 'B' }] }
```

[docs/dialects.md](docs/dialects.md) covers which writers produce which form,
and the `postParenNumeric` option that pins the reading rather than inferring
it.

`hierarchy` wraps nested data — any nested data, not just Newick — in nodes that
know where they sit. `depth` counts edges down from the root and `height` counts
edges down to the deepest leaf beneath the node, both filled in for every node
up front:

```js
const root = hierarchy(
  parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;'),
  d => d.children,
)

// F        depth 0, height 2
// ├─ A     depth 1, height 0
// ├─ B     depth 1, height 0
// └─ E     depth 1, height 1
//    ├─ C  depth 2, height 0
//    └─ D  depth 2, height 0

const e = root.children[2]
e.data.name // 'E'
e.depth // 1
e.height // 1
e.parent === root // true
e.children[0].data.name // 'C'
e.children[0].depth // 2
e.children[0].children // null — a leaf, not an empty array
```

The traversals are free functions taking a node first, so each walks the subtree
under whatever you hand it — against that same tree:

```js
import { descendants, find, leaves, links, sum } from '@gmod/newick'

descendants(root).map(n => n.data.name) // ['F', 'A', 'B', 'E', 'C', 'D']
leaves(root).map(n => n.data.name) // ['A', 'B', 'C', 'D']
leaves(e).map(n => n.data.name) // ['C', 'D'] — only under E
links(root).length // 5 — { source, target } per branch
find(root, n => n.data.name === 'C').data.length // 0.3
sum(root, d => (d.children ? 0 : 1)).value // 4 — leaves under the root
```

Two more, `eachAfter` and `sort`, plus the allocation-free `forEachDescendant`
and `forEachLink`, are in [docs/hierarchy.md](docs/hierarchy.md) with the order
each one visits in. Every traversal is iterative, so a deep tree does not
overflow the stack — a dendrogram can be nearly as deep as it has leaves.

What is not here: the layout algorithms (`cluster`, `tree`, `treemap`, `pack`,
`partition`) and `stratify`. Use `d3-hierarchy` if you want those — though a
dendrogram layout is a dozen lines against these traversals, which
[docs/drawing.md](docs/drawing.md) works through.

## Docs

- [docs/hierarchy.md](docs/hierarchy.md) — `hierarchy` and traversal helper
  functions
- [docs/drawing.md](docs/drawing.md) — laying out and drawing a dendrogram or
  phylogram on a canvas
- [docs/dialects.md](docs/dialects.md) — the bare-number-after-`)` ambiguity and
  the `postParenNumeric` option

## License

MIT
