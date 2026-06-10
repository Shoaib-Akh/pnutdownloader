# PNUT Downloader Professional Gen Z Redesign Spec

This file is a professional UI/UX and graphic design guide for making PNUT Downloader feel modern, simple, fast, and easy to understand. The style should feel fresh for Gen Z users, but still useful and serious enough for a desktop downloader.

Important rule: this is a visual, UX, copy, and layout redesign only. Do not change the app functionality, download engine, supported platforms, IPC behavior, saved data structure, browser behavior, update system, login flow, or file handling logic.

## One-Line Creative Direction

PNUT Downloader should feel like a fast creator utility: clean, bold, visual, and effortless.

## Design Goal

Make the app feel like a clean creator tool:

- Easy to understand in the first 5 seconds.
- Fast to use with one main action: paste link and download.
- Friendly, modern, and visual without looking childish.
- Consistent across light mode and dark mode.
- Clear status for every download: queued, downloading, done, failed.

## What Perfect Means

Perfect does not mean adding more decoration. Perfect means the app is easier to use, easier to scan, and harder to misunderstand.

The redesign is successful when:

- A new user knows where to paste a link immediately.
- A returning user can manage many downloads quickly.
- The app looks polished without hiding the content.
- The sidebar, download bar, lists, browser, and modals feel like one product.
- Every visual decision supports speed, clarity, or trust.
- Existing functionality works exactly the same after the redesign.

## Target Users

Primary users:

- Students saving lectures, clips, and music.
- Creators collecting references, audio, or videos.
- Social media users saving content from supported platforms.
- Power users downloading many files or playlists.

User mindset:

- They want speed.
- They do not want setup confusion.
- They need clear progress and file status.
- They care about quality, format, and save location.
- They expect the app to look modern and trustworthy.

## Redesign Scope

Allowed changes:

- Screen names shown to users.
- Layout, spacing, color, typography, icons, and visual hierarchy.
- Button labels, empty states, modal copy, and status wording.
- CSS/theme tokens and component styling.
- Component structure only when it does not change behavior.

Do not change:

- yt-dlp download logic.
- FFmpeg logic.
- IPC channel names or payloads.
- Local storage keys or stored download object shape.
- Firebase/firestore tracking behavior.
- Supported platform detection.
- Browser session, cookies, or login behavior.
- Update download and install flow.
- Save folder behavior.
- Duplicate detection rules.
- Retry, delete, open folder, copy URL, and move file behavior.

If a visual rename is needed, keep the internal logic stable. For example, the UI can show "Library", but the internal selected item can still map to "All Files" so existing filters keep working.

## Product Promise

Paste any supported media link, choose the quality, and download without confusion.

Recommended short app message:

> Save videos, music, and playlists in a few clicks.

## Gen Z Style Direction, Done Professionally

Use simple, confident language. Avoid too much slang. Gen Z design should feel fast, visual, and direct, not messy.

Good copy style:

- "Paste a link"
- "Pick quality"
- "Download now"
- "Ready in your Library"
- "Try again"
- "Open file"
- "Copy link"

Avoid:

- Long explanations.
- Too many emojis.
- Random trendy words.
- Big empty landing page sections.
- Too many gradients on every card.

Tone rules:

- Short beats long.
- Clear beats clever.
- Friendly beats formal.
- Useful beats decorative.
- Calm confidence beats loud hype.

## Professional UI/UX Principles

Think like a product designer, not only a decorator.

Information architecture:

- The sidebar should answer: "Where am I?"
- The top bar should answer: "What can I download?"
- The main content should answer: "What is happening now?"
- The action menu should answer: "What can I do with this file?"

Visual hierarchy:

- One primary action per screen.
- Download is always the strongest action.
- Delete is never visually equal to Download.
- Status should be visible before secondary metadata.
- Search and filters should be easy to find but not louder than active downloads.

Consistency:

- Same spacing scale across all screens.
- Same card design for Library, Videos, Music, and Playlists.
- Same modal header, body, footer, and button order.
- Same status colors everywhere.
- Same icon size rules everywhere.

Usability:

