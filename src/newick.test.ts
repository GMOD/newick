import { describe, expect, test } from 'vitest'

import parseNewick from './newick.ts'

describe('standard phylo newick', () => {
  test('parses names and branch lengths', () => {
    expect(parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4)E:0.5)F;')).toEqual({
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
    })
  })

  test('parses an internal node name plus a colon branch length', () => {
    expect(parseNewick('(A:1,B:2)Root:5;')).toEqual({
      name: 'Root',
      length: 5,
      children: [
        { name: 'A', length: 1 },
        { name: 'B', length: 2 },
      ],
    })
  })

  test('leaves an unnamed internal node without a name', () => {
    const tree = parseNewick('((A:0.1,B:0.2):0.5,C:0.3);')
    expect(tree.name).toBeUndefined()
    expect(tree.children![0]!.name).toBeUndefined()
    expect(tree.children![0]!.length).toBe(0.5)
    expect(tree.children![1]!.name).toBe('C')
  })

  test('parses an unlabelled tree', () => {
    expect(parseNewick('((,),,(,));')).toEqual({
      children: [{ children: [{}, {}] }, {}, { children: [{}, {}] }],
    })
  })

  test('names a tree that is a single bare node', () => {
    expect(parseNewick('A;')).toEqual({ name: 'A' })
    expect(parseNewick("'has, a comma';")).toEqual({ name: 'has, a comma' })
  })

  test('ignores whitespace around delimiters and newlines between tokens', () => {
    expect(parseNewick('(\n  A:0.1,\n  B:0.2\n)F;')).toEqual({
      name: 'F',
      children: [
        { name: 'A', length: 0.1 },
        { name: 'B', length: 0.2 },
      ],
    })
  })

  // phased haplotype rows are named "<sample> HP<n>"; the label's space is
  // load-bearing, since hover and subtree filtering match leaf names to rows
  test('keeps spaces inside leaf labels', () => {
    expect(parseNewick('(NA18536 HP0,NA18748 HP1);')).toEqual({
      children: [{ name: 'NA18536 HP0' }, { name: 'NA18748 HP1' }],
    })
  })
})

describe('quoted labels', () => {
  // written bare, the parenthesis is grammar: the label parses as an internal
  // node wrapping a leaf of that name, so the leaves stop matching the rows
  test('round-trips a parenthesised label as one leaf', () => {
    const tree = parseNewick("(GM12878,'T helper cells (BLD.CD4.NPC)',K562);")
    expect(tree.children!.map(c => c.name)).toEqual([
      'GM12878',
      'T helper cells (BLD.CD4.NPC)',
      'K562',
    ])
  })

  // worse than the parenthesis case: the comma splits one leaf into two, so the
  // tree comes back the wrong SHAPE and every row below is labelled with its
  // neighbour's name
  test('round-trips a label containing a comma as one leaf', () => {
    const tree = parseNewick("(A,'has, a comma',B);")
    expect(tree.children!.map(c => c.name)).toEqual(['A', 'has, a comma', 'B'])
  })

  test("reads '' as a literal quote", () => {
    expect(parseNewick("('it''s a name':0.1,seq2:0.2);").children).toEqual([
      { name: "it's a name", length: 0.1 },
      { name: 'seq2', length: 0.2 },
    ])
  })

  test('reads a colon inside a quoted label as part of the label', () => {
    const tree = parseNewick(
      "('EU105457.1|chr09:67680268..67675529_LTR/Copia':0.5,seq2:0.3);",
    )
    expect(tree.children!.map(c => c.name)).toEqual([
      'EU105457.1|chr09:67680268..67675529_LTR/Copia',
      'seq2',
    ])
  })

  test('keeps whitespace inside a quoted label verbatim', () => {
    expect(parseNewick("('  padded  ',B);").children!.map(c => c.name)).toEqual(
      ['  padded  ', 'B'],
    )
  })

  // a supplied .nh guide tree is a hand-written file and may be pretty-printed.
  // Layout whitespace around a quoted label is not part of the name, and a leaf
  // whose name has a stray leading space matches no row.
  test('drops layout whitespace around a quoted label', () => {
    expect(
      parseNewick("(\n  'A B' ,\n  'C D'\n);").children!.map(c => c.name),
    ).toEqual(['A B', 'C D'])
  })
})

describe('postParenNumeric', () => {
  test("defaults to reading a numeric post-paren as a name when the tree has ':' lengths", () => {
    // a bootstrap/support label sits exactly where hclust puts its merge height
    expect(parseNewick('((A:0.1,B:0.2)95,(C:0.1,D:0.1)80);')).toEqual({
      children: [
        {
          name: '95',
          children: [
            { name: 'A', length: 0.1 },
            { name: 'B', length: 0.2 },
          ],
        },
        {
          name: '80',
          children: [
            { name: 'C', length: 0.1 },
            { name: 'D', length: 0.1 },
          ],
        },
      ],
    })
  })

  test('defaults to reading it as a length when the tree has no colon at all', () => {
    expect(parseNewick('(A,B)1.5;')).toEqual({
      length: 1.5,
      children: [{ name: 'A' }, { name: 'B' }],
    })
  })

  test('reads trailing-zero and scientific notation as numbers', () => {
    expect(parseNewick('(A,B)1.50;').length).toBe(1.5)
    expect(parseNewick('(A,B)1e-3;').length).toBe(1e-3)
  })

  test('always reads a non-numeric post-paren as a name', () => {
    expect(parseNewick('(A,B)Internal;')).toEqual({
      name: 'Internal',
      children: [{ name: 'A' }, { name: 'B' }],
    })
  })

  // quoting is the writer saying "this is a label", and the only way to name a
  // node something that looks like a number
  test('always reads a quoted post-paren numeric as a name', () => {
    expect(parseNewick("(A,B)'1.5';")).toEqual({
      name: '1.5',
      children: [{ name: 'A' }, { name: 'B' }],
    })
  })

  // asked of the delimiters, not the raw string: a leaf named for a region
  // carries a colon of its own
  test('a colon inside a quoted label leaves the tree in the no-colon reading', () => {
    expect(parseNewick("('chr1:100-200','chr2:1-50')1.5;")).toEqual({
      length: 1.5,
      children: [{ name: 'chr1:100-200' }, { name: 'chr2:1-50' }],
    })
  })

  test("'name' never reads a post-paren numeric as a length", () => {
    expect(parseNewick('(A,B)1.5;', { postParenNumeric: 'name' })).toEqual({
      name: '1.5',
      children: [{ name: 'A' }, { name: 'B' }],
    })
  })

  test("'length' reads one as a length even alongside colon lengths", () => {
    expect(
      parseNewick('(A:0.1,B:0.2)1.5;', { postParenNumeric: 'length' }),
    ).toEqual({
      length: 1.5,
      children: [
        { name: 'A', length: 0.1 },
        { name: 'B', length: 0.2 },
      ],
    })
  })
})
