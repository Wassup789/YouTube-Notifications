var wyn = {};
    wyn.version = chrome.runtime.getManifest().version,
    wyn.notificationSound = new Audio("sound/notification.mp3"),
    wyn.isConnected = false,
    wyn.isTimedout = false,
    wyn.batchChecking = false,
    wyn.hasBatchChanged = false,
    wyn.activeBatchCheckings = [],
    wyn.activeCheckings = [],
    wyn.strings = {
        "notification_watch": getString("notificationWatch"),
        "notification_watch_icon": "img/ic_play.png",
        "notification_close": getString("notificationClose"),
        "notification_close_icon": "img/ic_close.png",
        "notification_watchlater": getString("notificationWatchLater"),
        "notification_watchlater_icon": "img/ic_watchlater.png",
        "notification_addPlaylist": getString("notificationAddPlaylistPrefix"),
        "notification_addPlaylistPlaceholder": getString("background_notificationAddPlaylistPlaceholder"),
        "notification_addPlaylist_icon": "img/ic_library_add.png",
        "notification_addPotplayer": getString("notificationAddPotplayer"),
        "notification_addPotplayer_icon": "img/ic_library_add.png",
        "notification_playPotplayer": getString("notificationPlayPotplayer"),
        "notification_playPotplayer_icon": "img/ic_play.png",
        "notification_retry": getString("notificationRetry"),
        "notification_retry_icon": "img/ic_refresh.png",
        "notification_main_icon": "img/ic_youtube.png",
        "notification_appIconMaskUrl": "img/alpha.png",
        "notification_log_check": getString("notificationLogCheck"),
        "notification_log_new": getString("notificationLogNew"),
        "notification_playlistVideoAddSuccess": getString("playlistVideoAddSuccess"),
        "notification_playlistVideoAddSuccessInfix": getString("playlistVideoAddSuccessInfix"),
        "notification_playlistVideoAddSuffix": getString("playlistVideoAddSuffix"),
        "notification_playlistVideoAddExist": getString("playlistVideoAddExist"),
        "notification_playlistVideoAddExistInfix": getString("playlistVideoAddExistInfix"),
        "notification_playlistVideoAddFailure": getString("playlistVideoAddFailure"),
        "snackbar_nonewvideos": getString("snackbarNoNewVideos"),
        "connect_success": getString("connectSuccess"),
        "connect_failed": getString("connectFailed"),
        "update_channels_init": getString("updateChannelsInit"),
        "update_channels_complete": getString("updateChannelsComplete"),
        "update_channels_failed": getString("updateChannelsFailed"),
        "update_channels_failed_channel_prefix": getString("updateChannelsFailedChannelPrefix"),
        "update_channels_failed_channel_suffix": getString("updateChannelsFailedChannelSuffix"),
        "add_channel_init": getString("addChannelInit"),
        "add_channel_failed": getString("addChannelFailed"),
        "removed_channel": getString("removedChannel"),
        "remove_channel": getString("removeChannel"),
        "import_failed": getString("importFailed"),
        "log_color_prefix": "%c",
        "log_color_green": "font-weight: bold; color: #2E7D32",
        "log_color_red": "font-weight: bold; color: #B71C1C",
        "info_views": getCommonString("views"),
        "info_likes": getCommonString("likes"),
        "info_dislikes": getCommonString("dislikes"),
        "info_by": getCommonString("by"),
    },
    wyn.apiKeys = [
        "AIzaSyA8W5tYDVst9tnMpnV56OSjMvHSD70T7oU" // CHANGE THIS API KEY TO YOUR OWN
    ];
    var apiKeyIndex = Math.floor(Math.random() * wyn.apiKeys.length);
    console.log("Using API Key #" + (apiKeyIndex + 1));
    wyn.apiKey = wyn.apiKeys[apiKeyIndex];
    wyn.databaseRequest = indexedDB.open("default", 2);
    wyn.database;
    wyn.notificationSoundFinished = true;
    wyn.previousPlaylistInfo = {};

//Deal with the indexedDB
wyn.databaseRequest.onupgradeneeded = function(e) {
    var db = e.target.result;

    if(!db.objectStoreNames.contains("customMedia"))
        db.createObjectStore("customMedia");
};
wyn.databaseRequest.onsuccess = function(e) {
    wyn.database = e.target.result;

    updateNotificationSound();
};


var SORTMODE_USER = 0,
    SORTMODE_ABC = 1,
    SORTMODE_UPLOAD = 2;

var NOTIFICATIONSOUND_DEFAULT = 0,
    NOTIFICATIONSOUND_CUSTOM = 100;

var NOTIFICATION_ACTION_WATCHVIDEO = 0,
    NOTIFICATION_ACTION_WATCHLATER = 1,
    NOTIFICATION_ACTION_DISMISS = 2,
    NOTIFICATION_ACTION_ADDPLAYLIST = 3,
    NOTIFICATION_ACTION_PLAYPOTPLAYER = 100,
    NOTIFICATION_ACTION_ADDPOTPLAYER = 101,
    NOTIFICATION_ACTION_SPECIAL_RETRY = 1000;

var NotificationAction = function(action, button){
    this.action = action;
    this.button = button;
};
NotificationAction.prototype.getButton = function(index){
    var settings = JSON.parse(localStorage.getItem("settings"));
    if(settings.notificationActions[index].id == NOTIFICATION_ACTION_ADDPLAYLIST) {
        return {
            title: this.button.title + settings.notificationActions[index].playlist.name,
            iconUrl: this.button.iconUrl
        };
    }else
        return this.button;
};