- Users should not need to read instructions to download a file.
- Every empty state should tell the user what to do next.
- Every error state should offer a recovery action.
- Every active download should clearly show progress.
- Every completed download should offer Open file or Show in folder.

Graphic design quality:

- Use brand color with restraint.
- Let thumbnails and platform icons provide visual energy.
- Keep backgrounds calm so download content is easy to scan.
- Use whitespace to group related controls.
- Avoid decorative graphics that do not help the workflow.
- Keep the logo visible but not oversized.

## Recommended Screen Names

These names are easier than the current labels and still match the app features.

| Current Screen | Recommended Screen Name | Purpose |
| --- | --- | --- |
| Home | Download Hub | Main place to paste links, choose settings, and start downloads. |
| All Files | Library | All downloaded and active files in one place. |
| Audio | Music | Audio-only downloads. |
| Video | Videos | Video-only downloads. |
| Playlist | Playlists | Playlist downloads and grouped playlist files. |
| Browser | Explore | In-app browser for finding videos and downloading from sites. |
| Feedback | Feedback | User feedback link or form. |
| About us | About PNUT | App version, update check, community links, and app info. |

Recommended sidebar order:

1. Download Hub
2. Library
3. Videos
4. Music
5. Playlists
6. Explore
7. Feedback
8. About PNUT

## App Shell

The app should use one consistent shell:

- Left sidebar for navigation.
- Top download bar for paste, URL input, download button, and settings.
- Main content area for the selected screen.
- Light and dark theme support.

Desktop layout blueprint:

```text
+------------------+-------------------------------------------------------+
| Sidebar          | Top Download Bar                                      |
|                  +-------------------------------------------------------+
| Download Hub     | Screen Header / Filters / Main Content               |
| Library          |                                                       |
| Videos           | Download cards, platform cards, browser, or about UI |
| Music            |                                                       |
| Playlists        |                                                       |
| Explore          |                                                       |
|                  |                                                       |
| Support / Theme  |                                                       |
+------------------+-------------------------------------------------------+
```

Recommended desktop proportions:

- Sidebar width: 220px to 260px.
- Content max width: no hard max for lists, but keep inner spacing consistent.
- Top download bar height: 72px to 96px depending on settings wrapping.
- Page padding: 20px to 28px.
- List gap: 12px to 16px.
- Card radius: 8px.

Sidebar behavior:

- Show clear active state.
- Use short labels.
- Keep icons consistent in size.
- Put theme toggle near the bottom with a simple switch.
- Put "Support us" in the footer, but make it less visually loud than primary download actions.

Top download bar:

- Primary input placeholder: "Paste a video link"
- Primary button: "Download"
- Paste button: "Paste"
- Settings order: Type, Format, Quality, Save to
- Keep the bar visible on Download Hub, Library, Videos, Music, and Playlists.
- Hide or compact the bar inside Explore if it takes too much space.

Top download bar anatomy:

```text
[Paste] [ Paste a video link................................ ] [Download]
[Type: Video] [Format: MP4] [Quality: 1080p] [Save to: Downloads]
```

Interaction expectations:

- Paste fills the input and validates supported links.
- Enter in the input starts the same download path as the Download button.
- Download button shows processing/loading feedback when needed.
- Dropdown selections remain persistent through the existing storage behavior.

## Screen 1: Download Hub

Purpose:

The main starting screen. Users should understand immediately that they can paste a link or open a supported platform.

Main content:

- Hero-sized download input, not a marketing hero.
- Quick settings row: Video or Audio, Format, Quality, Save to.
- Popular platforms grid.
- Recent downloads preview.
- Resume Explore button if the user had an open browser session.

Recommended screen title:

Download Hub

Recommended empty state:

"Paste a link to start your first download."

Recommended layout:

- Top section: URL input and Download button.
- Middle section: quick platform buttons.
- Bottom section: latest 3 to 5 downloads.

Popular platform cards:

- YouTube
- TikTok
- Instagram
- Facebook
- Twitch
- SoundCloud
- Reddit
- Pinterest
- LinkedIn
- Bilibili
- Dailymotion

