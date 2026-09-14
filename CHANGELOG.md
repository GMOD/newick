## [1.0.3](https://github.com/GMOD/newick/compare/v1.0.2...v1.0.3) (2026-09-14)

### Bug Fixes

- Drop bracketed comments, so NHX and BEAST metadata stops becoming lengths and names ([7b3532e](https://github.com/GMOD/newick/commit/7b3532eebbc49f368da568f313fb6f3f83e709e8))

### Documentation

- Clarify the API tables and add badges ([d859adc](https://github.com/GMOD/newick/commit/d859adcc5e77e3c98b88c669e472b3b82cdc8580))
- Note the simpler types in the intro ([068742f](https://github.com/GMOD/newick/commit/068742f4bb6db3ed4d89f4b5833618a352de3f78))
- Split the README into docs/, and show outputs in the samples ([1880c72](https://github.com/GMOD/newick/commit/1880c72395b893a7b83d03f537b701b8e2f982ad))
- Draw the example tree where the samples assert against it ([d3d6f60](https://github.com/GMOD/newick/commit/d3d6f60724b2fc76e43f532f05b5f83370cdb9bb))
- Describe the post-paren number by dialect, not by culprit ([a764f2b](https://github.com/GMOD/newick/commit/a764f2b2edfb224cebd8cc95b841bbccbf23fa1a))
- Hclust writes `:` branch lengths from v5 ([493f362](https://github.com/GMOD/newick/commit/493f3620bb4d9bd72a0c0d7a93fd214fdd92d17c))

### Refactoring

- Name the sum constraint, share the pre-order push, export TreeLike ([5beb28b](https://github.com/GMOD/newick/commit/5beb28b88acf1a158579aa7ccd1d6481d2e4dae4))

### Styling

- Format ([88e1dc9](https://github.com/GMOD/newick/commit/88e1dc9ca8b092eaeeb3345cb87af2614baf8a74))

## [1.0.2](https://github.com/GMOD/newick/compare/v1.0.1...v1.0.2) (2026-08-16)

### Documentation

- Show how to draw a tree with the traversals ([84b9e87](https://github.com/GMOD/newick/commit/84b9e87d9f50e1a13b376b50166e4dafdf1a54be))
- Draw the example on a canvas instead of an svg path ([0d54f23](https://github.com/GMOD/newick/commit/0d54f235482651442a039e653699af03e6f0e425))

## [1.0.1](https://github.com/GMOD/newick/compare/v1.0.0...v1.0.1) (2026-08-16)

### Bug Fixes

- EachAfter visits siblings left to right ([1cd5e18](https://github.com/GMOD/newick/commit/1cd5e185c7cf7cc22c04d34d7ee92198b67212c6))

### Documentation

- Drop the extraction backstory from the readme ([b3b097d](https://github.com/GMOD/newick/commit/b3b097d4d917608945f16cc4629b61c52975634c))
- Tone down the readme ([36f7431](https://github.com/GMOD/newick/commit/36f74313058978a230bee3a6352a16acb3448d1e))
- Say how this lines up with d3-hierarchy ([e06cc91](https://github.com/GMOD/newick/commit/e06cc91d5690fd89b8729c4498a984deda411f1e))

## [1.0.0](https://github.com/GMOD/newick/compare/...v1.0.0) (2026-08-16)

### Chores

- Use pnpm, matching the consuming repos ([a9a65c0](https://github.com/GMOD/newick/commit/a9a65c0cc01df978d01dc2598d8243a2c995751c))
- Adopt the shared gmod repo layout ([97068c2](https://github.com/GMOD/newick/commit/97068c2a782c95fd6bc06b2096db7ea5c1b61842))
- Add publishConfig.access, as every other scoped gmod package has ([8d0194f](https://github.com/GMOD/newick/commit/8d0194f4a24225f96e88f0faf3c210bb1f0fd040))

### Features

- Newick parsing and stack-safe tree traversals ([6a666da](https://github.com/GMOD/newick/commit/6a666dacbb69f286265651170e7a3744bb3181e0))

