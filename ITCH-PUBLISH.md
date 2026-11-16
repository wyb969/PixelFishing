# Publishing PixelFishing to itch.io

Existing public game: **FixelFishing**, https://ybwangrogger.itch.io/fixelfishing . Preserve this project and its existing `html5` channel; do not create or rename it.

## Automatic upload warning

`.github/workflows/publish-itch.yml` automatically runs on pushes to `main` that change `dist/**` or the workflow itself. A merge of this update therefore attempts an itch upload. It validates the JavaScript before using the official butler client to push `dist` to `${ITCH_TARGET}:html5`, with the commit SHA as version.

The default target is `ybwangrogger/fixelfishing`; repository variable `ITCH_TARGET` or a manual dispatch input can override it. Check the configured target before merging. The existing `BUTLER_API_KEY` repository secret is required. Do not put credentials in source, README, archives or logs. A missing/invalid secret causes the upload to fail even if the GitHub merge succeeds.

Do not race a manual package upload against this workflow. Prefer one successful workflow upload, then verify the live game. The workflow does not update the itch description, cover, screenshots or embed settings.

## Page update

Use the existing game's edit page:

- Keep its title **FixelFishing**, URL and HTML5 channel.
- Replace description with `publishing/itch/description.html`, preserving author and inspiration credits.
- Use the refreshed cover and scene images listed in `publishing/itch/README.md`.
- Keep browser-play enabled, a responsive 16:9 embed (960×540 preferred), and fullscreen if supported.
- Verify play loads, controls work, collection persists after refresh and audio stays off until explicitly enabled. Check embedded fullscreen/storage behavior separately.

## Manual package fallback

Only if the automatic upload is unavailable: create a ZIP of the **contents** of `dist/`, with `index.html` at ZIP root, and replace the existing browser-play upload. Do not wrap it in a `dist` folder. Never include `.git`, `.openai`, tests, credentials, development dependencies or QA output.

```sh
node tools/test.cjs
(cd dist && zip -r ../FixelFishing-html5.zip .)
```

The game is standalone static HTML/JS/GLSL and has no runtime CDN dependencies. Serve it over HTTP(S). Local collection data is origin-bound: saves from the private preview Site do not automatically migrate to itch.io.