Design note:

Use platform brand colors only as small accents. Do not make the whole app look like a rainbow grid.

## Screen 2: Library

Purpose:

Show every download in one place.

Main content:

- Search bar.
- Filter chips: All, Downloading, Done, Failed.
- Sort menu: Newest, Oldest, Name, Type.
- Download cards or compact rows.
- Bulk select mode.

Recommended screen title:

Library

Recommended copy:

- "Search downloads"
- "Select"
- "Delete selected"
- "Open file"
- "Show in folder"
- "Copy link"
- "Retry"

Download item card should show:

- Thumbnail.
- Clean title.
- Status badge.
- Format.
- Quality or bitrate.
- Date.
- Progress bar when downloading.
- Speed, size, and ETA while active.
- Actions menu.

Download item card anatomy:

```text
+------+-----------------------------------------------------+----------+
|  #   | Thumbnail     Title, status, format, date           | Actions  |
|      |               Progress, speed, ETA if active        |          |
+------+-----------------------------------------------------+----------+
```

Recommended card layout:

- Left: number or checkbox.
- Next: thumbnail with duration overlay.
- Center: title, status badges, format, date, progress.
- Right: actions menu.
- Active downloads should show progress without pushing the layout around.
- Completed downloads should make Open file and Show in folder easy to reach.
- Failed downloads should show Retry as the most useful action.

Status names:

| Current Status | Recommended Label |
| --- | --- |
| Fetching Info... | Getting info |
| Queued | In queue |
| Waiting | Waiting |
| Downloading | Downloading |
| Completed | Done |
| Failed | Failed |

Empty state:

"No downloads yet. Paste a link in Download Hub."

Library professional notes:

- Do not make every item huge. Users may have many downloads.
- Keep title readable, but metadata compact.
- Use one strong accent for active downloads.
- Search should stay close to the list.
- Bulk actions should appear only when Select mode is active.
- The list should remain stable while progress updates.

## Screen 3: Videos

Purpose:

Show only video downloads.

Main content:

- Same list design as Library.
- Video-focused filters: MP4, MKV, AVI, 4K, 1080p, 720p.
- Search inside video downloads.

Recommended screen title:

Videos

Empty state:

"No videos yet. Download one from a link or Explore."

## Screen 4: Music

Purpose:

Show only audio downloads.

Main content:

- Same list design as Library.
- Audio-focused filters: MP3, FLAC, WAV, AAC.
- Bitrate badge: 320K, 256K, 192K, 128K, 96K, 64K.

Recommended screen title:

Music

Empty state:

"No music yet. Switch Type to Audio and download a link."

## Screen 5: Playlists

Purpose:

Show playlist downloads and playlist groups.

Main content:

- Playlist cards grouped by playlist title.
- Progress summary: "8 of 20 done".
- Open playlist group.
- Retry failed playlist items.
- Search playlists.

Recommended screen title:

Playlists

Empty state:

"No playlists yet. Paste a playlist link to choose videos."

Playlist group card should show:

- Playlist thumbnail or a stacked thumbnail preview.
- Playlist title.
- Total videos.
- Done count.
- Failed count if any.
- Overall progress.
- Open group action.
- Retry failed action when needed.

## Screen 6: Explore

Purpose:

Let users browse supported sites inside the app and download when a video is detected.

Main content:

- Browser controls: back, forward, reload.
- URL bar.
- Copy URL button.
- Go button.
- Zoom controls.
- Close button.
- Floating Download button only when the current page is downloadable.

Recommended screen title:

Explore

Recommended copy:

- URL placeholder: "Search or paste a site link"
- Download button: "Download this"
- Close button: "Close Explore"
- Resume button: "Resume Explore"

Design note:

Explore should feel like a tool, not a full web browser clone. Keep controls compact and predictable.

Explore header anatomy:

```text
[Back] [Forward] [Reload] [Zoom -] [100%] [Zoom +] [Reset]
[ Globe icon  current URL.................................... ] [Copy] [Go] [Close]
```

Floating Download button:

