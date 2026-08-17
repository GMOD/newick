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

## Parsing

`parseNewick` produces plain nested objects, and every field is optional. A node
is `{ name?: string, length?: number, children?: NewickNode[] }`, so a node with
no `children` is a leaf and a tree can be one bare node:

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

A bare number after a `)` is the one genuinely ambiguous token — a bootstrap
value in plain Newick, a merge height in `@gmod/hclust` output. The default
reads both correctly:

```js
parseNewick('((A:1,B:1)95,(C:1,D:1)80);') // 95 and 80 are names
parseNewick('(A,B)1.5;') // { length: 1.5, children: [...] }
```

See [docs/dialects.md](docs/dialects.md) for how it decides, and for the
`postParenNumeric` option that pins the reading.

## Walking the tree

`hierarchy` wraps nested data — any nested data, not just Newick — in nodes that
know where they sit:

```js
const root = hierarchy(tree, d => d.children)

root.depth // 0, and 1 for its children
root.height // 2 — edges down to the deepest leaf
root.children[2].data.name // 'E'
root.children[2].parent === root // true
root.children[2].children[0].children // null at a leaf
```

The traversals are free functions taking a node first, so each walks the subtree
under whatever you hand it:

```js
import { descendants, find, leaves, links, sum } from '@gmod/newick'

descendants(root).map(n => n.data.name) // ['F', 'A', 'B', 'E', 'C', 'D']
leaves(root.children[2]).length // 2 — only under E
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

- [docs/hierarchy.md](docs/hierarchy.md) — `hierarchy`, every traversal and the
  order it visits in, and the types that keep a caller's own node type through a
  walk
- [docs/drawing.md](docs/drawing.md) — laying out and drawing a dendrogram or
  phylogram on a canvas
- [docs/dialects.md](docs/dialects.md) — the bare-number-after-`)` ambiguity and
  the `postParenNumeric` option

## License

MIT
