/**
 * Newick format parser.
 *
 * Originally based on Jason Davies' 2010 implementation (MIT). Rewritten around
 * a hand-rolled scanner so that single-quoted labels are read as labels rather
 * than as grammar.
 *
 * Supported forms:
 *
 *   (A:0.1,B:0.2)F        — name and `:` branch length (standard phylo Newick)
 *   (A:0.1,B:0.2)F:0.5    — internal node name + branch length to parent
 *   (A,B)Foo              — non-numeric post-paren stored as `name`
 *   (A,B)1.5              — numeric post-paren; see `postParenNumeric` below
 *   ('A (x)','B,y')1.5    — single-quoted labels, `''` for a literal quote
 *
 * The quoted form is not decoration: a leaf name is an arbitrary string out of
 * somebody's data file, and one holding a `(` or a `,` is grammar rather than a
 * label unless it is quoted. A comma inside an unquoted label splits one leaf
 * into two and hands every row below it its neighbour's name, so the tree comes
 * back the wrong shape rather than merely mislabelled.
 */

export interface NewickNode {
  name?: string
  length?: number
  children?: NewickNode[]
}

/**
 * How to read a bare number sitting after a `)`.
 *
 * The Newick grammar puts the internal node's *label* there, so `95` in
 * `((A,B)95,(C,D)80);` is a bootstrap support value. `@gmod/hclust` reuses the
 * same slot for a cluster's absolute merge height (`(A,B)1.5`) and never emits a
 * `:`, so for that dialect the number is a length. Nothing in the string
 * distinguishes the two, which is why this is a parameter and not a guess.
 *
 *   'name'   — always a name. Standard Newick.
 *   'length' — always a length. `@gmod/hclust` output.
 *   'auto'   — length only when the tree contains no `:` branch length at all,
 *              which is the shape hclust writes. The default, since reading a
 *              real phylogeny's support values as lengths would sum 0-100 into
 *              the branch distances and flatten the real ones.
 *
 * A *quoted* post-paren token is always a name under every setting: quoting is
 * the writer saying "this is a label", and it is the only way to name a node
 * something that looks like a number.
 */
export type PostParenNumeric = 'name' | 'length' | 'auto'

export interface ParseNewickOptions {
  postParenNumeric?: PostParenNumeric
}

const NUMERIC_TOKEN = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/

interface Token {
  text: string
  // a bare grammar character, as opposed to label text that happens to equal one
  delim: boolean
  // arrived single-quoted, so it is a label whatever it looks like
  quoted: boolean
}

/**
 * Split into grammar characters and labels.
 *
 * A scanner rather than a regex split on the grammar characters, because a
 * split cannot know it is inside a quoted label and so tears the label apart on
 * the very characters quoting exists to protect.
 *
 * Whitespace is consumed around the delimiters and not inside labels: phased
 * haplotype rows are named `NA18536 HP0`, and stripping globally welds them
 * shut. Inside quotes it is kept verbatim.
 */
function tokenize(s: string): Token[] {
  const out: Token[] = []
  // text since the last delimiter, kept apart from the quoted run so a quoted
  // label can own the token: whitespace written around the quotes is layout in
  // a hand-formatted .nh file, not part of the name
  let bare = ''
  let quotedText = ''
  let quoted = false
  function flush() {
    const text = quoted ? quotedText : bare.trim()
    // an empty run between two delimiters is not a label; an explicitly quoted
    // '' is one, so it survives
    if (text !== '' || quoted) {
      out.push({ text, delim: false, quoted })
    }
    bare = ''
    quotedText = ''
    quoted = false
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (c === "'") {
      quoted = true
      for (i++; i < s.length; i++) {
        if (s[i] !== "'") {
          quotedText += s[i]!
        } else if (s[i + 1] === "'") {
          // '' is an escaped literal quote, not the end of the label
          quotedText += "'"
          i++
        } else {
          break
        }
      }
    } else if (c === '(' || c === ')' || c === ',' || c === ':' || c === ';') {
      flush()
      out.push({ text: c, delim: true, quoted: false })
    } else {
      bare += c
    }
  }
  flush()
  return out
}

export default function parseNewick(
  s: string,
  options: ParseNewickOptions = {},
): NewickNode {
  const ancestors: NewickNode[] = []
  const tokens = tokenize(s)

  // asked of the delimiters rather than of the raw string: a leaf legitimately
  // named for a region (chr1:1-100) carries a colon of its own, and testing the
  // string flips a whole hclust tree into the phylo reading over it
  const { postParenNumeric = 'auto' } = options
  const numericIsLength =
    postParenNumeric === 'length' ||
    (postParenNumeric === 'auto' &&
      !tokens.some(t => t.delim && t.text === ':'))

  let tree: NewickNode = {}
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    const subtree: NewickNode = {}
    if (token.delim) {
      switch (token.text) {
        case '(':
          tree.children = [subtree]
          ancestors.push(tree)
          tree = subtree
          break
        case ',':
          ancestors.at(-1)?.children?.push(subtree)
          tree = subtree
          break
        case ')':
          tree = ancestors.pop()!
          break
        default:
          // ':' and ';' are consumed by the label that follows them
          break
      }
      continue
    }
    const prev = i > 0 ? tokens[i - 1] : undefined
    const prevDelim = prev?.delim ? prev.text : undefined
    if (prevDelim === ':') {
      tree.length = Number.parseFloat(token.text)
    } else if (prevDelim === ')') {
      // the regex rather than a String(n) round-trip, so `1.50` and `1e-3` still
      // read as numbers
      if (numericIsLength && !token.quoted && NUMERIC_TOKEN.test(token.text)) {
        tree.length = Number.parseFloat(token.text)
      } else {
        tree.name = token.text
      }
    } else if (
      prevDelim === '(' ||
      prevDelim === ',' ||
      // nothing before it at all: the whole tree is one bare node (`A;`), which
      // is what a single-row input serializes to. Without this the name is
      // dropped, and a root leaf with no name matches no row.
      prevDelim === undefined
    ) {
      tree.name = token.text
    }
  }
  return tree
}
