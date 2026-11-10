import { describe, expect, test } from 'vitest'

import parseNewick from '../src/newick.ts'
import { writeNewick } from '../src/write.ts'

import type { NewickNode } from '../src/newick.ts'

describe('writeNewick', () => {
  test('writes names, lengths and nesting', () => {
    expect(
      writeNewick({
        name: 'F',
        children: [
          { name: 'A', length: 0.1 },
          { name: 'B', length: 0.2 },
          {
            name: 'E',
            length: 0.5,
            children: [
              { name: 'C', length: 0.3 },
              { name: 'D', length: 0.4 },
            ],
          },
        ],
      }),
    ).toBe('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;')
  })

  test('leaves unnamed nodes empty', () => {
    expect(writeNewick({ children: [{ name: 'A' }, { name: 'B' }] })).toBe(
      '(A,B);',
    )
  })

  test('quotes a name holding Newick punctuation, doubling its quotes', () => {
    expect(
      writeNewick({
        children: [{ name: 'A (x)' }, { name: 'B,y' }, { name: "it's" }],
      }),
    ).toBe("('A (x)','B,y','it''s');")
  })

  test('parseNewick reads its output back to the same tree', () => {
    for (const text of [
      '(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;',
      "('A (x)':1,'B,y':2,'c[1]':3);",
      '((A,B)95,(C,D)80);',
      "('it''s',' padded ');",
    ]) {
      const tree = parseNewick(text, { postParenNumeric: 'name' })
      expect(
        parseNewick(writeNewick(tree), { postParenNumeric: 'name' }),
      ).toEqual(tree)
    }
  })

  test('writes a caterpillar tree deeper than the call stack', () => {
    let node: NewickNode = { name: 'T0' }
    for (let i = 1; i < 20_000; i++) {
      node = { children: [node, { name: `T${i}` }] }
    }
    const text = writeNewick(node)
    expect(text.startsWith('('.repeat(19_999))).toBe(true)
    expect(text.endsWith(',T19999);')).toBe(true)
  })
})
