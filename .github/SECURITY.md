# Security Policy

`@dsbasko/cookbook-engine` is an open-source package maintained by a single author
(Dmitriy Basenko). Security is taken seriously, but please keep response times in
the context of a solo-maintained project.

## Supported Versions

The project is on the `0.x` line and follows [SemVer](https://semver.org/). Security
fixes are applied to the **latest published minor** release; older minors are not
patched. The recommended action when a vulnerability is reported is to upgrade to the
latest version.

| Version           | Supported          |
| ----------------- | ------------------ |
| Latest `0.x` minor | :white_check_mark: |
| Older `0.x` minors | :x:                |

Because this is a `0.x` package, breaking changes can land in minor releases per the
SemVer pre-1.0 rules — review the release notes before upgrading.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.** Public disclosure
before a fix is available puts every consumer at risk.

Instead, report privately by email to **d.basenko.acc@gmail.com**. Include as much of
the following as you can:

- The affected version (the `@dsbasko/cookbook-engine` version from your lockfile).
- A clear description of the vulnerability and its impact.
- Steps to reproduce, ideally with a minimal example or proof of concept.
- Any relevant environment details (Node version, consumer setup).

### What to expect

- **Acknowledgement** within a few business days of your report.
- A follow-up with an assessment and, where applicable, a remediation plan.
- A fix released as a new version (releases are published manually), with credit to the
  reporter unless you prefer to remain anonymous.

Thank you for helping keep the project and its consumers safe.
