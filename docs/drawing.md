# Drawing a tree

There is no layout function in `@gmod/newick`, because a dendrogram layout is a
dozen lines once you have the traversals. Leaves get evenly spaced rows and an
internal node sits at the mean of its children's rows, which is what `eachAfter`
is for — a parent has to be placed after the children it averages.

```js
import { eachAfter, hierarchy, leaves, links, parseNewick } from '@gmod/newick'

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

Run that over `'(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;'` in a 200px-tall canvas and
the four leaves land on evenly spaced rows, `E` on the mean of `C` and `D`, and
the root on the mean of `A`, `B` and `E`:

```js
// x = depth * 40      y
//
// F                   83.33  ← (25 + 75 + 150) / 3
// ├─ A     x 40        25
// ├─ B     x 40        75
// └─ E     x 40       150    ← (125 + 175) / 2
//    ├─ C  x 80       125
//    └─ D  x 80       175

leaves(root).map(n => [n.x, n.y]) // [[40, 25], [40, 75], [80, 125], [80, 175]]
root.children[2].y // 150
root.y // 83.33333333333333
```

Note `F` sits at `83.33` rather than halfway down the canvas: an internal node
averages its immediate children, not its leaves, so a lopsided tree pulls its
ancestors toward the side carrying more branches.

Two variations worth knowing. Swapping `n.depth * 40` for a cumulative
branch-length sum turns the cladogram into a phylogram, where a branch's drawn
length is the evolutionary distance it carries:

```js
eachAfter(root, n => {
  /* y as above */
})
forEachDescendant(root, n => {
  n.x = (n.parent ? n.parent.x : 0) + (n.data.length ?? 0) * scale
})
```

That second walk has to be pre-order — `forEachDescendant`, not `eachAfter` —
because each node reads its position from its parent, which must already be
placed. And swapping the elbows for `ctx.lineTo(target.x, target.y)` alone gives
straight diagonal branches instead of the rectangular dendrogram style.
