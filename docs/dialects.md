# The bare number after a `)`

One token in Newick has two readings, and nothing local to the string tells them
apart. The grammar puts the internal node's _label_ after a `)`, so `95` in
`((A,B)95,(C,D)80);` is a bootstrap support value — a name.

A dendrogram has no branch lengths to record. What defines one of its clusters
is the height at which the cluster merged, a number that belongs to the node
rather than to the edge above it, and writers put that in the same post-paren
slot: `@gmod/hclust` emits `(A,B)1.5`, so there `1.5` is a length.
`parseNewick`'s `postParenNumeric` option exists for the two forms, and its
default resolves them correctly, so you should not normally need to set it.

```js
parseNewick(text, { postParenNumeric: 'name' })
```

| value      | reads `(A,B)1.5` as | use when                                     |
| ---------- | ------------------- | -------------------------------------------- |
| `'auto'`   | either, see below   | you don't know which dialect _(default)_     |
| `'name'`   | `{ name: '1.5' }`   | plain Newick, and the numbers are bootstraps |
| `'length'` | `{ length: 1.5 }`   | `@gmod/hclust` output                        |

## What `'auto'` decides on

A number after a `)` is a length only when the tree contains no `:` branch
length _anywhere_ — the shape hclust writes, and one a real phylogeny
essentially never has. Any `:` in the string and every post-paren number is a
name:

```js
parseNewick('(A,B)1.5;')
// { length: 1.5, children: [{ name: 'A' }, { name: 'B' }] }

parseNewick('((A:1,B:1)95,(C:1,D:1)80);')
// { children: [
//   { name: '95', children: [{ name: 'A', length: 1 }, { name: 'B', length: 1 }] },
//   { name: '80', children: [{ name: 'C', length: 1 }, { name: 'D', length: 1 }] },
// ] }
```

Getting that backwards is not a cosmetic mislabelling. Support values run 0-100,
so reading them as lengths sums them into the branch distances and flattens the
real ones out of the drawing entirely.

## Pinning it

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

## Quoting always wins

A quoted post-paren numeric is a name under every setting, `'length'` included.
Quoting is the writer saying "this is a label", and it is the only way to name a
node something that looks like a number:

```js
parseNewick("(A,B)'1.5';", { postParenNumeric: 'length' })
// { name: '1.5', children: [{ name: 'A' }, { name: 'B' }] }
```
