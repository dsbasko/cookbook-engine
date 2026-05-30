<!--
Thanks for contributing to @dsbasko/cookbook-engine.
Please fill out the sections below. Keep the description focused on the "what" and "why".
-->

## Summary

<!-- What does this PR change and why? Link context if the diff is non-obvious. -->



## Type of change

<!-- Check all that apply. -->

- [ ] fix — bug fix (no API change)
- [ ] feature — new functionality
- [ ] refactor — internal change, no behavior change
- [ ] docs — documentation only
- [ ] chore — tooling, config, deps, CI

## Checklist

- [ ] `pnpm typecheck` passes (`tsc --noEmit`)
- [ ] `pnpm lint` passes (`eslint .`)
- [ ] `pnpm test` passes (`vitest run`)
- [ ] `pnpm smoke` passes (`next build` of `examples/web` — SSG e2e smoke test)
- [ ] Added/updated co-located tests (`*.test.ts(x)` next to the changed lib module — unit tests are the public-behavior contract)
- [ ] Updated `README` / docs if the public surface changed

## SemVer impact

<!--
Per the SemVer policy:
- MAJOR — a changed export signature, a removed/renamed entry-point (package.json#exports),
  or a removed/renamed course.yaml field.
- MINOR — additive entry-points or new optional course.yaml fields (backward compatible).
- PATCH — bug fixes with no public-surface change.
Check exactly one.
-->

- [ ] patch — bug fix, no public-surface change
- [ ] minor — additive (new entry-point or new optional `course.yaml` field), backward compatible
- [ ] major — breaking change

**If major, explain why** (which applies):

<!--
- [ ] changed an export signature
- [ ] removed/renamed an entry-point (package.json#exports)
- [ ] removed/renamed a course.yaml field
Describe the break and the migration path for consumers below.
-->



## Related issues

<!-- e.g. Closes #123, Refs #456 -->

Related issues:
