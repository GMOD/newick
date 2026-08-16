# @gmod/newick

Newick parsing and stack-safe tree traversals. No dependencies.

Extracted from the two implementations that had drifted apart in
[react-msaview](https://github.com/GMOD/JBrowseMSA) and
[jbrowse-components](https://github.com/GMOD/jbrowse-components) — each had
fixed a bug the other still has.

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

## Why this exists

**Quoted labels are grammar, not decoration.** A leaf name is an arbitrary
string out of somebody's data file. Split the input on the grammar characters
with a regex and a label holding a `,` becomes two leaves — the tree comes back
the wrong _shape_, and every row below the split is labelled with its
neighbour's name. `parseNewick` scans rather than splits, so `'has, a comma'`
and `'chr1:100-200'` survive.

**Trees get deep.** A single-linkage dendrogram or a ladderised phylogeny is a
caterpillar: its depth equals its leaf count. Recursive traversals throw
`RangeError: Maximum call stack size exceeded` somewhere around 5000 tips. Every
traversal here is iterative, and the tests run against a 50,000-tip caterpillar.

## Newick

```js
parseNewick(text, options?)
```

Returns `{ name?, length?, children? }`.

Handles `(A:0.1,B:0.2)F`, `(A:0.1,B:0.2)F:0.5`, `(A,B)Foo`, `(A,B)1.5`,
single-quoted labels with `''` for a literal quote, unlabelled nodes, and a
whole tree that is one bare node (`A;`).

### `postParenNumeric`

A bare number after a `)` is ambiguous, and nothing in the string resolves it.
The Newick grammar puts the internal node's _label_ there, so `95` in
`((A,B)95,(C,D)80);` is a bootstrap support value. `@gmod/hclust` reuses the
same slot for a cluster's absolute merge height and never emits a `:`, so for
that dialect it is a length.

| value      | behaviour                                                        |
| ---------- | ---------------------------------------------------------------- |
| `'auto'`   | length only when the tree has no `:` length anywhere _(default)_ |
| `'name'`   | always a name — plain Newick                                     |
| `'length'` | always a length — `@gmod/hclust` output                          |

A _quoted_ post-paren numeric is always a name, under every setting: quoting is
the writer saying "this is a label", and it is the only way to name a node
something that looks like a number.

## Hierarchy

`hierarchy(data, childrenAccessor)` wraps plain data in nodes carrying `data`,
`children`, `parent`, `depth` and `height`.

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