- Only appears when the current URL is downloadable.
- Stays above the webview content.
- Uses PNUT Orange.
- Label should be "Download this".
- Disabled/loading state should say "Adding..."

## Screen 7: Feedback

Purpose:

Let users report problems or suggest features.

Current behavior opens an external Google Form. That is fine, but the app should show clear feedback before opening.

Recommended screen or modal title:

Feedback

Recommended copy:

"Tell us what broke, what confused you, or what feature you want next."

Recommended buttons:

- "Open feedback form"
- "Cancel"

## Screen 8: About PNUT

Purpose:

Show app info, version, updates, stats, and community links.

Main content:

- Logo.
- Short description.
- Current version.
- Check for update button.
- Total downloads and errors.
- Community links.
- Privacy/terms links if available.

Recommended screen title:

About PNUT

Recommended app description:

"PNUT Downloader helps you save videos, music, and playlists from supported sites."

Design note:

Do not make this screen look like a marketing landing page. Keep it compact and useful.

## Modal And State Names

These are part of the full app experience and should be designed consistently.

| Current UI | Recommended Name | Purpose |
| --- | --- | --- |
| Initializing Dependencies | Setup Loader | Shows app dependencies are being prepared. |
| UrlDetectionModal | Link Detected | Offers to download a copied or detected URL. |
| PlaylistSelectionModal | Choose Playlist Items | Lets user choose playlist videos. |
| LoginModal | YouTube Sign In Needed | Helps user sign into YouTube when restricted. |
| DonationModal | Support PNUT | Asks for optional support after download. |
| UpdateNotification | App Update | Shows update download and install flow. |
| Duplicate Download warning | Already in Library | Explains duplicate download clearly. |
| ErrorBoundary fallback | App Error | Shows recovery message if the app crashes. |

## Modal Copy

Link Detected:

- Title: "Link detected"
- Body: "We found a supported link. Want to download it?"
- Primary button: "Download"
- Secondary button: "Not now"

Choose Playlist Items:

- Title: "Choose playlist items"
- Select all label: "Select all"
- Primary button: "Download selected"
- Secondary button: "Cancel"
- Empty state: "No videos found in this playlist."

YouTube Sign In Needed:

- Title: "YouTube sign in needed"
- Body: "YouTube needs you to sign in before this download can continue."
- Primary button: "Open YouTube sign in"

Support PNUT:

- Title: "Support PNUT"
- Body: "Your download is done. If PNUT helps you, you can support future updates."
- Primary button: "Support"
- Secondary button: "Maybe later"

App Update:

- Title: "App update"
- Body when available: "A new version is ready to download."
- Body when downloaded: "Update downloaded. Restart to install it."
- Primary buttons: "Download update" and "Install and restart"

Already in Library:

- Title: "Already in Library"
- Body: "This link with the same settings is already in your downloads."
- Action tip: "Change quality, format, or save location to download again."

## UX Writing Rules

Write like the user is busy.

Rules:

- Use sentence case for labels and buttons.
- Keep buttons to 1 to 3 words when possible.
- Use verbs for actions: Download, Retry, Open, Copy, Delete.
- Use nouns for places: Library, Videos, Music, Playlists.
- Avoid blaming the user.
- Avoid technical errors unless the technical detail helps them fix it.
- Use "link" instead of "URL" in user-facing copy, except in labels where "URL" is expected.
- Use "folder" instead of "directory".
- Use "Done" instead of "Completed" in badges.

Preferred replacements:

| Current Copy | Better Copy |
| --- | --- |
| Paste the video URL | Paste a video link |
| Recent downloaded | Recent downloads |
| Duplicate Download | Already in Library |
| Download video | Download |
| Processing... | Adding... |
| Downloading... | Downloading |
| Login Required | YouTube sign in needed |
| Application Update | App update |
| Install & Restart | Install and restart |

## Visual System

Brand feeling:

- Fast
- Clean
- Friendly
- Creator-focused
- Not corporate
- Not childish

Recommended colors:

