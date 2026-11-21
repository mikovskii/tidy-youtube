# Tidy for YouTube

A Tampermonkey userscript that hides clutter in the YouTube interface: Shorts, inserted shelves, extra buttons and more. 21 toggles, all enabled by default.

## Install
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. In Chromium browsers (Chrome / Arc / Dia), enable **Allow User Scripts** for Tampermonkey (Extensions → Tampermonkey → Details).
3. Open [tidy-youtube.user.js](https://raw.githubusercontent.com/mikovskii/tidy-youtube/main/tidy-youtube.user.js) and click **Install**. Tampermonkey will keep it updated automatically.
4. Settings: Tampermonkey icon → **Tidy for YouTube settings**.

## Options

| Section | Options |
|---|---|
| Header | Voice search button, Create button |
| Home Page | Breaking News / Trending and similar shelves |
| Left Navigation Bar | Kids, Movies, Gaming, News, Sports; grayscale subscription avatars |
| Video Page | Watermark, hashtags, Join, Download, comment avatars; grayscale channel avatar |
| Search Page | For You / Trending shelves, People Also Search For |
| Shorts | Sidebar entry and channel tab, Home and Subscriptions, Search, Channel and Video pages |

## How it works
- Every option is pure CSS: one `<style>` element plus `data-tidy-*` attributes on `<html>`. No MutationObserver, no timers, no DOM traversal.
- Toggling an option only flips an attribute, so changes apply instantly without a reload.
- All selectors live in the `OPTIONS` array at the top of the file. The header comment explains how to add a new option.
