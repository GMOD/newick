# The bare number after a `)`

One token in Newick has two readings, and the string alone does not distinguish
them. The grammar puts the internal node's _label_ after a `)`, so `95` in
`((A,B)95,(C,D)80);` is a bootstrap support value — a name.

A dendrogram's cluster height, the value at which the cluster merged, describes
the node rather than the edge above it. Some writers put that height after the
`)` as well, so in `(A,B)1.5;` from such a writer, `1.5` is a length.
`@gmod/hclust` wrote that form through v4. It switched to `:` branch lengths in
v5 because everywhere else a numeric internal label means a bootstrap value, and
strings written by the older versions are still around. `parseNewick`'s
`postParenNumeric` option chooses between the two readings, and its default
reads both forms correctly, so you should not normally need to set it.

```js
parseNewick(text, { postParenNumeric: 'name' })
```

| value      | reads `(A,B)1.5` as | use when                                     |
| ---------- | ------------------- | -------------------------------------------- |
| `'auto'`   | either, see below   | you don't know which dialect _(default)_     |
| `'name'`   | `{ name: '1.5' }`   | plain Newick, and the numbers are bootstraps |
| `'length'` | `{ length: 1.5 }`   | dendrogram output, e.g. `@gmod/hclust` v4    |

## What `'auto'` decides on

`'auto'` reads a number after a `)` as a length only when the tree contains no
`:` branch length _anywhere_. A writer that puts heights in the label produces
that pattern, and a real phylogeny essentially never has it. If the string
contains any `:`, every number after a `)` is a name:

```js
parseNewick('(A,B)1.5;')
// { length: 1.5, children: [{ name: 'A' }, { name: 'B' }] }

parseNewick('((A:1,B:1)95,(C:1,D:1)80);')
// { children: [
//   { name: '95', children: [{ name: 'A', length: 1 }, { name: 'B', length: 1 }] },
//   { name: '80', children: [{ name: 'C', length: 1 }, { name: 'D', length: 1 }] },
// ] }
```

Support values run 0-100, so a parser that read them as lengths would add them
to the branch distances, and next to those values the real branch lengths would
shrink to nothing in the drawing.

## Setting the option

Set the option when you know what wrote the file and want the reading fixed
rather than inferred:

```js
parseNewick('(A,B)1.5;', { postParenNumeric: 'name' })
// { name: '1.5', children: [{ name: 'A' }, { name: 'B' }] }

parseNewick('((A:1,B:1)95,(C:1,D:1)80);', { postParenNumeric: 'length' })
// { children: [
//   { length: 95, children: [{ name: 'A', length: 1 }, { name: 'B', length: 1 }] },
//   { length: 80, children: [{ name: 'C', length: 1 }, { name: 'D', length: 1 }] },
// ] }
```

## Quoted numbers

A quoted number after a `)` is a name under every setting, `'length'` included.
A writer quotes a label to mark it as a label, and quoting is the only way to
give a node a name that looks like a number:

```js
parseNewick("(A,B)'1.5';", { postParenNumeric: 'length' })
// { name: '1.5', children: [{ name: 'A' }, { name: 'B' }] }
```
