# Platform test guide

PNUTDownloader has two platform test layers:

1. The deterministic Jest matrix checks URL detection and acceptance for every first-class platform. It does not use the network.
2. The live smoke runner calls the bundled `yt-dlp` against one public item per platform. It checks that the item has a real title, a thumbnail URL, and at least one downloadable audio or video format. It does not download the full media file.

The shared test data is in [`tests/platform-cases.json`](../tests/platform-cases.json). It currently covers YouTube, YouTube Music, YouTube Kids, Facebook, Instagram, Snapchat, TikTok, Twitter/X, Twitch, Dailymotion, Bilibili, Reddit, Pinterest, LinkedIn, SoundCloud, Vimeo, Rumble, and BitChute.

## Run the fast tests

Install dependencies once, then run the full unit suite:

```bash
npm install
npm test -- --runInBand
```

To run only the JSON platform matrix:

```bash
npm run test:platforms
```

These tests should be used in normal development and CI because they are fast and do not depend on third-party websites.

## Run live checks for every platform

```bash
npm run test:platforms:live
```

The command runs cases sequentially to reduce rate limiting. A JSON report is written to:

```text
tests/reports/platform-smoke-report.json
```

The command exits with code `1` if any platform fails. Each result contains the extracted title, thumbnail, extractor, media format count, duration, and elapsed time.

## Test one platform or a group

Use the exact IDs from `tests/platform-cases.json`:

```bash
npm run test:platforms:live -- --platform=vimeo
npm run test:platforms:live -- --platform=instagram,tiktok,twitter
```

Increase the per-platform timeout when the connection is slow:

```bash
npm run test:platforms:live -- --timeout=120
```

## Test sites that require login

Facebook, Instagram, LinkedIn, and some age-restricted or regional items can require browser cookies. Export a Netscape-format cookie file from a browser session you own, then run:

```bash
npm run test:platforms:live -- --cookies=/absolute/path/to/cookies.txt
```

The same path can be provided without putting it in shell history:

```bash
PNUT_TEST_COOKIES=/absolute/path/to/cookies.txt npm run test:platforms:live
```

Cookie files are credentials. Do not commit them. The repository ignores `cookies.txt`.

To run only public cases and explicitly skip cases marked as needing authentication:

```bash
npm run test:platforms:live -- --skip-auth
```

## Understand failures

- `missing a usable title`: the extractor returned no meaningful title.
- `missing a thumbnail URL`: the item was found, but thumbnail metadata was absent.
- `missing a downloadable video format`: metadata loaded, but `yt-dlp` found no video stream.
- `missing a downloadable audio format`: the SoundCloud case had no audio stream.
- `HTTP 403`, `login required`, or `cookies`: rerun with current cookies.
- `unsupported URL`: update the bundled `yt-dlp` before changing application code.
- `video unavailable` or `not found`: the public fixture was deleted; replace only that platform's `live.url` with another stable public item.
- timeout or intermittent network failure: rerun the affected platform with `--platform` and a larger `--timeout` before treating it as a code regression.

Third-party sites change frequently. A live failure does not automatically mean PNUTDownloader is broken; use the saved error, rerun the single case, and distinguish authentication, region, removed content, extractor changes, and application URL handling.

## Add or replace a test URL

Edit the matching object in `tests/platform-cases.json`:

```json
{
  "id": "vimeo",
  "displayName": "Vimeo",
  "urls": ["https://vimeo.com/56015672"],
  "live": {
    "url": "https://vimeo.com/56015672",
    "media": "video",
    "requireThumbnail": true,
    "requiresCookies": false
  }
}
```

- Add every supported URL shape to `urls`; these values may use fake IDs because they test routing only.
- Keep `live.url` public and playable because it is sent to `yt-dlp`.
- Set `media` to `audio` only for audio-only services.
- Set `requireThumbnail` to `true` when the app should display artwork.
- Set `requiresCookies` to `true` when a clean browser session cannot access the item reliably.

After editing, run both the matrix and that platform's live check:

```bash
npm run test:platforms
npm run test:platforms:live -- --platform=vimeo
```

The matrix also verifies that every value in `PLATFORMS` has exactly one JSON entry, so adding a new first-class platform without adding test data fails immediately.