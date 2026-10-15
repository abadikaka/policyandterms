# Reviewed app websites

The Amitaba and Swastiastu site sources live in their sibling native app projects.
Do not copy `build/DraftWeb` into this repository. Draft review packs are for local
owner review only.

After the owner approves each exact review pack and the app projects record that
approval, run:

```sh
python3 scripts/stage-reviewed-apps.py
python3 scripts/stage-reviewed-apps.py --stage
```

The first command generates and checks both public artifacts. The second repeats
the checks, copies only verified approved output into `docs/amitaba` and
`docs/swastiastu`, and adds their cards to `docs/index.html`. It does not change
content approval, commit, push, open a pull request, merge, or deploy.

Review the diff and exact staged file list before creating the website pull
request. Repository review requirements remain in force. The site's existing
GitHub Pages configuration publishes `main:/docs`; a feature branch is not live.

Each app contributes 316 HTML pages: a language selector, three localized home
pages, twelve localized legal/source/support pages, and 300 lesson previews.
Lesson answers and original passages come from the same approved content used by
the iPhone app. The previews do not store or transfer progress.

Public bases:

- `https://michaelabadi.com/policyandterms/amitaba/`
- `https://michaelabadi.com/policyandterms/swastiastu/`

Each contains `en/`, `id/`, and `hi/`. Legal routes are `privacy/`, `terms/`,
`sources/`, and `support/` under the locale. Lesson routes are
`<locale>/stories/<stable-lesson-id>/`.

After the approved pull request is merged and GitHub Pages deploys, verify the
live artifacts before submitting the native apps:

```sh
python3 scripts/verify-deployed-apps.py --output /tmp/amitaba-swastiastu-live-check.json
```

This reads both live manifests and checks all published file routes, plus exact
bytes for legal pages, representative lessons in all three languages, and shared
assets. It makes no changes to the website. A mismatch means the current approved
version is not yet confirmed live; do not substitute a draft or infer success
from a local build.
