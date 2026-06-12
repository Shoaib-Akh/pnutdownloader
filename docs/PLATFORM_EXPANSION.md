# Platform Expansion: Snapchat

This update adds first-class detection and UI shortcuts for Snapchat while keeping validation limited to media-style URLs.

## Added Platforms

| Platform | Supported URL examples | UI shortcut |
|----------|------------------------|-------------|
| Snapchat | `snapchat.com/spotlight/...`, `snapchat.com/stories/...`, `story.snapchat.com/p/...` | `https://www.snapchat.com/spotlight` |

## Test Cases

The Jest coverage in `tests/PlatformService.test.js` now checks:

- Snapchat URL detection.
- Snapchat public media URL download validation.
- Display names and platform base URLs for the new platform.
- Non-media examples such as Snapchat profile-add URLs remain non-downloadable.

Run the tests with:

```bash
npm test -- --runInBand
```
