# Tidy for YouTube

A Tampermonkey userscript that hides clutter in the YouTube interface: Shorts, inserted shelves, extra buttons and more. 34 toggles: the core set is enabled by default, the extra comment options are off.

## Install
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. In Chromium browsers (Chrome / Arc / Dia), enable **Allow User Scripts** for Tampermonkey (Extensions → Tampermonkey → Details).
3. Open [tidy-youtube.user.js](https://raw.githubusercontent.com/mikovskii/tidy-youtube/main/tidy-youtube.user.js) and click **Install**. Tampermonkey will keep it updated automatically.
4. Settings: Tampermonkey icon → **Tidy for YouTube settings**.

## Options

| Section | Options |
|---|---|
| Home Page | Breaking News / Trending and similar shelves |
| Left Navigation Bar | Grayscale subscription avatars; Movies, Gaming, News, Sports; Kids |
| Header | Voice search button, Create button |
| Video Page | Watermark, hashtags, Join, Download; grayscale channel avatar |
| Video Page → Comments | Hide Comments (off), with nested options greyed out while it is on: count, add-comment field, sort, avatars (on), grayscale avatars, published time, likes count, Like / Dislike / Reply buttons, creator heart, replies |
| Search Page | For You / Trending shelves, People Also Search For |
| Shorts | Hide Shorts (on) everywhere, or per place while it is off: sidebar entry and channel tab, Home and Subscriptions, Search, Channel and Video pages |

## How it works
- Every option is pure CSS: one `<style>` element plus `data-tidy-*` attributes on `<html>`. No MutationObserver, no timers, no DOM traversal.
- Toggling an option only flips an attribute, so changes apply instantly without a reload.
- All selectors live in the `OPTIONS` array at the top of the file. The header comment explains how to add a new option.