| Role | Color | Usage |
| --- | --- | --- |
| PNUT Orange | #BB4F28 | Main action buttons, active states, progress. |
| Ink | #141417 | Main text in light mode. |
| Soft White | #F8FAFC | Light background. |
| Sky | #0EA5E9 | Active download and info states. |
| Mint | #22C55E | Done/success states. |
| Red | #EF4444 | Failed/error states. |
| Violet | #7C3AED | Small premium/accent moments only. |

Dark mode:

- Background: #101114 or #0F172A.
- Cards: #181B20 or #1E293B.
- Borders: #2A2F3A.
- Text: #F8FAFC.
- Muted text: #94A3B8.

Rules:

- Use PNUT Orange as the main brand color.
- Use other colors only for status and small accents.
- Keep cards flat with soft shadows.
- Use 8px radius for cards and controls unless a circle is required.
- Do not use huge rounded pills everywhere.
- Avoid heavy full-screen gradients.

Recommended design tokens:

| Token | Value |
| --- | --- |
| `--color-brand` | `#BB4F28` |
| `--color-brand-hover` | `#A64222` |
| `--color-bg` | `#F8FAFC` |
| `--color-surface` | `#FFFFFF` |
| `--color-text` | `#141417` |
| `--color-muted` | `#64748B` |
| `--color-border` | `#E2E8F0` |
| `--color-info` | `#0EA5E9` |
| `--color-success` | `#22C55E` |
| `--color-danger` | `#EF4444` |
| `--radius-sm` | `6px` |
| `--radius-md` | `8px` |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |

Surface rules:

- App background should be calm and neutral.
- Sidebar background can be slightly different from main background.
- Cards should have a clear border in light mode and dark mode.
- Avoid using pure black or pure white in large areas if it feels harsh.
- Progress and primary action color should match brand orange.

## Graphic Design Direction

Composition:

- Use a clean 12-column desktop grid or a simple sidebar plus content grid.
- Align card edges, input edges, and section headers.
- Keep spacing predictable: 4, 8, 12, 16, 20, 24, 32.
- Give the URL input the strongest visual weight on Download Hub.
- Keep list screens dense enough for repeated use.

Iconography:

- Use one icon style across the app.
- Keep sidebar icons the same size.
- Use platform icons only for platform cards and detected link modals.
- Use simple action icons for paste, download, search, retry, folder, copy, delete, and close.
- Do not mix filled, outlined, and novelty icons randomly.

Logo usage:

- Use the PNUT logo in the sidebar header and About PNUT.
- Do not use a large logo on every screen.
- Keep enough clear space around the logo.
- Do not stretch or recolor the logo unless a dark-mode asset already exists.

Imagery:

- Use real media thumbnails as the main visual content in download lists.
- Use neutral placeholders when thumbnails fail.
- Use platform brand colors as accents, not full backgrounds everywhere.
- Avoid decorative images that make the downloader feel like a landing page.

Shadows and borders:

- Use borders for structure and soft shadows for active/hover states.
- Download cards should not look like floating marketing cards.
- Active download can have a stronger border and subtle glow.
- Failed items should be clear but not visually aggressive.

Professional polish:

- Text should never wrap awkwardly inside buttons.
- Long titles should clamp cleanly to 2 lines.
- Metadata should align vertically across rows.
- Hover states should feel intentional.
- Loading states should use skeletons or compact spinners.
- The interface should look stable while downloads update.

## Typography

Recommended fonts:

- Inter
- Manrope
- Plus Jakarta Sans

Type scale:

| Usage | Size | Weight |
| --- | --- | --- |
| Screen title | 24px to 28px | 700 |
| Section title | 16px to 18px | 650 |
| Card title | 14px to 16px | 600 |
| Body text | 13px to 14px | 400 |
| Metadata | 11px to 12px | 500 |
| Buttons | 13px to 14px | 650 |

Rules:

- Use short headings.
- Keep metadata small but readable.
- Do not use viewport-based font scaling.
- Do not use negative letter spacing.

## Component Rules

Buttons:

- Primary button: filled PNUT Orange.
- Secondary button: neutral outline or soft background.
- Danger button: red only for delete or destructive actions.
- Icon buttons need tooltips.