var NOTIFICATION_ACTIONS = {
    [-1]: new NotificationAction(function(){},{}),
    [NOTIFICATION_ACTION_WATCHVIDEO]: new NotificationAction(
        function(ntID, btnIndex){
            var channels = JSON.parse(localStorage.getItem("channels"));
            createTab("https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
            console.log("User clicked on \"" + wyn.strings.notification_watch + "\" button; NTID: " + ntID);
            console.log("Sending user to https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
        },
        {
            title: wyn.strings.notification_watch,
            iconUrl: wyn.strings.notification_watch_icon
        }
    ),
    [NOTIFICATION_ACTION_WATCHLATER]: new NotificationAction(
        function(ntID, btnIndex){
            var channels = JSON.parse(localStorage.getItem("channels")),
                data = channels[ntID.split("-")[4]].latestVideo;
            data.index = ntID.split("-")[4];

            requestExtendedToken(data, NOTIFICATION_ACTION_WATCHLATER);
            console.log("User clicked on \"" + wyn.strings.notification_watchlater + "\" button; NTID: " + ntID);
        },
        {
            title: wyn.strings.notification_watchlater,
            iconUrl: wyn.strings.notification_watchlater_icon
        }
    ),
    [NOTIFICATION_ACTION_DISMISS]: new NotificationAction(
        function(ntID, btnIndex){
            console.log("User clicked on \"" + wyn.strings.notification_close + "\" button; NTID: " + ntID);
        },
        {
            title: wyn.strings.notification_close,
            iconUrl: wyn.strings.notification_close_icon
        }
    ),
    [NOTIFICATION_ACTION_ADDPLAYLIST]: new NotificationAction(
        function(ntID, btnIndex){
            var settings = JSON.parse(localStorage.getItem("settings")),
                channels = JSON.parse(localStorage.getItem("channels")),
                data = channels[ntID.split("-")[4]].latestVideo;
            data.index = ntID.split("-")[4];
            requestExtendedToken(data, NOTIFICATION_ACTION_ADDPLAYLIST, settings.notificationActions[btnIndex].playlist);

            console.log("User clicked on \"" + wyn.strings.notification_addPlaylist + wyn.strings.notification_addPlaylistPlaceholder + "\" button; NTID: " + ntID);
        },
        {
            title: wyn.strings.notification_addPlaylist,
            iconUrl: wyn.strings.notification_addPlaylist_icon
        }
    ),
    [NOTIFICATION_ACTION_PLAYPOTPLAYER]: new NotificationAction(
        function(ntID, btnIndex) {
            var channels = JSON.parse(localStorage.getItem("channels"));
            createTab("potplayer://" + "https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
        },
        {
            title: wyn.strings.notification_playPotplayer,
            iconUrl: wyn.strings.notification_playPotplayer_icon
        }
    ),
    [NOTIFICATION_ACTION_ADDPOTPLAYER]: new NotificationAction(
        function(ntID, btnIndex) {
            var channels = JSON.parse(localStorage.getItem("channels"));
            createTab("potplayer://" + "https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id + " /ADD");
        },
        {
            title: wyn.strings.notification_addPotplayer,
            iconUrl: wyn.strings.notification_addPotplayer_icon
        }
    ),
    [NOTIFICATION_ACTION_SPECIAL_RETRY]: new NotificationAction(
        function(ntID, btnIndex) {
            chrome.identity.getAuthToken({
                    interactive: true,
                    scopes: [
                        "https://www.googleapis.com/auth/youtube.force-ssl"
                    ]
                },
                function (current_token) {
                    if (!chrome.runtime.lastError) {
                        chrome.identity.removeCachedAuthToken({token: current_token});

                        var channels = JSON.parse(localStorage.getItem("channels")),
                            data = channels[ntID.split("-")[4]].latestVideo,
                            type = parseInt(ntID.split("-")[5]);
                        data.index = ntID.split("-")[4];

                        requestExtendedToken(data, type, wyn.previousPlaylistInfo);
                    }
                }
            );
        },
        {
            title: wyn.strings.notification_retry,
            iconUrl: wyn.strings.notification_retry_icon
        }
    )
};

// TODO: FIX "fixXXXXXStructure"
if(localStorage.getItem("channels") == null)
    localStorage.setItem("channels", JSON.stringify([]));
if(localStorage.getItem("settings") == null)
    localStorage.setItem("settings", JSON.stringify({
        notifications: {
            enabled: true,
            volume: 100
        },
        sync: {
            enabled: true
        },
        tts: {
            enabled: false,
            type: 1
        },
        addBtn: {
            enabled: true
        },
        updated: {
            enabled: false
        },
        watchlater: {
            id: ""
        },
        extendedAuthToken: "",
        sortOrder: SORTMODE_UPLOAD,
        notificationSound: NOTIFICATIONSOUND_DEFAULT,
        notificationActions: [NOTIFICATION_ACTION_WATCHVIDEO, NOTIFICATION_ACTION_WATCHLATER]
    }));

fixSettingsStructure();
fixChannelStructure();
function fixSettingsStructure(){
    var settings = JSON.parse(localStorage.getItem("settings"));

    if(typeof settings.notifications === "undefined" || settings.notifications.enabled === "undefined" || settings.notifications.volume === "undefined"){
        settings.notifications = {
            enabled: true,
            volume: 100
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.sync === "undefined" || settings.sync.enabled === "undefined"){
        settings.sync = {
            enabled: false
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.tts === "undefined" || settings.tts.enabled === "undefined" || settings.tts.type === "undefined"){
        settings.tts = {
            enabled: false,
            type: 1
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.addBtn === "undefined" || settings.addBtn.enabled === "undefined"){
        settings.addBtn = {
            enabled: true
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.updated === "undefined" || settings.updated.enabled === "undefined"){
        settings.updated = {
            enabled: false
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.watchlater === "undefined" || settings.watchlater.id === "undefined"){
        settings.watchlater = {
            id: ""
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.extendedAuthToken === "undefined"){
        settings.extendedAuthToken = "";
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.sortOrder === "undefined"){
        settings.sortOrder = SORTMODE_USER;
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.notificationSound === "undefined"){
        settings.notificationSound = NOTIFICATIONSOUND_DEFAULT;
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.notificationActions === "undefined"){
        settings.notificationActions = [
            {
                id: NOTIFICATION_ACTION_WATCHVIDEO,
                playlist: {
                    id: -1,
                    name: ""
                }
            },
            {
                id: NOTIFICATION_ACTION_WATCHLATER,
                playlist: {
                    id: -1,
                    name: ""
                }
            }
        ];
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    if(typeof settings.notificationActions !== "undefined" && settings.notificationActions.length > 0 && typeof settings.notificationActions[0] !== "object"){
        var arr = [];
        for(var i = 0; i < settings.notificationActions.length; i++) {
            arr.push({
                id: settings.notificationActions[i],
                playlist: {
                    id: -1,
                    name: ""
                }
            });
        }
        settings.notificationActions = arr;
        localStorage.setItem("settings", JSON.stringify(settings));
    }
}

/**
 * Fixes objects prior to and including 1.2.0.0
 *
 * Uses another object
 */
function fixChannelStructure() {
    var channels = JSON.parse(localStorage.getItem("channels"));

    for(var i = 0; i < channels.length; i++) {
        if(typeof channels[i].hasNewVideo !== "boolean") {
            channels[i].hasNewVideo = false;
            localStorage.setItem("channels", JSON.stringify(channels));
        }
    }
}

chrome.notifications.onClicked.addListener(onNotificationClick);
chrome.notifications.onButtonClicked.addListener(onNotificationButtonClick);
chrome.notifications.onClosed.addListener(onNotificationClosed);

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        console.log("First Launch!");
        wyn.firstLaunch();
    }else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        // Ignore for same base version
        if(details.previousVersion != thisVersion && extractBaseVersion(thisVersion) != extractBaseVersion(details.previousVersion)){
            console.log("Updated from " + details.previousVersion + " to " + thisVersion);
            chrome.browserAction.setBadgeText({text: "new"});

            var settings = JSON.parse(localStorage.getItem("settings"));
            settings.updated.enabled = true;
            localStorage.setItem("settings", JSON.stringify(settings));
        }
    }
});

wyn.firstLaunch = function(){
    createTab("chrome-extension://" + chrome.runtime.id + "/pages/first-launch.html");
};

$(function(){
    $.ajaxSetup({
        type: "GET",
        dataType: "json",
        timeout: 5*60*1000, // Timeout ajax requests after 5 minutes
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
        switch (request.type) {
            case "checkYoutubeBatch":
                sendResponse(checkYoutubeBatch());
                break;
            case "checkYoutube":
                sendResponse(checkYoutube(request.name));
                break;
            case "addYoutubeChannel":
                console.log(request);
                if(request.contentScript)
                    addYoutubeChannel(request.name, true, ADD_TYPE_CHANNELID);
                else
                    addYoutubeChannel(request.name, false, (typeof request.isChannelId !== "undefined" ? (request.isChannelId ? ADD_TYPE_CHANNELID : ADD_TYPE_DEFAULT) : ADD_TYPE_DEFAULT));
                break;
            case "addYoutubePlaylist":
                addYoutubeChannel(request.name, false, ADD_TYPE_PLAYLIST);
                break;
            case "testNotify":
                sendResponse(wyn.testNotify());
                break;
            case "removeYoutube":
                if(request.contentScript)
                    sendResponse(removeYoutube(request.num, request.name, true));
                else
                    sendResponse(removeYoutube(request.num, request.name));
                break;
            case "doesYoutubeExist":
                sendResponse(doesYoutubeExist(request.id, request.index));
                break;
            case "showAddButton":
                var settings = JSON.parse(localStorage.getItem("settings"));
                sendResponse(settings.addBtn.enabled && !settings.sync.enabled);
                break;
            case "watchNotificationButton":
                var settings = JSON.parse(localStorage.getItem("settings"));
                sendResponse(settings.sync.enabled);
                break;
            case "updateNotificationSound":
                sendResponse(updateNotificationSound());
                break;
            case "onSettingsOpen":
                sendResponse(resetChannelsHasNewVideo(true));
                break;
            case "syncWithYoutube":
                sendResponse(syncWithYoutube());
                break;
        }
    });

    checkYoutubeStatus();
});

/**
 *  Gets the string from the locales appropriate to background.js
 *
 *  @param {string} name A valid localized string which doesn't include 'settingsJs'
 *  @returns {string} The localized string
 */
function getString(name) {
    return chrome.i18n.getMessage("background_" + name);
}

/**
 *  Gets the string from the locales
 *
 *  @param {string} name A valid localized string which doesn't include 'common'
 *  @returns {string} The localized string
 */
function getCommonString(name) {
    return chrome.i18n.getMessage("common_" + name);
}

/**
 *  Updates all channels stored's information
 *  Request is made once.
 */
function updateChannelsInfo(runBatch){
    console.log(wyn.strings.update_channels_init);

    var channels = JSON.parse(localStorage.getItem("channels"));
    var channelIdList = "";
    for(var i = 0; i < channels.length; i++){
        if(channels[i].id != channels[i].playlistId)
            channelIdList += channels[i].id + ",";
    }
    channelIdList = channelIdList.substring(0, channelIdList.length-1);
    var url = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&maxResults=1&id=" + channelIdList + "&key=" + wyn.apiKey,
        url2 = "https://www.googleapis.com/youtube/v3/playlists?part=snippet&maxResults=1&id=" + channelIdList + "&key=" + wyn.apiKey;
    $.ajax({
        url: url,
        error: function(){
            console.log(wyn.strings.update_channels_failed);
        },
        success: function(data){
            for(var i = 0; i < channels.length; i++) {
                for(var j = 0; j < data.items.length; j++){
                    if(data.items[j].id == channels[i].id){
                        channels[i].name                = data.items[j].snippet.title;
                        channels[i].thumbnail            = data.items[j].snippet.thumbnails.default.url;
                        channels[i].viewCount            = data.items[j].statistics.viewCount;
                        channels[i].subscriberCount        = data.items[j].statistics.subscriberCount;
                        break;
                    }
                }
                var channelsSave = JSON.parse(localStorage.getItem("channels"));
                channelsSave[i] = channels[i];
                localStorage.setItem("channels", JSON.stringify(channelsSave));
            }

            $.ajax({
                url: url2,
                error: function(){
                    console.log(wyn.strings.update_channels_failed);
                },
                success: function(data){
                    for(var i = 0; i < channels.length; i++) {
                        for(var j = 0; j < data.items.length; j++){
                            if(data.items[j].id == channels[i].id){
                                channels[i].name                = data.items[j].snippet.title;
                                channels[i].altName                = data.items[j].snippet.channelTitle;
                                channels[i].thumbnail            = data.items[j].snippet.thumbnails.default.url;
                                break;
                            }
                        }
                        var channelsSave = JSON.parse(localStorage.getItem("channels"));
                        channelsSave[i] = channels[i];
                        localStorage.setItem("channels", JSON.stringify(channelsSave));
                    }
                    if(runBatch) {
                        syncWithYoutube();
                        checkYoutubeBatch();
                    }
                }
            });
        }
    });
}

/**
 *  Pings the YouTube Data API servers
 *
 *  Fix: repeated code
 */
function checkYoutubeStatus(){
    var url = "https://www.googleapis.com/youtube/v3/videos";
    $.ajax({
        url: url,
        statusCode: {
            400: function() {
                wyn.isConnected = true;
                chrome.extension.sendMessage({type: "createToast", message: wyn.strings.connect_success});
                console.log(wyn.strings.log_color_prefix + wyn.strings.connect_success, wyn.strings.log_color_green);
                updateChannelsInfo(true);
                setInterval(function(){
                    checkYoutubeBatch();
                }, 1000*60*5);
                setInterval(function(){
                    syncWithYoutube();
                }, 1000*60*30);
            },
            403: function() {
                var apiKeyIndex = Math.floor(Math.random() * wyn.apiKeys.length);
                console.log("Using API Key #" + (apiKeyIndex + 1) + " due to limited quota");
                wyn.apiKey = wyn.apiKeys[apiKeyIndex];
                checkYoutubeStatus();
                return;
            }
        },
        error: function(XMLHttpRequest, textStatus, error) {
            if(XMLHttpRequest.status == 403){
                var apiKeyIndex = Math.floor(Math.random() * wyn.apiKeys.length);
                console.log("Using API Key #" + (apiKeyIndex + 1) + " due to limited quota");
                wyn.apiKey = wyn.apiKeys[apiKeyIndex];
                checkYoutubeStatus();
                return;
            }

            if(XMLHttpRequest.statusText != "OK" && XMLHttpRequest.status != 400){
                wyn.isConnected = false;
                chrome.extension.sendMessage({type: "createToast", message: wyn.strings.connect_failed});
                console.log(wyn.strings.log_color_prefix + wyn.strings.connect_failed, wyn.strings.log_color_green);
                if(!wyn.isTimedout){
                    wyn.isTimedout = true;
                    setTimeout(function(){
                        wyn.isTimedout = false;
                        checkYoutubeStatus();
                    }, 1000*60);
                }
            }
        },
        success: function(data) {
            if(data.status == "success" && !wyn.isConnected){
                wyn.isConnected = true;
                chrome.extension.sendMessage({type: "createToast", message: wyn.strings.connect_success});
                console.log(wyn.strings.log_color_prefix + wyn.strings.connect_success, wyn.strings.log_color_green);
                updateChannelsInfo(true);
                setInterval(function(){
                    checkYoutubeBatch();
                }, 1000*60*5);
                setInterval(function(){
                    syncWithYoutube();
                }, 1000*60*30);
            }else{
                wyn.isConnected = false;
                chrome.extension.sendMessage({type: "createToast", message: wyn.strings.connect_failed});
                console.log(wyn.strings.log_color_prefix + wyn.strings.connect_failed, wyn.strings.log_color_green);
                if(!wyn.isTimedout){
                    wyn.isTimedout = true;
                    setTimeout(function(){
                        wyn.isTimedout = false;
                        checkYoutubeStatus();
                    }, 1000*60);
                }
            }
        }
    });
}

/**
 *  Adds a new channel
 *
 *  @param {string} name The name of the channel to get information from.
 *  @param {boolean} [fromContentScript=false] If the request was from a content script
 *  @param {boolean} [type=ADD_TYPE_DEFAULT] The search type
 */
var ADD_TYPE_DEFAULT = 0,
    ADD_TYPE_CHANNELID = 1,
    ADD_TYPE_PLAYLIST = 2;
function addYoutubeChannel(name, fromContentScript, type){
    fromContentScript = fromContentScript || false;
    type = type || ADD_TYPE_DEFAULT;

    var url;
    switch(type) {
        case ADD_TYPE_DEFAULT:
            url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel,playlist&maxResults=1&q=" + name + "&key=" + wyn.apiKey;
            break;
        case ADD_TYPE_PLAYLIST:
            url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=1&q=" + name + "&key=" + wyn.apiKey;
            break;
    }

    console.log(wyn.strings.add_channel_init + "\"" + name + "\"");
    if(type == ADD_TYPE_CHANNELID){
        addYoutubeChannelPost({items: [{id: {channelId: name}}]});
    }else{
        $.ajax({
            url: url,
            error: function(data) {
                console.log(wyn.strings.add_channel_failed + "\"" + name + "\"");
                if(!fromContentScript)
                    chrome.extension.sendMessage({type: "addChannelFailed"});
            },
            success: addYoutubeChannelPost
        });
    }
    
    function addYoutubeChannelPost(data) {
        if(data.items.length == 1){
            if(type == ADD_TYPE_PLAYLIST || data.items[0].id.kind == "youtube#playlist") {// Playlists don't need another AJAX request
                var output = {
                    "id": data.items[0].id.playlistId,
                    "playlistId": data.items[0].id.playlistId,
                    "name": data.items[0].snippet.title,
                    "altName": data.items[0].snippet.channelTitle,
                    "thumbnail": data.items[0].snippet.thumbnails.default.url,
                    "viewCount": -1,
                    "subscriberCount": -1,
                    "latestVideo": {
                        "id": "",
                        "title": "",
                        "description": "",
                        "timestamp": "",
                        "thumbnail": "",
                        "views": "",
                        "duration": "",
                        "likes": "",
                        "dislikes": ""
                    },
                    "hasNewVideo": false
                };

                var arr = JSON.parse(localStorage.getItem("channels"));
                arr.push(output);
                localStorage.setItem("channels", JSON.stringify(arr));
                checkYoutube(arr.length - 1, false, true);
            }else{
                var id = data.items[0].id.channelId;
                var url = "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&maxResults=1&id=" + id + "&key=" + wyn.apiKey;
                $.ajax({
                    url: url,
                    success: function (data) {
                        var output = {
                            "id": data.items[0].id,
                            "playlistId": data.items[0].contentDetails.relatedPlaylists.uploads,
                            "name": data.items[0].snippet.title,
                            "altName" : "",
                            "thumbnail": data.items[0].snippet.thumbnails.default.url,
                            "viewCount": data.items[0].statistics.viewCount,
                            "subscriberCount": data.items[0].statistics.subscriberCount,
                            "latestVideo": {
                                "id": "",
                                "title": "",
                                "description": "",
                                "timestamp": "",
                                "thumbnail": "",
                                "views": "",
                                "duration": "",
                                "likes": "",
                                "dislikes": ""
                            },
                            "hasNewVideo": false
                        };
                        var arr = JSON.parse(localStorage.getItem("channels"));
                        arr.push(output);
                        localStorage.setItem("channels", JSON.stringify(arr));
                        if (fromContentScript) {
                            chrome.tabs.query({active: true}, function (tabs) {
                                tabs.forEach(function (tab) {
                                    chrome.tabs.sendMessage(tab.id, {
                                        type: "contentScript_response",
                                        responseType: true,
                                        id: data.items[0].id
                                    });
                                });
                            });
                        }
                        checkYoutube(arr.length - 1, false, true);
                    }
                });
            }
        }else{
            console.log(wyn.strings.add_channel_failed + "\"" + name + "\"");
            if(!fromContentScript)
                chrome.extension.sendMessage({type: "addChannelFailed"});
        }
    }
}

/**
 *  Removes an existing channel
 *
 *  @param {number} type The type of the channel name (0 = index, 1 = channelID)
 *  @param {string} name The name of the channel's name
 *  @param {boolean} [fromContentScript=false] If the request was from a content script
 */
function removeYoutube(type, name, fromContentScript){
    fromContentScript = fromContentScript || false;

    type = parseInt(type);
    if(type == 0){
        var id = parseInt(name),
            channels = JSON.parse(localStorage.getItem("channels")),
            channelName = channels[id].name;
        console.log(wyn.strings.remove_channel + "\"" + channelName + "\"");
        channels.splice(id, 1);
        localStorage.setItem("channels", JSON.stringify(channels));

        chrome.extension.sendMessage({type: "updateData", newData: false});
        chrome.extension.sendMessage({type: "createToast", message: wyn.strings.removed_channel + "\"" + channelName + "\""});
    }else if(type == 1){
        var channels = JSON.parse(localStorage.getItem("channels"));
        for(var i = 0; i < channels.length; i++){
            if(channels[i].id == name){
                var channelName = channels[i].name;
                channels.splice(i, 1);
                console.log(wyn.strings.remove_channel + "\"" + channelName + "\"");
                localStorage.setItem("channels", JSON.stringify(channels));

                chrome.extension.sendMessage({type: "updateData", newData: false});
                chrome.extension.sendMessage({type: "createToast", message: wyn.strings.removed_channel + "\"" + channelName + "\""});
                if(fromContentScript){
                    chrome.tabs.query({active: true}, function(tabs){
                        tabs.forEach(function(tab){
                            chrome.tabs.sendMessage(tab.id, {type: "contentScript_response", responseType: false, id: name});
                        });
                    });
                }
                return;
            }
        }
        return false;
    }
}

/**
 *  Checks if a YouTube channel exists
 *
 *  @param {string} id The name of the channel's ID
 *  @param {number} index The index for an element (for injected.js)
 */
function doesYoutubeExist(id, index){
    var channels = JSON.parse(localStorage.getItem("channels"));
    for(var i = 0; i < channels.length; i++){
        if(channels[i].id == id)
            return {status: true, index: index};
    }
    return {status: false, index: index};
}

/**
 *  Checks a specific YouTube channel
 *
 *  @param {number} num The index of the YouTube channel (located in localStorage item: "channels"
 *  @param {boolean} [batch=false] If the request is from a batch check (see function: checkYoutubeBatch)
 *  @param {boolean} [isNewItem=false] If this channel is new and the data has to be pushed
 */
function checkYoutube(num, batch, isNewItem) {
    batch = batch || false;
    isNewItem = isNewItem || false;
    wyn.activeCheckings[num] = true;

    var channels = JSON.parse(localStorage.getItem("channels"));
    var url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5&playlistId=" + channels[num].playlistId + "&key=" + wyn.apiKey;
    //var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=date&safeSearch=none&type=video&maxResults=1&channelId=" + channels[num].id + "&key=" + wyn.apiKey;//Old

    console.log(wyn.strings.notification_log_check + channels[num].name);
    $.ajax({
        url: url,
        error: function(data) {
            wyn.activeCheckings[num] = false;
            /*wyn.activeBatchCheckings[num] = false;
            for(var i = 0; i < wyn.activeBatchCheckings.length; i++)
                if(wyn.activeBatchCheckings[i])
                    return;
            wyn.batchChecking = false;*/
        },
        success: function(data) {
            /*
            Why the use of playlistItems instead of search
            playlistItems = 3 quota
            search = 100 quota (33x more quota per request)
            */

            data.items.sort(function(a, b){//START OF OLD
                var a = new Date(a.snippet.publishedAt),
                    b = new Date(b.snippet.publishedAt);
                if(a > b) return -1;
                if(a < b) return 1;
                return 0;
            });//END OF OLD

            if(data.items.length < 1)
                return;

            var videoId = data.items[0].snippet.resourceId.videoId,//OLD
            //var videoId = data.items[0].id.videoId,
                url = "https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&maxResults=1&id=" + videoId + "&key=" + wyn.apiKey,
                prevVideoId = channels[num].latestVideo.id,
                prevTimestamp = channels[num].latestVideo.timestamp;
            channels[num].latestVideo.id = videoId;
            channels[num].latestVideo.title = data.items[0].snippet.title;
            channels[num].latestVideo.description = data.items[0].snippet.description.substring(0,100).replace(/(\r\n|\n|\r)/gm," ");
            channels[num].latestVideo.timestamp = Date.parse(data.items[0].snippet.publishedAt)/1000;
            channels[num].latestVideo.thumbnail = data.items[0].snippet.thumbnails.high.url.replace("https:/", "http://");

            /*console.log("=====START OF " + channels[num].name + "=====");
            console.log("Previous Stamp: " + prevTimestamp);
            console.log("New Stamp: " + channels[num].latestVideo.timestamp);
            console.log("Previous ID: " + prevVideoId);
            console.log("New ID: " + channels[num].latestVideo.id);
            console.log("Change? " + (prevTimestamp >= channels[num].latestVideo.timestamp ? "true": "false"));
            console.log("=====END OF " + channels[num].name + "=====");*/

            if(prevTimestamp >= channels[num].latestVideo.timestamp){
                wyn.activeCheckings[num] = false;
                if(!batch) {
                    for (var i = 0; i < wyn.activeCheckings.length; i++){
                        if (wyn.activeCheckings[i])
                            return;
                    }

                    chrome.extension.sendMessage({type: "updateData", newData: false});
                    chrome.extension.sendMessage({type: "createToast", message: wyn.strings.snackbar_nonewvideos});
                }
                if(isNewItem)
                    chrome.extension.sendMessage({type: "updateData", newData: true, newDataIndex: num});
                return;
            }
            $.ajax({
                url: url,
                error: function(data) {
                    wyn.activeCheckings[num] = false;
                    /*wyn.activeBatchCheckings[num] = false;
                    for(var i = 0; i < wyn.activeBatchCheckings.length; i++)
                        if(wyn.activeBatchCheckings[i])
                            return;
                    wyn.batchChecking = false;*/
                },
                success: function(data) {
                    channels[num].hasNewVideo = true;

                    channels[num].latestVideo.views = parseInt(data.items[0].statistics ? data.items[0].statistics.viewCount : NaN);
                    channels[num].latestVideo.duration = convertISO8601Duration(data.items[0].contentDetails ? data.items[0].contentDetails.duration : 0);
                    channels[num].latestVideo.likes = data.items[0].statistics ? data.items[0].statistics.likeCount : NaN;
                    channels[num].latestVideo.dislikes = data.items[0].statistics ? data.items[0].statistics.dislikeCount : NaN;

                    var channelsSave = JSON.parse(localStorage.getItem("channels"));
                    channelsSave[num] = channels[num];
                    localStorage.setItem("channels", JSON.stringify(channelsSave));

                    var info = channels[num];

                    if(batch)
                        wyn.hasBatchChanged = true;
                    info.latestVideo.likes = parseInt(info.latestVideo.likes);
                    info.latestVideo.dislikes = parseInt(info.latestVideo.dislikes);
                    var likesa = Math.round((info.latestVideo.likes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
                    var dislikesa = Math.round((info.latestVideo.dislikes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
                    if((likesa + dislikesa) > 100)
                        dislikesa--;

                    var settings = JSON.parse(localStorage.getItem("settings"));

                    var options = {
                        type: "image",
                        priority: 0,
                        title: trimTitle(info.latestVideo.title, info.name),
                        longTitle: info.latestVideo.title + " " + wyn.strings.info_by + " " + info.name,
                        message: info.latestVideo.description,
                        imageUrl: info.latestVideo.thumbnail,
                        /*iconUrl: wyn.strings.notification_main_icon,*/
                        iconUrl: channels[num].thumbnail,
                        contextMessage: info.latestVideo.duration + " | "+ info.latestVideo.views.toLocaleString() + " " + wyn.strings.info_views + " | " + likesa.toLocaleString({style: "percent"}) + "% " + wyn.strings.info_likes + " | " + dislikesa.toLocaleString({style: "percent"}) + "% " + wyn.strings.info_dislikes,
                        buttons: [
                            NOTIFICATION_ACTIONS[settings.notificationActions[0].id].getButton(0),
                            NOTIFICATION_ACTIONS[settings.notificationActions[1].id].getButton(1)
                        ]
                    };
                    var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + num;
                    console.log(wyn.strings.log_color_prefix + wyn.strings.notification_log_new + info.name, wyn.strings.log_color_green);
                    notify(ntID, options);

                    updateBadge();

                    wyn.activeCheckings[num] = false;
                    if(!batch){
                        for(var i = 0; i < wyn.activeCheckings.length; i++) {
                            if (wyn.activeCheckings[i])
                                return;
                        }
                        chrome.extension.sendMessage({type: "updateData", newData: false});
                    }
                    if(isNewItem)
                        chrome.extension.sendMessage({type: "updateData", newData: true, newDataIndex: num});
                }
            });
        }
    });
}

/**
 *  Converts an ISO-8601 formatted string to a different timestamp format (HH:MM:SS)
 *
 *  @param {string} t The ISO-8601 formmated string
 *  @returns {string} Returns duration in HH:MM:SS format
 */
function convertISO8601Duration(t){
    //dividing period from time
    var x = t.split('T'),
        duration = '',
        time = {},
        period = {},
        //just shortcuts
        s = 'string',
        v = 'variables',
        l = 'letters',
        // store the information about ISO8601 duration format and the divided strings
        d = {
            period: {
                string: x[0].substring(1,x[0].length),
                len: 4,
                // years, months, weeks, days
                letters: ['Y', 'M', 'W', 'D'],
                variables: {}
            },
            time: {
                string: x[1],
                len: 3,
                // hours, minutes, seconds
                letters: ['H', 'M', 'S'],
                variables: {}
            }
        };
    //in case the duration is a multiple of one day
    if (!d.time.string) {
        d.time.string = '';
    }

    for (var i in d) {
        var len = d[i].len;
        for (var j = 0; j < len; j++) {
            d[i][s] = d[i][s].split(d[i][l][j]);
            if (d[i][s].length>1) {
                d[i][v][d[i][l][j]] = parseInt(d[i][s][0], 10);
                d[i][s] = d[i][s][1];
            } else {
                d[i][v][d[i][l][j]] = 0;
                d[i][s] = d[i][s][0];
            }
        }
    }
    period = d.period.variables;
    time = d.time.variables;
    time.H +=   24 * period.D +
                            24 * 7 * period.W +
                            24 * 7 * 4 * period.M +
                            24 * 7 * 4 * 12 * period.Y;

    if (time.H) {
        duration = time.H + ':';
        if (time.M < 10) {
            time.M = '0' + time.M;
        }
    }

    if (time.S < 10) {
        time.S = '0' + time.S;
    }

    duration += time.M + ':' + time.S;
    return duration;
}

/**
 *  Checks all YouTube channels
 */
function checkYoutubeBatch(){
    if(wyn.batchChecking)
        return;
    //wyn.batchChecking = true;
    wyn.hasBatchChanged = false;

    console.log("Initializing YouTube channel check");
    var channels = JSON.parse(localStorage.getItem("channels"));
    for(var i = 0; i < channels.length; i++){
        setTimeout(function(i){// Debug timeout; Bug: Notifications not saving, repeated notifications; Assumption: Other channel updates overwriting
            //wyn.activeBatchCheckings[i] = true;
            checkYoutube(i, true);
        }, 100*i, i);
    }
}

/**
 * Syncs the channels with YouTube if enabled
 */
function syncWithYoutube(){
    var settings = JSON.parse(localStorage.getItem("settings"));
    if(settings.sync.enabled){
        console.log("Synchronizing channels with YouTube");
        $.ajax({
            dataType: "text",
            url: "https://www.youtube.com/feed/channels",
            error: function(){
                console.error("Failed to synchronize channels with YouTube");
            },
            success: function(data){
                var parser = new DOMParser(),
                    scripts = parser.parseFromString(data, "text/html").getElementsByTagName("script");
                for(let i = 0; i < scripts.length; i++){
                    if(scripts[i].innerHTML.indexOf("window[\"ytInitialData\"]") > -1 && scripts[i].innerHTML.indexOf("\"channelId\"") > -1){
                        eval(scripts[i].innerHTML);
                        try {
                            var channels = JSON.parse(localStorage.getItem("channels")),
                                channelsToAdd = [],
                                items = window.ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].shelfRenderer.content.expandedShelfContentsRenderer.items;
                            for(var channel of channels){
                                channel._exists = false;
                            }
                            mainItemLoop:
                            for(var item of items){
                                try {
                                    var channelId = item.channelRenderer.channelId,
                                        enabled = item.channelRenderer.subscribeButton.subscribeButtonRenderer.notificationPreferenceButton.subscriptionNotificationToggleButtonRenderer.currentStateId == 2;
                                    if(enabled){
                                        for(var channel of channels){
                                            if(channel.id === channelId) {
                                                channel._exists = true;
                                                continue mainItemLoop;
                                            }
                                        }
                                        channelsToAdd.push(channelId);
                                    }
                                }catch(e){
                                    console.error("Failed to fetch channel information from YouTube");
                                }
                            }
                            for(var j = channels.length-1; j > -1; j--){
                                if(!channels[j]._exists) {
                                    channels.splice(j, 1);
                                    continue;
                                }

                                delete channels[j]._exists;
                            }
                            localStorage.setItem("channels", JSON.stringify(channels));
                            for(var channelId of channelsToAdd){
                                addYoutubeChannel(channelId, false, ADD_TYPE_CHANNELID);
                            }
                            console.log("Finished synchronizing channels with YouTube");
                            return;
                        }catch(e) {
                            console.error("Failed to synchronize channels with YouTube");
                        }
                    }
                }
                console.error("Failed to synchronize channels with YouTube");
            }
        })
    }
}
wyn.forceRefresh = function(){checkYoutubeBatch()};

/**
 *  Creates a random alphanumberic string
 *
 *  @param {number} len The length of the random string
 *  @returns {string} Random alphanumeric string
 */
function rndStr(len){
    var text = "";
    var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for(var i = 0; i < len; i++)
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
}

/**
 *  Creates a notification if enabled
 *
 *  @param {string} ntID A random string used to identify the notification later
 *  @param {object} options Notification options (see: https://developer.chrome.com/apps/notifications#type-NotificationOptions)
 */
function notify(ntID, options){
    if(!JSON.parse(localStorage.getItem("settings")).notifications.enabled)
        return;
    
    if(typeof options.buttons[0].title === "undefined") {
        if(typeof options.buttons[1].title === "undefined")
            options.buttons = [];
        else
            options.buttons.splice(0, 1);
    }else if(typeof options.buttons[1].title === "undefined")
        options.buttons.splice(1, 1);

    var ttsOptions = JSON.parse(JSON.stringify(options));// To circumvent the reference
    delete options.longTitle;

    chrome.notifications.create(ntID, options, function(){
        /*var bc = localStorage.getItem("badgeCount");
        localStorage.setItem("badgeCount", ++bc);
        bc = localStorage.getItem("badgeCount");
        updateBadge({colour:'#e12a27', text:"" + bc});*/

        playNotificationSound();
        notifyTTS(ttsOptions);
    });
}

/**
 * Plays the notification sound
 */
function playNotificationSound() {
    if(!wyn.notificationSoundFinished)
        return;
    wyn.notificationSoundFinished = false;

    $(wyn.notificationSound).stop();
    wyn.notificationSound.currentTime = 0;
    wyn.notificationSound.volume = parseInt(JSON.parse(localStorage.getItem("settings"))["notifications"]["volume"])/100;
    wyn.notificationSound.play();
    setTimeout(function(){
        wyn.notificationSoundFinished = true;//Set to true here to prevent multiple overlapping notification sounds

        $(wyn.notificationSound).animate({volume: 0}, {
            duration: 5000,
            complete: function() {
                wyn.notificationSound.pause();
                wyn.notificationSound.currentTime = 0;
            }
        });
    }, 5000);
}

/**
 *  Ran when a notification is clicked
 *
 *  @param {string} ntID A random string used to identify the notification
 */
function onNotificationClick(ntID){
    if(typeof ntID.split("-")[4] !== "undefined") {
        var channels = JSON.parse(localStorage.getItem("channels"));
        createTab("https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
        console.log("User clicked on notification; NTID: " + ntID);
        console.log("Sending user to https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);

        resetChannelHasNewVideo(ntID.split("-")[4], true);
    }
    chrome.notifications.clear(ntID);
}

/**
 *  Ran when a notification's buttons are clicked
 *
 *  @param {string} ntID A random string used to identify the notification
 *  @param {number} btnIndex The button index
 */
function onNotificationButtonClick(ntID, btnIndex){
    var settings = JSON.parse(localStorage.getItem("settings"));
    if(typeof ntID.split("-")[5] !== "undefined") {
        NOTIFICATION_ACTIONS[(btnIndex == 0 ? NOTIFICATION_ACTION_WATCHVIDEO : NOTIFICATION_ACTION_SPECIAL_RETRY)].action(ntID, btnIndex);
    }else if(typeof ntID.split("-")[4] !== "undefined" && typeof NOTIFICATION_ACTIONS[settings.notificationActions[btnIndex].id] !== "undefined") {
        NOTIFICATION_ACTIONS[settings.notificationActions[btnIndex].id].action(ntID, btnIndex);

        resetChannelHasNewVideo(ntID.split("-")[4], true);
    }
    chrome.notifications.clear(ntID);
}

/**
 *  Ran when a notification is closed
 *
 *  @param {string} ntID A random string used to identify the notification
 *  @param {boolean} byUser If the notification was closed by the user
 */
function onNotificationClosed(ntID, byUser){
    if(typeof ntID.split("-")[4] !== "undefined" && byUser) {
        console.log("User clicked on \"X\" button; NTID: " + ntID);

        resetChannelHasNewVideo(ntID.split("-")[4], true);
    }
}

/**
 *  Opens a link in a new tab/window
 *
 *  @param {string} url The URL to open
 */
function createTab(url) {
    chrome.tabs.create({url: url});
}

/**
 *  Launches a test notification
 *  Can be launched in the option settings.js
 */
wyn.testNotify = function(){
    var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5),
        settings = JSON.parse(localStorage.getItem("settings"));
    var options = {
        type: "image",
        priority: 0,
        title: "Video " + wyn.strings.info_by + " YouTube Creator",
        longTitle: "Video " + wyn.strings.info_by + " YouTube Creator",
        message: "Insert Description Here",
        imageUrl: "img/notification_placeholder.png",
        iconUrl: wyn.strings.notification_main_icon,
        contextMessage: "12:34 | " + (5678).toLocaleString() + " " + wyn.strings.info_views + " | " + (90).toLocaleString({style: "percent"}) + "% " + wyn.strings.info_likes + " | " + (10).toLocaleString({style: "percent"}) + "% " + wyn.strings.info_dislikes,
        buttons: [
            NOTIFICATION_ACTIONS[settings.notificationActions[0].id].getButton(0),
            NOTIFICATION_ACTIONS[settings.notificationActions[1].id].getButton(1)
        ]
    };

    notify(ntID, options);
};

/**
 *  Reads the notification's title if TTS is enabled in the settings.js
 *
 *  @param {object} options Notification options (see: https://developer.chrome.com/apps/notifications#type-NotificationOptions)
 */
function notifyTTS(options) {
    if(JSON.parse(localStorage.getItem("settings")).tts.enabled){
        var voice = JSON.parse(localStorage.getItem("settings")).tts.type;
        var message = new SpeechSynthesisUtterance();
        message.voice = speechSynthesis.getVoices()[voice];
        var sList =  ["\\bEp\\b", "\\bEp.\\b", "\\bPt\\b", "\\bPt.\\b"];
        var sList2 = ["Episode", "Episode", "Part", "Part"];
        for(var i = 0; i < sList.length; i++)
            options.longTitle = options.longTitle.replace(new RegExp(sList[i], "g"), sList2[i]);
        message.text = options.longTitle;
        speechSynthesis.speak(message);
    }
}

/**
 *  Forces a notification to be displayed
 *
 *  @param {number} id The index of the video to be displayed
 */
wyn.forceNotification = function(id) {
    var info = JSON.parse(localStorage.getItem("channels"))[id];
    info.latestVideo.views = parseInt(info.latestVideo.views);
    info.latestVideo.likes = parseInt(info.latestVideo.likes);
    info.latestVideo.dislikes = parseInt(info.latestVideo.dislikes);
    var likesa = Math.round((info.latestVideo.likes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
    var dislikesa = Math.round((info.latestVideo.dislikes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
    if((likesa + dislikesa) > 100)
        dislikesa--;

    var settings = JSON.parse(localStorage.getItem("settings"));

    var options = {
        type: "image",
        priority: 0,
        title: trimTitle(info.latestVideo.title, info.name),
        longTitle: info.latestVideo.title + " " + wyn.strings.info_by + " " + info.name,
        message: info.latestVideo.description,
        imageUrl: info.latestVideo.thumbnail,
        /*iconUrl: wyn.strings.notification_main_icon,*/
        iconUrl: info.thumbnail,
        contextMessage: info.latestVideo.duration + " | "+ info.latestVideo.views.toLocaleString() + " " + wyn.strings.info_views + " | " + likesa.toLocaleString({style: "percent"}) + "% " + wyn.strings.info_likes + " | " + dislikesa.toLocaleString({style: "percent"}) + "% " + wyn.strings.info_dislikes,
        buttons: [
            NOTIFICATION_ACTIONS[settings.notificationActions[0].id].getButton(0),
            NOTIFICATION_ACTIONS[settings.notificationActions[1].id].getButton(1)
        ]
    };
    var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + id;
    console.log(wyn.strings.log_color_prefix + wyn.strings.notification_log_new + info.name, wyn.strings.log_color_green);
    notify(ntID, options);
};

/**
 * Resets a channel's timestamp
 *
 * @param num The channel index
 */
wyn.resetChannel = function(num){
    var channels = JSON.parse(localStorage.getItem("channels"));
    if(typeof channels[num] !== "undefined") {
        channels[num].latestVideo.timestamp = 0;
        localStorage.setItem("channels", JSON.stringify(channels));
    }
};

/**
 * Resets all channel timestamps
 */
wyn.resetChannels = function(){
    var channels = JSON.parse(localStorage.getItem("channels"));
    for(var i = 0; i < channels.length; i++){
        channels[i].latestVideo.timestamp = 0;
    }
    localStorage.setItem("channels", JSON.stringify(channels));
};
/**
 *  Requests the user to approve the extended OAuth request
 */
function requestExtendedToken(videoInfo, type, playlistInfo) {
    chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                "https://www.googleapis.com/auth/youtube.force-ssl"
            ]
        },
        function(token){
            if(!chrome.runtime.lastError){
                onReceiveExtendedToken(videoInfo, type, playlistInfo);
            }
        }
    );
}

/**
 *  Ran when the extended token is approved
 */
function onReceiveExtendedToken(videoInfo, type, playlistInfo) {
    chrome.identity.getAuthToken({
            interactive: false,
            scopes: [
                "https://www.googleapis.com/auth/youtube.force-ssl"
            ]
        }, function(access_token) {
            if(chrome.runtime.lastError)
                return;

            var settings = JSON.parse(localStorage.getItem("settings"));

            if(type != NOTIFICATION_ACTION_WATCHLATER) {
                onReceiveExtendedTokenPost(access_token, type, videoInfo, playlistInfo);
            }else{
                if (settings.watchlater.id == "") {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true");
                    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
                    xhr.onload = function () {
                        var data = JSON.parse(this.response),
                            watchLaterPlaylist = data.items[0].contentDetails.relatedPlaylists.watchLater;

                        settings.watchlater.id = watchLaterPlaylist;
                        localStorage.setItem("settings", JSON.stringify(settings));

                        onReceiveExtendedTokenPost(access_token, type, videoInfo, {id: settings.watchlater.id, name: "Watch Later"});
                    };
                    xhr.send();
                } else
                    onReceiveExtendedTokenPost(access_token, type, videoInfo, {id: settings.watchlater.id, name: "Watch Later"});
            }
    });
}

/**
 *  Ran after we receive the access token and playlist
 */
function onReceiveExtendedTokenPost(access_token, type, videoInfo, playlistInfo) {
    var settings = JSON.parse(localStorage.getItem("settings")),
        xhr = new XMLHttpRequest(),
        requestData = {
            snippet: {
                playlistId: playlistInfo.id,
                resourceId: {
                    kind: "youtube#video",
                    videoId: videoInfo.id
                }
            }
        };

    xhr.open("POST", "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet");
    xhr.setRequestHeader("Authorization", "Bearer " + access_token);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function(){
        var data = JSON.parse(this.response),
            title = wyn.strings.notification_playlistVideoAddSuccess + playlistInfo.name,
            message = "\"" + videoInfo.title + "\"" + wyn.strings.notification_playlistVideoAddSuccessInfix + playlistInfo.name + wyn.strings.notification_playlistVideoAddSuffix;

        var buttons = [
            NOTIFICATION_ACTIONS[NOTIFICATION_ACTION_WATCHVIDEO].getButton(0)
        ];
        if(data.error) {
            if(data.error.code == 409) {
                title = wyn.strings.notification_playlistVideoAddExist + playlistInfo.name;
                message = "\"" + videoInfo.title + "\"" + wyn.strings.notification_playlistVideoAddExistInfix + playlistInfo.name + wyn.strings.notification_playlistVideoAddSuffix;
            }else{
                title = wyn.strings.notification_playlistVideoAddFailure;
                message = "Error code: " + data.error.code + "\nError message: " + data.error.message + "\nReason: " + data.error.errors[0].reason;

                buttons.push(NOTIFICATION_ACTIONS[NOTIFICATION_ACTION_SPECIAL_RETRY].getButton(0));
            }
        }
        wyn.previousPlaylistInfo = playlistInfo;

        var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + videoInfo.index + "-" + type;
        var options = {
            type: "basic",
            priority: 0,
            title: title,
            message: message,
            iconUrl: videoInfo.thumbnail,
            buttons: buttons
        };

        chrome.notifications.create(ntID, options, function(){
            playNotificationSound();
            notifyTTS(options);
        });
    };
    xhr.send(JSON.stringify(requestData));
}

/**
 * Initializes/updates the correct notification sound
 */
function updateNotificationSound() {
    setTimeout(function() {//Somehow make this more... smooth
        var settings = JSON.parse(localStorage.getItem("settings"));
        switch (settings.notificationSound) {
            case NOTIFICATIONSOUND_CUSTOM:
                var transaction = wyn.database.transaction(["customMedia"], "readonly"),
                    store = transaction.objectStore("customMedia"),
                    data = store.get(0);

                data.onsuccess = function () {
                    if (typeof data.result !== "undefined")
                        wyn.notificationSound = new Audio(data.result.file);
                };
                break;
            default:
                wyn.notificationSound = new Audio("sound/notification.mp3");
                break;
        }
    }, 0);
}

const MAX_TITLE_LENGTH = 80;

/**
 * Trims a title to the maximum title length
 * @param title The title of the video
 * @param name The name of the video's author
 * @returns {string} A formatted notification title with a length of MAX_TITLE_LENGTH
 */
function trimTitle(title, name) {
    var suffix = " " + wyn.strings.info_by + " " + name,
        title = title.substring(0, MAX_TITLE_LENGTH - suffix.length);

    if(title.length == MAX_TITLE_LENGTH - suffix.length)
        title = title.substring(0, title.length - 3) + "...";

    return title + suffix;
}

/**
 * Updates the badge count to the proper amount
 */
function updateBadge() {
    var channels = JSON.parse(localStorage.getItem("channels")),
        count = 0;
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].hasNewVideo)
            count++;
    }

    if(count < 1)
        chrome.browserAction.setBadgeText({text: ""});
    else{
        chrome.browserAction.getBadgeText({}, function(result){
            if(result == "new")
                return;
            else
                chrome.browserAction.setBadgeText({text: count.toString()});
        });
    }
}

/**
 * Resets all channels' hasNewVideo variable to false
 *
 * Not to be mistaken with resetChannelHasNewVideo
 *
 * @param updateSettingsBadge Should the badges be updated
 */
function resetChannelsHasNewVideo(updateSettingsBadge) {
    var channels = JSON.parse(localStorage.getItem("channels"));
    for (var i = 0; i < channels.length; i++) {
        channels[i].hasNewVideo = false;
    }
    localStorage.setItem("channels", JSON.stringify(channels));

    if(updateSettingsBadge)
        updateBadge();
}

/**
 * Resets a singular channel's hasNewVideo variable to false
 *
 * Not to be mistaken with resetChannelsHasNewVideo
 *
 * @param num The channel's index
 * @param updateSettingsBadge Should the badges be updated
 */
function resetChannelHasNewVideo(num, updateSettingsBadge) {
    var channels = JSON.parse(localStorage.getItem("channels"));
    if(typeof channels[num] !== "undefined")
        channels[num].hasNewVideo = false;
    localStorage.setItem("channels", JSON.stringify(channels));

    if(updateSettingsBadge)
        updateBadge();
}

/**
 * Extracts the base version of the extension
 * Ex: 1.2.3.4 -> 1.2.3
 *
 * @param version The version of the extension
 */
function extractBaseVersion(version){
    var arr = version.split(".");
    arr.pop();
    return arr.join(".");
}
