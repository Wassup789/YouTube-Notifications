Installation
=====
## Requesting an API key

It is recommended to generate your own YouTube Data API v3 key if you plan on running this extension yourself.

1. Head over to the [YouTube Data API website][YTAPI_WEBSITE]
2. Follow the instructions to request an API key
3. Retrieve your API key generated [here][GAPI_KEY]
4. Open/modify `js/background.js`
5. In the file, find `wyn.apiKeys`
6. Replace the API key found there with your own
7. Next, follow the build instructions below

[YTAPI_WEBSITE]: https://developers.google.com/youtube/v3/getting-started#intro
[GAPI_KEY]: https://console.developers.google.com/apis/api/youtube.googleapis.com/credentials

## Build
To build, run the following commands (Node.JS must be installed):

    npm install -g grunt-cli vulcanize bower
    bower install
    npm install

(Note: On linux, you need to run the first command as root, to do so, simply affix `sudo` to the first command and input your credentials)

Next, run the following grunt command to build the required HTML files

    grunt vulcanize
    
## Loading into Google Chrome / Chromium

To load the unpacked extension into Google Chrome:

1. Go to [chrome://extensions](chrome://extensions)
2. In the top-right hand corner, check the `Developer mode` toggle
3. Developer tools should appear, click on the `Load unpacked` button
4. Select the directory in which the extension was built

## Debug
To debug, run this command in the background

    grunt

This command will automatically generate a vulcanized settings.html file because of [Chrome's CSP][CSP_INFO].
To change the HTML contents, only edit the **settings_edit.html** and not the settings.html file.

  [CSP_INFO]: https://developer.chrome.com/extensions/contentSecurityPolicy
