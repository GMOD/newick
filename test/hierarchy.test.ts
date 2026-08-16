import { describe, expect, test } from 'vitest'

import {
  descendants,
  eachAfter,
  find,
  forEachLink,
  hierarchy,
  leaves,
  links,
  sort,
  sum,
} from '../src/hierarchy.ts'

interface Datum {
  name: string
  children?: Datum[]
  length?: number
}

const kids = (d: Datum) => d.children

function tree(): Datum {
  return {
    name: 'root',
    children: [
      { name: 'a', children: [{ name: 'a1' }, { name: 'a2' }] },
      { name: 'b' },
    ],
  }
}

// (((leaf,leaf),leaf),leaf)... — depth equals leaf count, the shape that
// overflows a recursive traversal
function caterpillar(n: number): Datum {
  let t: Datum = { name: 'l0' }
  for (let i = 1; i < n; i++) {
    t = { name: `i${i}`, children: [t, { name: `l${i}` }] }
  }
  return t
}

describe('hierarchy', () => {
  test('fills in depth, height and parent', () => {
    const root = hierarchy(tree(), kids)
    expect(root.depth).toBe(0)
    expect(root.height).toBe(2)
    expect(root.children![0]!.height).toBe(1)
    expect(root.children![0]!.children![0]!.depth).toBe(2)
    expect(root.children![0]!.children![0]!.parent!.data.name).toBe('a')
    expect(root.parent).toBeNull()
  })

  test('leaves a childless node with null children', () => {
    expect(hierarchy<Datum>({ name: 'solo' }, kids).children).toBeNull()
  })
})

describe('traversals', () => {
  test('descendants is pre-order', () => {
    expect(descendants(hierarchy(tree(), kids)).map(n => n.data.name)).toEqual([
      'root',
      'a',
      'a1',
      'a2',
      'b',
    ])
  })

  test('eachAfter is post-order', () => {
    const seen: string[] = []
    eachAfter(hierarchy(tree(), kids), n => seen.push(n.data.name))
    expect(seen).toEqual(['b', 'a2', 'a1', 'a', 'root'])
  })

  test('leaves is left to right', () => {
    expect(leaves(hierarchy(tree(), kids)).map(n => n.data.name)).toEqual([
      'a1',
      'a2',
      'b',
    ])
  })

  test('links pairs every parent with each child', () => {
    expect(
      links(hierarchy(tree(), kids)).map(
        l => `${l.source.data.name}->${l.target.data.name}`,
      ),
    ).toEqual(['root->a', 'a->a1', 'a->a2', 'root->b'])
  })

  test('forEachLink visits the same pairs without allocating', () => {
    const seen: string[] = []
    forEachLink(hierarchy(tree(), kids), (s, t) => {
      seen.push(`${s.data.name}->${t.data.name}`)
    })
    expect(seen).toEqual(['root->a', 'a->a1', 'a->a2', 'root->b'])
  })

  test('find returns the first pre-order match', () => {
    expect(
      find(hierarchy(tree(), kids), n => n.data.name === 'a2')!.depth,
    ).toBe(2)
    expect(find(hierarchy(tree(), kids), () => false)).toBeUndefined()
  })

  test('sum accumulates children into parents', () => {
    const root = sum(hierarchy(tree(), kids), d => (d.children?.length ? 0 : 1))
    expect(root.value).toBe(3)
    expect(root.children![0]!.value).toBe(2)
  })

  test('sort orders every level in place', () => {
    const root = sort(hierarchy(tree(), kids), (a, b) =>
      b.data.name.localeCompare(a.data.name),
    )
    expect(root.children!.map(c => c.data.name)).toEqual(['b', 'a'])
    expect(root.children![1]!.children!.map(c => c.data.name)).toEqual([
      'a2',
      'a1',
    ])
  })
})

// The reason this package exists rather than a recursive 40-liner: a
// single-linkage dendrogram or a ladderised phylogeny is a caterpillar, and the
// recursive form throws RangeError somewhere around 5000 tips.
describe('deep trees', () => {
  test.each([5_000, 50_000])('survives a %i-tip caterpillar', n => {
    const root = hierarchy(caterpillar(n), kids)
    expect(leaves(root)).toHaveLength(n)
    expect(descendants(root)).toHaveLength(2 * n - 1)
    expect(links(root)).toHaveLength(2 * n - 2)
    expect(root.height).toBe(n - 1)
    expect(sum(root, d => (d.children?.length ? 0 : 1)).value).toBe(n)
    expect(find(root, x => x.data.name === 'l0')!.depth).toBe(n - 1)
  })
})
