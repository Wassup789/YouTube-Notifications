Changelog
=====
## v1.X.X.X (XX-XX-20XX)
 * Added channel sorting
 * Added playlist support
 * Added custom notification sounds via local upload
 * Added import channel empty state
 * Removed page refresh upon new channels/playlists
 * New channel additions will be scrolled to view upon addition
 * Video thumbnails now use less data
 * Switched table layout to flexbox
 * Ported from Material Design Lite to Polymer
   * `<select>` tags are now material
   * Added launch screen for loading the vulcanized file
   * Read the [INSTALL.md](https://github.com/Wassup789/YouTube-Notifications/blob/master/INSTALL.md) file for installation instructions

## v1.1.2.0 (08-05-2016)
 * Altered the popup's uploads search to include video titles
 * Implemented watch later feature
 * Implemented import subscriptions selection

## v1.1.1.0 (04-15-2016)
 * Reverted to old video uploads method due to quota exhaustion
 * Added four additional API keys
 * Implemented search functionality
 * Added subscription importing

## v1.1.0.5 (02-02-2016)
 * Changed channel updater to use the search API instead of the channel's playlist API (This allows more up-to-date updating)
 * Fixed bug where channels would stop updating
 * Added locales/languages
 * Added a 'load more' button in the information popup
 * Added a 'view subscriptions' button in the edit settings tab

## v1.1.0.4 (12-26-2015)
 * Decreased update interval from every 10 minutes to every 5 minutes
 * Fixed channel information not updating properly
 * Fixed videos not showing the right video order for notifications and displays

## v1.1.0.3 (10-27-2015)
 * Implemented 'Add to YouTube Notifications" button to videos, channels and subscription lists
 * Added a first launch screen
 * Optimized channel update requests
 * Added a viewable changelog when updated
 * Added a help button under the "more" icon

## v1.1.0.2 (09-26-2015)
 * Fixed bug where notifications only update once

## v1.1.0.1 (09-21-2015)
 * Fixed bug that causes new channel additions to not refresh options menu
 * Fixed alignment for channel video list
 * Fixed number comma separators
 * Optimized GET requests to use up less quota

## v1.1.0.0 (09-18-2015)
 * Updated to comply with Chrome Web Store guidelines
 * Requests to YouTube's Data API is now client side

## v1.0.9.2 (09-16-2015)
 * Reworked majority of files
 * New UI
 * Uses YouTube Data API v3
 * Uses another server to limit requests (Could be slow)

## v1.0.9.1 (07-15-2014)
 * Major connection error fixed
 * Requires new permission to access ytimg.com for video images
 * Swapped request URLs from XML to JSON
 * Removed unreliable JSON search
 * TTS abbreviation fix
 * Fixed notification click

## v1.0.9.0 (07-12-2014)
 * First major overhaul
 * Added source code to GitHub
   * No history of past versions
 * Design revamp
 * Page transition changed
 * More quick transitions
 * Increased input sizes
 * Alignment changes
 * Fixed channel does not exist appearing in random occasions
 * Changed "New Channel" button animation
 * Added total channels to both pages
 * Added channel listing names
 * Added editable refresh interval
   * Only available in minutes
 * Added animations toggle
 * Added manual refresh button
 * Added TTS support
   * Uses the new speechSynthesizer
   * Available voices: Google US, Google UK Male, Google UK Female
 * Import / Export Channels
   * Added ability to import channels
   * Added export channels
   * JSON format

## v1.0.8.0 (02-14-2014)
**Versions after this have extremely minor updates and some unnecessary ones**
 * Added channel doesn't exist background
 * Fixed blank images

## v1.0.7.0 (02-08-2014)
 * Stability changes
 * Added error notifcations

## v1.0.6.0 (02-08-2014)
 * Added transitions
 * Added ellipsis to options
 * Changed API (Youtube Data API v1 -> Youtube Data API v2)
 * Added proper updating (VIA Dropbox)

## v1.0.5.0 (02-04-2014)
 * Minified releases (1085KB -> 109KB)
 * Added new video = green background
 * Manifest.json touchup

## v1.0.4.0 (02-04-2014)
 * Added total # of channels

## v1.0.3.0 (01-29-2014)
 * Alignment changes

## v1.0.2.0
 * Removed name from header

## v1.0.1.0
 * Initial Release
