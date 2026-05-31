# Deep dive

The advanced module holds a single lesson. Its only job is to give the sidebar
and home page a second module and to make cross-module prev/next navigation
reach across a module boundary — from the last lesson of `basics` into here.

## Cross-module navigation

The "previous" link on this page should point back to the second lesson of the
`basics` module, proving that `getPrevLesson` walks across modules, not just
within one.

## A table

| Feature        | Exercised by            |
| -------------- | ----------------------- |
| Table of contents | the `##` headings    |
| Code highlight | the fenced blocks       |
| Callouts       | the `[!NOTE]` alerts    |
| i18n fallback  | the Russian-only lesson |

## Closing

```bash
pnpm -C examples/web build
```

Running the command above is the smoke test for the whole engine.