Inputs:

- URL input should be wide and obvious.
- Use one clear placeholder.
- Show validation errors near the input.

Cards:

- Use cards for download items and platform items.
- Do not put cards inside cards.
- Keep thumbnail size stable to avoid layout shift.

Badges:

- Done: green.
- Downloading: sky.
- Failed: red.
- In queue: neutral.
- Playlist: violet or sky.

Progress:

- Show a progress bar only when there is real progress.
- Show speed, ETA, and size while downloading.

## Motion And Interaction

Use motion lightly:

- Buttons can lift 1px to 2px on hover.
- Active download can pulse softly.
- Progress bars should animate smoothly.
- Modal entrance should be fast.
- Avoid bouncing or playful animations that distract from downloads.

Interaction rules:

- Every icon-only button needs a tooltip.
- Every destructive action needs a confirmation or undo.
- Download button should show loading state when processing.
- Failed downloads should always show Retry.

## Main User Flows

Flow 1: Download from pasted link

1. User opens Download Hub.
2. User pastes a link.
3. User chooses Type, Format, Quality, and Save to.
4. User clicks Download.
5. App validates link.
6. App moves user to Library.
7. Download card shows progress.
8. When complete, card shows Done and Open file.

Flow 2: Download from Explore

1. User opens Explore.
2. User browses a supported site.
3. App detects downloadable media.
4. Floating button shows "Download this".
5. User clicks it.
6. App adds item to Library.

Flow 3: Download playlist

1. User pastes playlist link.
2. App opens Choose Playlist Items modal.
3. User selects videos.
4. User clicks Download selected.
5. App creates playlist group in Playlists.
6. User tracks progress item by item.

Flow 4: YouTube sign in required

1. Download fails because YouTube requires sign in.
2. App opens YouTube Sign In Needed modal.
3. User clicks Open YouTube sign in.
4. App opens Explore on YouTube.
5. User signs in.
6. User retries the download.

## Empty States

Download Hub:

"Paste a link to start your first download."

Library:

"Your downloads will show here."

Videos:

"No videos yet."

Music:

"No music yet."

Playlists:

"No playlists yet."

Explore:

"Search or open a supported site."

Search with no results:

"No matches found."

Failed item:

"Download failed. Retry or copy the link."

## Accessibility Checklist

- All buttons have clear labels or tooltips.
- Text contrast passes WCAG AA.
- Keyboard users can tab through sidebar, inputs, dropdowns, and modals.
- Focus state is visible.
- Modals trap focus until closed.
- Progress updates are readable without relying only on color.
- Error messages explain what happened and what to do next.

## Responsive Layout

Desktop:

- Sidebar stays visible.
- Download bar stays horizontal.
- Library uses wide rows with thumbnails.

Tablet or narrow window:

- Sidebar can collapse to icons.
- Download settings can wrap onto a second row.
- Library cards can stack metadata below title.

Small width:

- Use compact sidebar.
- URL input remains primary.
- Move dropdowns below input.
- Avoid text overflow in buttons and cards.

## Implementation Map

Files that match the current app screens:

| Area | Current File |
| --- | --- |
| App shell | `src/renderer/src/App.jsx` |
| Sidebar navigation | `src/renderer/src/components/Sidebar/index.jsx` |
| Top download bar | `src/renderer/src/components/Navbar/index.jsx` |
| Main content switcher | `src/renderer/src/components/BodySection/index.jsx` |
| Platform cards | `src/renderer/src/components/PlatformIcons/index.jsx` |
| Download list | `src/renderer/src/components/DownloadList/index.jsx` |
| About screen | `src/renderer/src/components/AboutUs/index.jsx` |
| Link detected modal | `src/renderer/src/components/UrlDetectionModal/index.jsx` |
| Playlist modal | `src/renderer/src/components/PlaylistSelectionModal/index.jsx` |
| YouTube login modal | `src/renderer/src/components/LoginModal/index.jsx` |
| Support modal | `src/renderer/src/components/DonationModal/index.jsx` |
| Update modal | `src/renderer/src/components/UpdateNotification/index.jsx` |
| Theme variables | `src/renderer/src/assets/theme.css` |

