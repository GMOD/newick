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

Square brackets are a comment, and the parser drops what is inside them. NHX and
BEAST put their per-node metadata in brackets, and without the drop the parser
would read the `:` characters inside an `[&&NHX:...]` block as branch lengths:

```js
parseNewick('(A:0.1[&&NHX:S=human],B:0.2[&&NHX:S=mouse]);')
// { children: [{ name: 'A', length: 0.1 }, { name: 'B', length: 0.2 }] }
```

A bare number after a `)` is a bootstrap value (a name) in a phylogeny, but a
cluster height (a `length`) in a dendrogram. `parseNewick` reads it as a
`length` only when the tree has no `:` branch length anywhere:

```js
parseNewick('((A:1,B:1)95,(C:1,D:1)80);') // 95 and 80 are names
parseNewick('(A,B)1.5;') // { length: 1.5, children: [{ name: 'A' }, { name: 'B' }] }
```

The `postParenNumeric` option pins the reading; see
[docs/dialects.md](docs/dialects.md).

`hierarchy` wraps any nested data, Newick or otherwise, in nodes with `parent`,
`depth` and `height`. The traversals are free functions that walk the subtree
under the node you pass:

```js
import { descendants, find, leaves, links, sum } from '@gmod/newick'

const root = hierarchy(
  parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;'),
  d => d.children,
)
const e = root.children[2]

descendants(root).map(n => n.data.name) // ['F', 'A', 'B', 'E', 'C', 'D']
leaves(root).map(n => n.data.name) // ['A', 'B', 'C', 'D']
leaves(e).map(n => n.data.name) // ['C', 'D'] — only under E
links(root).length // 5 — { source, target } per branch
find(root, n => n.data.name === 'C').data.length // 0.3
sum(root, d => (d.children ? 0 : 1)).value // 4 — leaves under the root
```

[docs/hierarchy.md](docs/hierarchy.md) covers `eachAfter`, `sort`, the
allocation-free `forEachDescendant` and `forEachLink`, and each one's visit
order. Every traversal is iterative, so a deep tree does not overflow the stack.

`@gmod/newick` has no layout algorithms or `stratify`; use `d3-hierarchy` for
those. [docs/drawing.md](docs/drawing.md) builds a dendrogram layout in a dozen
lines.

## Docs

- [docs/hierarchy.md](docs/hierarchy.md) — `hierarchy` and traversal helper
  functions
- [docs/drawing.md](docs/drawing.md) — laying out and drawing a dendrogram or
  phylogram on a canvas
- [docs/dialects.md](docs/dialects.md) — the bare-number-after-`)` ambiguity and
  the `postParenNumeric` option

## License

MIT
