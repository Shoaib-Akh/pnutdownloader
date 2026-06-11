# Platform Expansion: Snapchat and Spotify

This update adds first-class detection and UI shortcuts for Snapchat and Spotify while keeping validation limited to media-style URLs.

## Added Platforms

| Platform | Supported URL examples | UI shortcut |
|----------|------------------------|-------------|
| Snapchat | `snapchat.com/spotlight/...`, `snapchat.com/stories/...`, `story.snapchat.com/p/...` | `https://www.snapchat.com/spotlight` |
| Spotify | `open.spotify.com/track/...`, `/episode/...`, `/show/...`, `/playlist/...`, `/album/...`, `spotify.link/...` | `https://open.spotify.com` |

## Test Cases

The Jest coverage in `tests/PlatformService.test.js` now checks:

- Snapchat URL detection.
- Snapchat public media URL download validation.
- Spotify URL detection.
- Spotify media and short-link download validation.
- Display names and platform base URLs for both new platforms.
- Non-media examples such as Snapchat profile-add URLs and the Spotify homepage remain non-downloadable.

Run the tests with:

```bash
npm test -- --runInBand
```