## No Functionality Change Rules

The redesign should not rewrite core behavior. Keep visual changes separate from business logic.

Implementation rules:

- If screen labels are renamed, create a display label map instead of changing filter behavior directly.
- Keep stable internal keys for current values like `Home`, `All Files`, `Audio`, `Video`, `Playlist`, `Browser`, `Feedback`, and `About us`.
- Do not change the `downloadList` local storage key.
- Do not change item fields used by DownloadList filters, such as `format`, `url`, `status`, `isCompleted`, `isPlaylist`, or `downloadDate`.
- Do not change the shape of data sent through `window.api`.
- Do not change the duplicate warning rules.
- Do not change where files are saved.
- Do not change how YouTube login opens in the browser.
- Do not remove any current action: paste, download, search, select, delete, retry, copy URL, open folder, show file, browser navigation, zoom, update, feedback, support.
- Any component refactor should include the same props and callbacks unless the call sites are updated without changing behavior.

Recommended internal/display mapping:

| Internal Value | Display Label |
| --- | --- |
| Home | Download Hub |
| All Files | Library |
| Audio | Music |
| Video | Videos |
| Playlist | Playlists |
| Browser | Explore |
| Feedback | Feedback |
| About us | About PNUT |

## Designer Handoff Requirements

Before implementation, the designer should provide:

- Light mode mockup.
- Dark mode mockup.
- Download Hub mockup.
- Library mockup with empty, active, done, and failed states.
- Explore mockup with the floating Download button.
- Playlist selection modal mockup.
- Link detected modal mockup.
- Sidebar collapsed and expanded states if responsive collapse is added.
- Design token list for colors, radius, spacing, type, and shadows.

Every mockup should show real-looking content:

- Long video title.
- Short video title.
- Active download with progress.
- Failed download.
- Playlist with multiple videos.
- Missing thumbnail fallback.
- Long save folder name.

## Developer Handoff Requirements

Before coding, confirm:

- Which changes are pure CSS.
- Which changes require component markup updates.
- Which copy changes are user-facing only.
- Which internal labels must remain unchanged.
- Which states already exist and which only need visual treatment.

During implementation:

- Keep existing props and callbacks unless a change is required for layout.
- Add display label maps instead of changing internal state names.
- Use existing data from local storage and viewmodels.
- Keep old behavior testable after each screen is redesigned.
- Prefer shared CSS classes and tokens over repeated inline styles.

## Review Checklist For Each Screen

Use this checklist before marking any screen complete:

- Main action is visible immediately.
- Screen name is clear.
- Empty state exists.
- Loading state exists.
- Error or failed state exists where relevant.
- Hover state exists for clickable controls.
- Focus state exists for keyboard users.
- Long text does not break the layout.
- Dark mode is not an afterthought.
- Functionality matches the old app behavior.

## Recommended Build Order

1. Add a display label map for sidebar labels without changing internal screen values.
2. Redesign the top download bar so paste, URL input, and Download are the main focus.
3. Redesign Download Hub with platform cards and recent downloads.
4. Redesign Library cards with cleaner status badges and actions.
5. Apply the same list design to Videos, Music, and Playlists.
6. Redesign Explore controls and floating Download button.
7. Update all modal copy and button labels.
8. Clean theme variables and make light/dark mode consistent.
9. Add empty states and failed states.
10. Test keyboard navigation, small windows, and dark mode.

## Final Acceptance Checklist

- A new user can understand the app in 5 seconds.
- The main action is obvious: paste link and download.
- Every screen has a short, clear name.
- Every empty state explains what to do next.
- Every failed state has a Retry action.
- Library, Videos, Music, and Playlists use the same card/list pattern.
- Explore has compact browser controls and a clear Download button.
- Modals use short copy and consistent buttons.
- Light mode and dark mode both look complete.
- Text never overflows buttons, cards, or sidebars.
- The app feels modern without becoming noisy.
- Existing download, browser, update, login, save folder, duplicate detection, and file actions still work.
