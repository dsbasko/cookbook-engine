# Hello, world

This first lesson exists to exercise the engine's rendering pipeline end to end:
headings feed the table of contents, fenced code blocks go through Shiki, and
GitHub-style alerts render as callouts. None of the content matters — only that
every Markdown feature survives the build.

## A code block

The block below should be syntax-highlighted by Shiki in the rendered page:

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('world'));
```

## A callout

> [!NOTE]
> This alert verifies the `remark-github-blockquote-alert` plugin. It should
> render as a styled callout, not a plain blockquote.

> [!WARNING]
> A second alert with a different severity, so the callout styling is exercised
> for more than one variant.

## A list and a link

- The table of contents is built from the `##` headings on this page.
- Cross-lesson navigation moves to [the second lesson](../../../../basics/02-second-lesson/i18n/en/README.md).
- Inline `code` and **bold** text round out the Markdown coverage.

That is everything the first lesson needs to do.
