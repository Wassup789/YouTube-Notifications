var wyns = {};
wyns.apiKey = chrome.extension.getBackgroundPage().wyn.apiKey,
    wyns.channelsToAdd = 0,
    wyns.channelsToAdd2 = -1,
    wyns.strings = {
        "connect_failed": chrome.extension.getBackgroundPage().wyn.strings.connect_failed,
        "updating": getString("updating"),
        "saved": getString("saved"),
        "user_remove_channel": getString("userRemoveChannel"),
        "add_channels_failed": getString("addChannelsFailed"),
        "please_wait": getString("pleaseWait"),
        "please_wait_while": getString("pleaseWaitWhile"),
        "removalPrompt": getString("removalPrompt"),
        "info_published": getCommonString("published"),
        "info_subscribers": getCommonString("subscribers"),
        "info_views": getCommonString("views"),
        "info_likes": getCommonString("likes"),
        "info_dislikes": getCommonString("dislikes"),
        "info_ago": getCommonString("ago"),
        "info_publishedOn": getCommonString("publishedOn"),
        "info_by": getCommonString("by"),
        "info_version": getCommonString("version"),
        "date_day": getCommonString("dateDay"),
        "date_days": getCommonString("dateDays"),
        "date_hour": getCommonString("dateHour"),
        "date_hours": getCommonString("dateHours"),
        "date_minute": getCommonString("dateMinute"),
        "date_minutes": getCommonString("dateMinutes"),
        "date_second": getCommonString("dateSecond"),
        "date_seconds": getCommonString("dateSeconds"),
        "playlist_by": getCommonString("playlistBy")
    },
    wyns.previousLastListItem;
wyns.databaseRequest;
wyns.database;
wyns.currentRemovalId = -1;

var $Poly;

var SORTMODE_USER = 0,
    SORTMODE_ABC = 1,
    SORTMODE_UPLOAD = 2;

var NOTIFICATIONSOUND_DEFAULT = 0,
    NOTIFICATIONSOUND_CUSTOM = 100;

var sortElem_custom, sortElem_latestUpload, sortElem_abc;

window.addEventListener("WebComponentsReady", function(){
    $(function(){
        $Poly = Polymer.dom;

        // Open up the indexedDB vault

        wyns.databaseRequest = indexedDB.open("default", 2);
        wyns.databaseRequest.onsuccess = function(e) {
            wyns.database = e.target.result;

            updateNotificationMedia(true);
        };

        sortElem_custom = $("#menu_sortMode_custom paper-radio-button")[0];
        sortElem_latestUpload = $("#menu_sortMode_latestUpload paper-radio-button")[0];
        sortElem_abc = $("#menu_sortMode_abc paper-radio-button")[0];

        chrome.browserAction.setBadgeText({text: ""});

        chrome.extension.sendMessage({type: "onSettingsOpen"});

        setLocales();

        if(!chrome.extension.getBackgroundPage().wyn.isConnected)
            createToast(wyns.strings.connect_failed);

        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
            switch (request.type) {
                case "updateData":
                    if(request.newData)
                        getVideoList(request.newDataIndex);
                    else
                        getVideoList();
                    break;
                case "addChannelFailed":
                    if(wyns.channelsToAdd2 == -1)
                        wyns.channelsToAdd2 += 2;
                    else
                        wyns.channelsToAdd2++;

                    if(wyns.channelsToAdd == wyns.channelsToAdd2){
                        $("#loading").stop().hide();
                        $("#add_channels-dialog").stop().show().css("opacity", 1);
                        $("#add_channels-container").attr("data-toggle", "false");
                        createToast(wyns.strings.add_channels_failed);
                        wyns.channelsToAdd2 = -1;
                    }
                    break;
                case "createToast":
                    createToast(request.message);
                    break;
            }
        });

        var manifest = chrome.runtime.getManifest(),
            homeUrl = "https://github.com/Wassup789";
        $("#version").html(wyns.strings.info_version + " " + manifest.version + "<br/>" + wyns.strings.info_by + " <a href=\"" + homeUrl + "\">Wassup789</a>");

        var settings = JSON.parse(localStorage.getItem("settings"));
        if(settings.updated.enabled){
            //$("#paper_card-changelog .content-header").text("v" + chrome.runtime.getManifest().version);
            showFloatingCard("#paper_card-changelog");
        }

        getVideoList();
        registerListeners();
        initDesign();
        initSearch();// This includes the listener for search
        configureSettings();

        setTimeout(function() {// Timeout 500 since script prediction is difficult
            $("#launch_screen").fadeOut("fast");
        }, 500);
    });
});

/**
 *  Sets the appropriate text to all html tags with the attribute 'i18n'
 */
function setLocales() {
    $("[i18n]:not(paper-card)").each(function(i, elem){
        var string = chrome.i18n.getMessage($(elem).attr("i18n"));
        $(elem).text(string);
    });
    $("paper-card.floating[i18n]").each(function(i, elem) {
        var string = chrome.i18n.getMessage($(elem).attr("i18n"));
        elem.heading = string;
        elem.alt = string;
    });
}

/**
 *  Gets the string from the locales appropriate to settings_old.js
 *
 *  @param {string} name A valid localized string which doesn't include 'settingsJs'
 *  @returns {string} The localized string
 */
function getString(name) {
    return chrome.i18n.getMessage("settingsJs_" + name);
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
 *  Gets information of all YouTube channels and displays it in the options menu
 *
 *  @param {number} [index=-1] The index to scroll to after completion
 */
function getVideoList(index) {
    index = index || -1;

    var channels = JSON.parse(localStorage.getItem("channels")),
        showEmpty = true;

    channels = sortChannels(channels);

    $(".channelRow:not(#masterChannelRow)").remove();
    for(var i = 0; i < channels.length; i++) {
        showEmpty = false;
        var date = new Date(parseInt(channels[i].latestVideo.timestamp)*1000);
        date = timeSince(date);
        if(date.indexOf("/") != -1)
            date = wyns.strings.info_publishedOn + " " + date;
        else
            date = wyns.strings.info_published + " " + date + " " + wyns.strings.info_ago;

        var elem = $("#masterChannelRow").clone().appendTo("#channels");
        elem.removeAttr("id");
        elem.attr("data-id", channels[i].index);
        elem.attr("data-index", i);
        elem.css("display", "");
        elem.find(".channelColumn:nth-child(1) .channel_img").attr("src", channels[i].thumbnail);
        elem.find(".channelColumn:nth-child(1) .channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
        elem.find(".channelColumn:nth-child(2) .channel_author").text(channels[i].name);
        elem.find(".channelColumn:nth-child(2) .channel_author_info").text(parseInt(channels[i].subscriberCount).toLocaleString() + " " + wyns.strings.info_subscribers + " \u2022 " + parseInt(channels[i].viewCount).toLocaleString() + " " + wyns.strings.info_views);
        elem.find(".channelColumn:nth-child(2) .channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
        elem.find(".channelColumn:nth-child(2) .channel_a").attr("title",  channels[i].name);
        elem.find(".channelColumn:nth-child(3) .channel_video_img").attr("src", channels[i].latestVideo.thumbnail);
        elem.find(".channelColumn:nth-child(3) .channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
        elem.find(".channelColumn:nth-child(4) .channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
        elem.find(".channelColumn:nth-child(3) .channel_video_a").attr("title", channels[i].latestVideo.title);
        elem.find(".channelColumn:nth-child(4) .channel_video_a").attr("title", channels[i].latestVideo.title);
        elem.find(".channelColumn:nth-child(4) .channel_video_title").text(channels[i].latestVideo.title);
        elem.find(".channelColumn:nth-child(4) .channel_video_time").text(date);

        if(channels[i].id == channels[i].playlistId) {
            elem.attr("data-isplaylist", true);
            elem.find(".channelColumn:nth-child(2) .channel_author_info").html("<span>" + wyns.strings.playlist_by + " </span><span class='channel_realAuthor'>" + channels[i].altName + "</span>");
            elem.find(".channelColumn:nth-child(1) .channel_a").attr("href", "https://www.youtube.com/playlist?list=" + channels[i].playlistId);
            elem.find(".channelColumn:nth-child(2) .channel_a").attr("href", "https://www.youtube.com/playlist?list=" + channels[i].playlistId);
        }
    }

    if(showEmpty)
        $("#emptyChannelsList").attr("data-type", 0).show();
    else
        $("#emptyChannelsList").hide();

    if(index != -1) {
        var newElem = $(".channelRow[data-id='" + index + "']");
        newElem[0].scrollIntoViewIfNeeded();// Waiting for Chrome's support for smoothing
        newElem.css("background-color", "#C1C1C1");
        setTimeout(function(){newElem.css("transition", "background 3s").css("background-color", "#FFFFFF");}, 0);
        setTimeout(function(){newElem.css("transition", "");}, 3000)
    }
}

/**
 * Sorts and returns an array of channels determined by localStorage settings.js value: sortOrder
 */
function sortChannels(channels) {
    var settings = JSON.parse(localStorage.getItem("settings"));
    for(var i = 0; i < channels.length; i++)
        channels[i].index = i;

    switch(settings.sortOrder) {
        case SORTMODE_ABC:
            channels.sort(function(objA, objB){
                var valA = objA.name.toLowerCase();
                var valB = objB.name.toLowerCase();
                if(valA < valB)
                    return -1;
                if(valA > valB)
                    return 1;
                return 0;
            });
            break;
        case SORTMODE_UPLOAD:
            channels.sort(function(objA, objB){
                var valA = objA.latestVideo.timestamp;
                var valB = objB.latestVideo.timestamp;
                return valB - valA;
            });
            break;
    }
    return channels;
}

/**
 * Initializes all elements that require design changes on load
 */
function initDesign() {
    $("#menu_sortMode_content").parent().attr("id", "menu_sortMode_container");

    var settings = JSON.parse(localStorage.getItem("settings"));

    sortElem_custom.checked = false;
    sortElem_latestUpload.checked = false;
    sortElem_abc.checked = false;
    switch(settings.sortOrder) {
        case SORTMODE_USER:
            sortElem_custom.checked = true;
            break;
        case SORTMODE_ABC:
            sortElem_abc.checked = true;
            break;
        case SORTMODE_UPLOAD:
            sortElem_latestUpload.checked = true;
            break;
    }
}

/**
 *  Registers all listeners
 */
function registerListeners(){
    $("paper-tabs").on("iron-select", function(){
        $("iron-pages")[0].selectIndex($("paper-tabs")[0].selected);
        $("#overlay").click();
    });
    $(document).on("click", "a", function(){
        if($(this).attr("href") != null && $(this).attr("href").charAt(0) != "#")
            chrome.tabs.create({url: $(this).attr("href")});
    });
    //Start of add channels
    $("#paper_card-addChannels paper-input")[0].label = chrome.i18n.getMessage("settings_addChannel_placeholder");
    $("#overlay").on("click", function(){
        $(this).hide();
        $($(this).attr("data-target")).attr("data-toggle", "false");

        if($(this).attr("data-target") == "#paper_card-changelog")
            disableUpdateContainer();
    });
    $("#add_channels-fab").on("click", function(){
        showFloatingCard("#paper_card-addChannels");
        $("#paper_card-addChannels paper-input")[0].focus();
    });
    $("#add_channels-container .overlay").on("click", function(){
        if(!$("#loading").is(":visible"))
            $("#add_channels-container").attr("data-toggle", "false");
    });
    $("#add_channels-more-button").on("click", function(){
        var element = document.createElement("paper-input");
        element.label = chrome.i18n.getMessage("settings_addChannel_placeholder");
        $Poly($("#paper_card-addChannels .card-content")[0]).appendChild(element);
        $("#paper_card-addChannels paper-input:last-child")[0].focus();
    });

    $("#add_channels-add-button").on("click", function(){
        createToast("Adding channels...");

        $("#add_channels-container").attr("data-toggle", "false");

        var num = 0;
        $("#paper_card-addChannels .card-content paper-input").each(function(){
            if($(this).val() != ""){
                var playlist = getUrlVar("list", $(this).val());

                if(playlist != null)
                    chrome.extension.sendMessage({type: "addYoutubePlaylist", name: playlist});
                else
                    chrome.extension.sendMessage({type: "addYoutubeChannel", name: $(this).val()});

                num++;
            }
        });
        if(num < 1)
            createToast(wyns.strings.add_channels_failed);
        else
            wyns.channelsToAdd = num;

        $("#overlay").click();
        $("#paper_card-addChannels .card-content paper-input:not(:first-child)").remove();
        $("#paper_card-addChannels .card-content paper-input").val("");
    });
    $("body").on("keyup", ".add_channel_input", function(e){
        if(e.keyCode == 13)
            $("#add_channels-add-button").click();
    });

    $("body").on("click", ".channel_remove_btn", function(){
        if(sortable.option("disabled")){
            wyns.currentRemovalId = parseInt($(this).parent().parent().attr("data-id"));

            var channels = JSON.parse(localStorage.getItem("channels")),
                name = channels[wyns.currentRemovalId].name;

            $("paper-toast")[0].opened = false;
            $("#removalToast")[0].show({text: wyns.strings.removalPrompt + "\"" + name + "\"?", duration: 7000});
            $("#removalToast")[0].refit();
        }
    });
    $("#removalToast paper-button").on("click", function(){
        if(wyns.currentRemovalId == -1)
            return;

        var channels = JSON.parse(localStorage.getItem("channels")),
            name = channels[wyns.currentRemovalId].name;
        channels.splice(wyns.currentRemovalId, 1);
        localStorage.setItem("channels", JSON.stringify(channels));

        getVideoList();

        createToast(wyns.strings.user_remove_channel + "\"" + name + "\"");
        console.log(wyns.strings.user_remove_channel + name);
    });
    $("body").on("click", ".channel_info_btn", function(){
        var id = parseInt($(this).parent().parent().attr("data-index"));
        displayPopupCard(id);
    });
    $("#popup_card").on("click", ".channel_info_btn", function(){
        var id = parseInt($(this).parent().parent().attr("data-index"));
        displayPopupCard(id);
    });
    $("#popup_overlay").on("click", function(){
        var id = parseInt($(this).parent().parent().find("#popup_card .channelRow").attr("data-index"));
        displayPopupCard(id);
    });

    $("#settings_refresh").on("click", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        chrome.extension.sendMessage({type: "checkYoutubeBatch"});
        if(settings.sync.enabled)
            chrome.extension.sendMessage({type: "syncWithYoutube"});
        createToast(wyns.strings.updating);
    });

    $("#settings_notifications_test").on("click", function(){
        chrome.extension.sendMessage({type: "testNotify"});
    });

    var sortable = new Sortable(document.getElementById("channels"), {
        disabled: true,
        draggable: ".channelRow",
        animation: 150,
        filter: ".channel_remove_btn",
        onFilter: function(e) {
            var el = sortable.closest(e.item);
            el && el.parentNode.removeChild(el);
        }
    });

    // Start of menu
    $("#toolbar paper-menu-button")[0].ignoreSelect = true;
    $("#toolbar paper-menu-button")[0].restoreFocusOnClose = false;
    $("#toolbar paper-menu-button paper-item").on("click", function(e) {
        if(!$(this).hasClass("menu-trigger")) {
            $("#toolbar paper-menu-button")[0].opened = false;
        }
        $("#toolbar paper-menu-button paper-menu").each(function(){
            $(this)[0].selected = -1;
        });
    });
    $("#menu_changeAlignment").on("click", function(){
        if($(this).attr("data-toggle") != "false"){
            $(".channelRow:not(#masterChannelRow)").removeClass("editable");
            sortable.option("disabled", true);
            disableButtons(false);

            var newArr = [],
                oldArr = sortChannels(JSON.parse(localStorage.getItem("channels"))),
                settings = JSON.parse(localStorage.getItem("settings"));
            $(".channelRow:not(#masterChannelRow)").each(function(){
                var id = parseInt($(this).attr("data-id"));
                newArr.push(oldArr[id]);
            });


            if(JSON.stringify(oldArr) != JSON.stringify(newArr)) {
                localStorage.setItem("channels", JSON.stringify(newArr));
                settings.sortOrder = SORTMODE_USER;
                localStorage.setItem("settings", JSON.stringify(settings));
                sortElem_custom.click();
            }

            createToast(wyns.strings.saved);

            $(this).attr("data-toggle", "false");
        }else{
            $(".channelRow:not(#masterChannelRow)").addClass("editable");
            sortable.option("disabled", false);
            disableButtons(true);

            $(this).attr("data-toggle", "true");
        }
    });
    $("#menu_viewChangelog").on("click", function(){
        //$("#paper_card-changelog .content-header").text("v" + chrome.runtime.getManifest().version);
        showFloatingCard("#paper_card-changelog");
    });
    $("#menu_help").on("click", function(){
        chrome.extension.getBackgroundPage().wyn.firstLaunch();
    });
    $("#changelog-close-button").on("click", function(){
        $("#overlay").click();
        disableUpdateContainer();
    });
    function disableUpdateContainer(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.updated.enabled = false;
        localStorage.setItem("settings", JSON.stringify(settings));
    }
    $("#popup_videoList_more").on("click", function(){
        getChannelVideos(publishedBeforeDate);
    });
    $("#settings_notificationCustomizer").on("click", function(){
        chrome.tabs.create({url: "chrome-extension://" + chrome.runtime.id + "/pages/edit-notification.html"});
    });
    $("#emptyChannelsList_subheader, #settings_addbtn_viewsubs").on("click", function(){
        chrome.tabs.create({url: "https://www.youtube.com/feed/channels"});
    });
    //Start of sort mode
    $("#menu_sortMode_custom").on("click", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.sortOrder = SORTMODE_USER;
        localStorage.setItem("settings", JSON.stringify(settings));

        sortElem_custom.checked = true;
        sortElem_latestUpload.checked = false;
        sortElem_abc.checked = false;

        getVideoList();
    });
    $("#menu_sortMode_abc").on("click", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.sortOrder = SORTMODE_ABC;
        localStorage.setItem("settings", JSON.stringify(settings));

        sortElem_abc.checked = true;
        sortElem_custom.checked = false;
        sortElem_latestUpload.checked = false;

        getVideoList();
    });
    $("#menu_sortMode_latestUpload").on("click", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.sortOrder = SORTMODE_UPLOAD;
        localStorage.setItem("settings", JSON.stringify(settings));

        sortElem_latestUpload.checked = true;
        sortElem_custom.checked = false;
        sortElem_abc.checked = false;

        getVideoList();
    });

    //Start of file uploader
    $("#settings_sound_upload").on("click", function(){
        chrome.runtime.getPlatformInfo(function(info) {
            if(info.os == "linux")
                chrome.windows.create({url: "pages/upload-file.html", type: "popup", width: 600, height: 270});
            else
                $("#fileUploader").click();
        });
    });
    $("#fileUploader").on("change", function(){
        createToast(getString("uploading"));

        var file = $("#fileUploader")[0].files[0],
            fileReader = new FileReader();

        fileReader.onloadend = function(){
            var data = {
                name: file.name.replace(/\.[^/.]+$/, ""),
                file: this.result
            };

            var transaction = wyns.database.transaction(["customMedia"], "readwrite"),
                store = transaction.objectStore("customMedia"),
                request = store.delete(0);

            request.onsuccess = function(){
                transaction = wyns.database.transaction(["customMedia"], "readwrite");
                store = transaction.objectStore("customMedia");
                request = store.add(data, 0);

                createToast(getString("uploadcomplete"));
                updateNotificationMedia(false);

                chrome.extension.sendMessage({type: "updateNotificationSound"});
            };
        };
        fileReader.readAsDataURL(file)
    });
}

/**
 *  Disable specific buttons (The information button, add channel button)
 */
function disableButtons(bool){
    if(bool){
        if($("#popup_card").attr("data-toggle") == "true")
            displayPopupCard(0);
        $(".channelRow:not(#masterChannelRow) .channelColumn:nth-child(5) .channel_info_btn").hide();
        $("#add_channels-fab").hide();
        $("#add_channels-container").attr("data-toggle", "false");

        setPage(0);
        $("#search-textbox").css("opacity", 0).addClass("noninteractable").removeClass("is-dirty");
        $("#search-btn").css("opacity", 0).addClass("noninteractable");
        $("#search-input").val("");
        $("#toolbar .label-is-hidden").removeClass("label-is-hidden");
        updateSearch()
    }else{
        $(".channelRow:not(#masterChannelRow) .channelColumn:nth-child(5) .channel_info_btn").show();
        $("#add_channels-fab").show();
        $("#search-textbox").css("opacity", 1).removeClass("noninteractable");
        $("#search-btn").css("opacity", 1).removeClass("noninteractable");
    }
}

/**
 *  Updates the values in the settings.js page
 */
function configureSettings(){
    var settings = JSON.parse(localStorage.getItem("settings"));

    $("#settings_notifications_toggle").on("change", function(){
        var value = $(this)[0].checked,
            settings = JSON.parse(localStorage.getItem("settings"));
        settings.notifications.enabled = value;
        localStorage.setItem("settings", JSON.stringify(settings));
        createToast(wyns.strings.saved);
    })[0].active = settings.notifications.enabled;

    $("#settings_notifications_volume").on("change", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.notifications.volume = $("#settings_notifications_volume").val();
        localStorage.setItem("settings", JSON.stringify(settings));
        createToast(wyns.strings.saved);
    }).val(settings.notifications.volume);

    $("#settings_tts_toggle").on("change", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.tts.enabled = $(this)[0].checked;
        localStorage.setItem("settings", JSON.stringify(settings));
        createToast(wyns.strings.saved);
    })[0].active = settings.tts.enabled;

    $("#settings_addbtn_toggle").on("change", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.addBtn.enabled = $(this)[0].checked;
        localStorage.setItem("settings", JSON.stringify(settings));
        createToast(wyns.strings.saved);
    })[0].active = settings.addBtn.enabled;

    $("#settings_sync_toggle").on("change", function(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        settings.sync.enabled = $(this)[0].checked;
        localStorage.setItem("settings", JSON.stringify(settings));
        checkAddBtn();
        createToast(wyns.strings.saved);

        if(settings.sync.enabled)
            chrome.extension.sendMessage({type: "syncWithYoutube"});
        $("body").attr("data-sync", settings.sync.enabled); 
    })[0].active = settings.sync.enabled;
    $("body").attr("data-sync", settings.sync.enabled); 
    
    checkAddBtn();

    function checkAddBtn(){
        var settings = JSON.parse(localStorage.getItem("settings"));
        $("#settings_addbtn_toggle")[0].disabled = settings.sync.enabled;
        $("#add_channels-fab")[0].style.display = settings.sync.enabled ? "none" : "flex";
    }

    launchSpeechSynthesis();
}

/**
 *  Tests if speech synthesis exists
 */
function launchSpeechSynthesis(){
    var speechSynthesisList = window.speechSynthesis.getVoices();
    if(speechSynthesisList.length < 1){
        setTimeout(function(){
            launchSpeechSynthesis();
        },100);
    }else{
        var selectElem = $("#settings_tts_select paper-listbox");
        selectElem[0].attrForSelected = "value";

        for(var i = 0; i < speechSynthesisList.length; i++)
            addPaperItem(selectElem[0], speechSynthesisList[i].name, i);

        selectElem[0].selected = JSON.parse(localStorage.getItem("settings")).tts.type;
        setTimeout(function(){//Set timeout so saving doesn't get triggered
            selectElem.on("iron-select", function(){
                var settings = JSON.parse(localStorage.getItem("settings"));
                settings.tts.type = parseInt(selectElem[0].selected);
                localStorage.setItem("settings", JSON.stringify(settings));
                createToast(wyns.strings.saved);
            });
        }, 10);
    }
}

/**
 *  Displays a popup card for a channel displaying it's information and it's last ten videos
 *
 *  @param {number} num The channel's display index
 */
var popupId = -1, savedData = {}, publishedBeforeDate;
function displayPopupCard(num){
    if(typeof $("#channels .channelRow:not(#masterChannelRow)")[num] !== "undefined"){
        var popup_card = $("#popup_card");

        if(popup_card.attr("data-toggle") != "true"){
            popupId = num;
            $("#mainContainer").addClass("unscrollable");//Disable scrolling so popup_card doesn't look weird
            popup_card.children(":not(#popup_videoList):not(#popup_loading_container)").remove();//Remove items from popup before
            popup_card.children("#popup_videoList").children(":not(#masterVideoListRow):not(#popup_videoList_more_container)").remove();//Remove video list items from popup before
            popup_card.prepend($("#channels .channelRow:not(#masterChannelRow)")[num].outerHTML);//Prepend clicked contents
            popup_card.css("top", $("#channels .channelRow:not(#masterChannelRow)")[num].getBoundingClientRect().top - parseInt($($("#main_card")[0]).css("marginTop")));//Align popup with clicked card
            popup_card.css("height", 76);

            $("#popup_videoList_more_container").hide();//Hides the display of the button whilst loading the popup

            popup_card.fadeIn("fast");
            popup_card.animate({//Card appears to be lifted
                boxShadow: "0 16px 24px 2px rgba(0,0,0,.14),0 6px 30px 5px rgba(0,0,0,.12),0 8px 10px -5px rgba(0,0,0,.2)",
            }, 350);
            popup_card.find(".channel_info_btn").animate({//Seamless info button on transition from cards
                marginTop: -23
            }, 350);
            popup_card.delay(150).animate({//Stretch card to fill content
                top: 112,
                height: 458
            }, 350);
            $("#popup_overlay").delay(650).fadeIn("fast");
            setTimeout(function(){
                popup_card.find(".channel_info_btn").css("marginTop", "");//Reset info button
                popup_card.find(".channelColumn").not(".popup_show").hide();//Remove unneeded content
                popup_card.find(".channel_remove_btn").fadeOut("fast");//Remove the X button thats behind the info button
                $("#popup_card").attr("data-toggle", "true");
                getChannelVideos();
            }, 750);
        }else{
            popup_card.animate({ scrollTop: 0 }, "fast");//Scroll to top for info button transition alignment
            $("#popup_loading")[0].active = false;//Remove loading if exists
            popup_card.animate({//Transform card to original size
                top: $("#channels .channelRow:not(#masterChannelRow)")[popupId].getBoundingClientRect().top - parseInt($($("#main_card")[0]).css("marginTop")),
                height: 76
            }, 350);
            popup_card.find(".channel_info_btn").animate({//Seamless info button transition
                marginTop: 27,
                marginRight: 0
            }, 350);
            popup_card.find(".channel_remove_btn").fadeIn("fast");//Fade in the X button
            popup_card.delay(150).animate({//Card goes back to content
                boxShadow: "0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0)",
            }, 350);
            $("#popup_overlay").delay(500).fadeOut("fast");
            setTimeout(function(){
                popup_card.find(".channel_info_btn").css("marginTop", "");//Reset info button
                popup_card.find(".channelColumn").not(":first").not(":last").show();//Re-add buttons
                popup_card.attr("data-toggle", "false");
            }, 550);
            setTimeout(function(){
                popup_card.hide();
                $("#mainContainer").removeClass("unscrollable");//Delays scrollability until popup_card completely disapears
            }, 700);
            popupId = -1;
        }
    }
}

/**
 *  Recieves information about the popup channel
 *
 *  @param {string} [publishedBefore=null] The videos to get before a certain date (RFC 3339 format required)
 */
function getChannelVideos(publishedBefore){
    var id = parseInt($("#popup_card .channelRow").attr("data-id")),
        channels = JSON.parse(localStorage.getItem("channels")),
        channelId = channels[id].id,
        playlistId = channels[id].playlistId,
        //url = "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=10&playlistId=" + playlistId + "&key=" + wyns.apiKey;
        url = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=date&safeSearch=none&type=video&maxResults=10" + (typeof publishedBefore === "undefined" ? "" : "&publishedBefore=" + publishedBefore) + "&channelId=" + channelId + "&key=" + wyns.apiKey;

    if(channelId == playlistId)// Determines if this is a playlist
        url = "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=10&playlistId=" + playlistId + (typeof publishedBefore === "undefined" ? "" : "&pageToken=" + publishedBefore) + "&key=" + wyns.apiKey;

    if(publishedBeforeDate == -1){
        $("#popup_videoList_more_container").slideUp();
        return;
    }

    if(typeof savedData[channelId] !== "undefined" && typeof publishedBefore === "undefined")
        setChannelVideos(savedData[channelId]);
    else{
        $("#popup_loading")[0].active = true;//Fade in loading (will look strange without fades)
        $.ajax({
            type: "GET",
            dataType: "json",
            url: url,
            success: function(data) {
                if(data.items.length < 10)
                    $("#popup_videoList_more_container").slideUp();

                if(channelId == playlistId)
                    publishedBeforeDate = (typeof data.nextPageToken !== "undefined" ? data.nextPageToken : -1);

                var videos = "";
                for(var i = 0; i < data.items.length; i++) {
                    if(channelId == playlistId)
                        videos += data.items[i].contentDetails.videoId + ",";
                    else
                        videos += data.items[i].id.videoId + ",";
                }
                var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&maxResults=1&id=" + videos + "&key=" + wyns.apiKey;
                $.ajax({
                    type: "GET",
                    dataType: "json",
                    url: url,
                    success: function(data) {
                        var output = [];
                        for(var i = 0; i < data.items.length; i++){
                            var outputAdd = {
                                id:				data.items[i].id,
                                title:			data.items[i].snippet.title,
                                description:	data.items[i].snippet.description,
                                timestamp:		Date.parse(data.items[i].snippet.publishedAt)/1000,
                                thumbnail:		data.items[i].snippet.thumbnails.default.url,
                                likes:			data.items[i].statistics ? data.items[i].statistics.likeCount : NaN,
                                dislikes:		data.items[i].statistics ? data.items[i].statistics.dislikeCount : NaN,
                                views:			data.items[i].statistics ? data.items[i].statistics.viewCount : NaN,
                                duration:		convertISO8601Duration(data.items[i].contentDetails ? data.items[i].contentDetails.duration : 0)
                            };
                            output.push(outputAdd);

                            if(i == data.items.length - 1 && channelId != playlistId)
                                publishedBeforeDate = new Date(parseInt(outputAdd.timestamp) * 1000 - 1000).toISOString();
                        }

                        setChannelVideos(output);

                        if(typeof publishedBefore === "undefined")
                            savedData[channelId] = output;
                        else
                            savedData[channelId] = savedData[channelId].concat(output);
                        $("#popup_loading")[0].active = false;
                        $("#popup_videoList").fadeIn("slow");
                    }
                });
            }
        });
    }
}

/**
 *  Information for popup recieved, display information
 *
 *  @param {object} data The data recived from function: getChannelVideos
 */
function setChannelVideos(data){
    data.sort(function(a, b){
        var a = a.timestamp,
            b = b.timestamp;
        if(a > b) return -1;
        if(a < b) return 1;
        return 0;
    });

    for(var i = 0; i < data.length; i++) {
        var date = new Date(parseInt(data[i].timestamp)*1000);
        date = timeSince(date);
        if(date.indexOf("/") != -1)
            date = wyns.strings.info_publishedOn + " " + date;
        else
            date = wyns.strings.info_published + " " + date + " " + wyns.strings.info_ago;

        data[i].likes = parseInt(data[i].likes);
        data[i].dislikes = parseInt(data[i].dislikes);
        var likesa = Math.round((data[i].likes / (data[i].likes + data[i].dislikes)) * 100);
        var dislikesa = Math.round((data[i].dislikes / (data[i].likes + data[i].dislikes)) * 100);
        if((likesa + dislikesa) > 100)
            dislikesa--;

        var elem = $("#masterVideoListRow").clone().insertBefore("#popup_videoList_more_container");
        elem.removeAttr("id");
        elem.css("display", "");
        elem.children("a").attr("href", "https://www.youtube.com/watch?v=" + data[i].id);
        elem.children("a").attr("title", data[i].title);
        elem.find("a .videoListColumn:nth-child(1) .videoList_img").attr("src", data[i].thumbnail);
        elem.find("a .videoListColumn:nth-child(2) .videoList_title").text(data[i].title);
        elem.find("a .videoListColumn:nth-child(2) .videoList_sub").text(date);
        elem.find("a .videoListColumn:nth-child(3) .videoList_title").text(parseInt(data[i].views).toLocaleString() + " " + wyns.strings.info_views + " | " + likesa + "% " + wyns.strings.info_likes + " | " + dislikesa + "% " + wyns.strings.info_dislikes);
        elem.find("a .videoListColumn:nth-child(3) .videoList_sub").text(data[i].duration);
    }

    $("#popup_videoList_more_container").show();//Display the "load more" container in case the button is removed due to the lack of videos
}


/**
 *  Focuses on the header search textbox so users can start typing upon load
 *  This includes the listener
 */
function initSearch() {
    $("#search-input").focus();

    $("#search-input").on("keyup", function(e) {
        if(e.which == 13)
            updateSearchExact();
        else
            updateSearch();
    });

    $("#search-btn").on("click", function(){
        if($("#search-btn").attr("icon") == "close") {// Resets the search value
            $("#search-input").val("");
            $("#toolbar .label-is-hidden").removeClass("label-is-hidden");
            updateSearch();
        }
        $("#search-input").focus();
    });
}

/**
 *  Updates the search items
 */
function updateSearch() {
    if(popupId != -1)
        return;

    setPage(0);

    $("#search-btn").attr("icon", ($("#search-input").val().length > 0 ? "close" : "search"));// Changes the icon of the search button depending on length

    var val = $("#search-input").val().toLowerCase().trim();

    $(".channelRow:not(#masterChannelRow)").show().filter(function() {
        var text = $(this).find(".channel_author").text().toLowerCase(),
            text2 = $(this).find(".channel_video_title").text().toLowerCase();

        return text.indexOf(val) < 0 ? text2.indexOf(val) < 0 : false;
    }).hide();

    if(!$(".channelRow:not(#masterChannelRow)").is(":visible"))
        $("#emptyChannelsList").attr("data-type", 1).show();
    else
        $("#emptyChannelsList").hide();

    if(typeof wyns.previousLastListItem !== "undefined")
        wyns.previousLastListItem.css("border-bottom", "");
    wyns.previousLastListItem = $(".channelRow:not(#masterChannelRow):visible:last");
    wyns.previousLastListItem.css("border-bottom", "none");
}

/**
 *  If only one item exists, open the popup when the user presses enter or the search button
 */
function updateSearchExact() {
    if(popupId != -1)
        return;

    var val = $("#search-input").val().toLowerCase().trim();
    var list = $(".channelRow:not(#masterChannelRow):visible");
    if(list.length == 1)
        displayPopupCard(parseInt(list.attr("data-index")));
    list.filter(function(){
        if($(this).find(".channel_author").text().toLowerCase().trim() == val)
            displayPopupCard(parseInt($(this).attr("data-index")));
    });
}

/**
 * Shows a floating paper-card
 */
function showFloatingCard(elemId) {
    $(elemId).attr("data-toggle", "true");
    $("#overlay").attr("data-target", "#" + $(elemId).attr("id")).show();
}

/**
 * Updates the notification dropdown selection items
 */
function updateNotificationMedia(registerListeners) {
    var selectElem = $("#settings_sound_list paper-listbox");
    selectElem[0].attrForSelected = "value";
    clearPaperItems(selectElem[0]);

    addPaperItem(selectElem[0], getString("notificationSound_default"), NOTIFICATIONSOUND_DEFAULT);

    var transaction = wyns.database.transaction(["customMedia"], "readonly"),
        store = transaction.objectStore("customMedia"),
        data = store.get(0);

    data.onsuccess = function() {
        if (typeof data.result !== "undefined") {
            addPaperItem(selectElem[0], data.result.name, NOTIFICATIONSOUND_CUSTOM);

            selectElem[0].selected = JSON.parse(localStorage.getItem("settings")).notificationSound;
        }
    };

    selectElem[0].selected = JSON.parse(localStorage.getItem("settings")).notificationSound;

    if(registerListeners) {
        setTimeout(function(){//Set timeout so saving doesn't get triggered
            selectElem.on("iron-select", function(){
                var value = parseInt(selectElem[0].selected),
                    settings = JSON.parse(localStorage.getItem("settings"));
                settings.notificationSound = value;
                localStorage.setItem("settings", JSON.stringify(settings));
                createToast(wyns.strings.saved);

                chrome.extension.sendMessage({type: "updateNotificationSound"});
            });
        }, 10);
    }
}

/**
 * Adds an item to the paper-listbox
 */
function addPaperItem(listboxElem, title, value) {
    var element = document.createElement("paper-item");
    $(element).attr("value", value).text(title);
    $Poly(listboxElem).appendChild(element);
}

/**
 * Clears all items from the paper-listbox
 */
function clearPaperItems(listboxElem) {
    $Poly(listboxElem).innerHTML = "";
}

/**
 * Sets the current page
 */
function setPage(tabId) {
    $("#toolbar paper-tabs")[0].selected = tabId;
}

/**
 *  Returns the time difference from today
 *
 *  @param {number} date A valid UNIX timestamp
 *  @returns {string} The time difference in user-friendly format
 */
function timeSince(date){
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    var prefix = "",
        dateMonth = date.getMonth()+1;

    if(dateMonth.length < 2)
        prefix = "0";

    if (interval > 1)
        return prefix + (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();

    interval = Math.floor(seconds / 2592000);
    if (interval > 1)
        return prefix + (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();

    interval = Math.floor(seconds / 86400);
    if (interval > 1)
        return interval + " " + wyns.strings.date_days;

    interval = Math.floor(seconds / 3600);
    if (interval > 1){
        if(interval > 23)
            return "1 " + wyns.strings.date_day;
        else
            return interval + " " + wyns.strings.date_hours;
    }

    interval = Math.floor(seconds / 60);
    if (interval > 1){
        if(interval > 59)
            return "1 hour";
        else
            return interval + " " + wyns.strings.date_minutes;
    }

    interval = Math.floor(seconds);
    if (interval > 1){
        if(interval > 59)
            return "1 " + wyns.strings.date_minute;
        else
            return interval + " " + wyns.strings.date_seconds;
    }else
        return interval + " " + wyns.strings.date_second;
}

/**
 * Extracts a GET parameter from a URL
 *
 * @param name The parameter to retrieve
 * @param url The target URL
 * @returns {null} The parameter value or null if nonexistent
 */
function getUrlVar(name, url) {
    if (!url) url = location.href;
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( url );
    return results == null ? null : results[1];
}

/**
 *  Converts an ISO-8601 formatted string to a different timestamp format (HH:MM:SS)
 *  Script by Mikolaj Lukasik on stackoverflow.com
 *
 *  @param {string} r The ISO-8601 formmated string
 *  @returns {string} Returns duration in HH:MM:SS format
 */
function convertISO8601Duration(r){var e=r.split("T"),t="",i={},n={},s="string",a="variables",l="letters",v={period:{string:e[0].substring(1,e[0].length),len:4,letters:["Y","M","W","D"],variables:{}},time:{string:e[1],len:3,letters:["H","M","S"],variables:{}}};v.time.string||(v.time.string="");for(var g in v)for(var o=v[g].len,M=0;o>M;M++)v[g][s]=v[g][s].split(v[g][l][M]),v[g][s].length>1?(v[g][a][v[g][l][M]]=parseInt(v[g][s][0],10),v[g][s]=v[g][s][1]):(v[g][a][v[g][l][M]]=0,v[g][s]=v[g][s][0]);return n=v.period.variables,i=v.time.variables,i.H+=24*n.D+168*n.W+672*n.M+8064*n.Y,i.H&&(t=i.H+":",i.M<10&&(i.M="0"+i.M)),i.S<10&&(i.S="0"+i.S),t+=i.M+":"+i.S}

/**
 * Shows and creates a toast
 * @param text The message to display
 */
function createToast(text){
    $("paper-toast")[0].opened = false;
    $("paper-toast")[0].refit();
    setTimeout(function() {
        $("paper-toast")[0].show({
            text: text
        });
    }, 1);
}

// SHADOW TRANSITION
'use strict';jQuery(function(h){function r(b,m,d){var l=[];h.each(b,function(f){var g=[],e=b[f];f=m[f];e.b&&g.push("inset");"undefined"!==typeof f.left&&g.push(parseFloat(e.left+d*(f.left-e.left))+"px "+parseFloat(e.top+d*(f.top-e.top))+"px");"undefined"!==typeof f.blur&&g.push(parseFloat(e.blur+d*(f.blur-e.blur))+"px");"undefined"!==typeof f.a&&g.push(parseFloat(e.a+d*(f.a-e.a))+"px");if("undefined"!==typeof f.color){var p="rgb"+(h.support.rgba?"a":"")+"("+parseInt(e.color[0]+d*(f.color[0]-e.color[0]),
        10)+","+parseInt(e.color[1]+d*(f.color[1]-e.color[1]),10)+","+parseInt(e.color[2]+d*(f.color[2]-e.color[2]),10);h.support.rgba&&(p+=","+parseFloat(e.color[3]+d*(f.color[3]-e.color[3])));g.push(p+")")}l.push(g.join(" "))});return l.join(", ")}function q(b){function m(){var a=/^inset\b/.exec(b.substring(c));return null!==a&&0<a.length?(k.b=!0,c+=a[0].length,!0):!1}function d(){var a=/^(-?[0-9\.]+)(?:px)?\s+(-?[0-9\.]+)(?:px)?(?:\s+(-?[0-9\.]+)(?:px)?)?(?:\s+(-?[0-9\.]+)(?:px)?)?/.exec(b.substring(c));
    return null!==a&&0<a.length?(k.left=parseInt(a[1],10),k.top=parseInt(a[2],10),k.blur=a[3]?parseInt(a[3],10):0,k.a=a[4]?parseInt(a[4],10):0,c+=a[0].length,!0):!1}function l(){var a=/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/.exec(b.substring(c));if(null!==a&&0<a.length)return k.color=[parseInt(a[1],16),parseInt(a[2],16),parseInt(a[3],16),1],c+=a[0].length,!0;a=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/.exec(b.substring(c));if(null!==a&&0<a.length)return k.color=[17*parseInt(a[1],16),17*parseInt(a[2],
    16),17*parseInt(a[3],16),1],c+=a[0].length,!0;a=/^rgb\(\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*\)/.exec(b.substring(c));if(null!==a&&0<a.length)return k.color=[parseInt(a[1],10),parseInt(a[2],10),parseInt(a[3],10),1],c+=a[0].length,!0;a=/^rgba\(\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*\)/.exec(b.substring(c));return null!==a&&0<a.length?(k.color=[parseInt(a[1],10),parseInt(a[2],10),parseInt(a[3],10),parseFloat(a[4])],c+=a[0].length,!0):!1}function f(){var a=/^\s+/.exec(b.substring(c));
    null!==a&&0<a.length&&(c+=a[0].length)}function g(){var a=/^\s*,\s*/.exec(b.substring(c));return null!==a&&0<a.length?(c+=a[0].length,!0):!1}function e(a){if(h.isPlainObject(a)){var b,e,c=0,d=[];h.isArray(a.color)&&(e=a.color,c=e.length);for(b=0;4>b;b++)b<c?d.push(e[b]):3===b?d.push(1):d.push(0)}return h.extend({left:0,top:0,blur:0,spread:0},a)}for(var p=[],c=0,n=b.length,k=e();c<n;)if(m())f();else if(d())f();else if(l())f();else if(g())p.push(e(k)),k={};else break;p.push(e(k));return p}h.extend(!0,
    h,{support:{rgba:function(){var b=h("script:first"),m=b.css("color"),d=!1;if(/^rgba/.test(m))d=!0;else try{d=m!==b.css("color","rgba(0, 0, 0, 0.5)").css("color"),b.css("color",m)}catch(l){}b.removeAttr("style");return d}()}});var s=h("html").prop("style"),n;h.each(["boxShadow","MozBoxShadow","WebkitBoxShadow"],function(b,h){if("undefined"!==typeof s[h])return n=h,!1});n&&(h.Tween.propHooks.boxShadow={get:function(b){return h(b.elem).css(n)},set:function(b){var m=b.elem.style,d=q(h(b.elem)[0].style[n]||
    h(b.elem).css(n)),l=q(b.end),f=Math.max(d.length,l.length),g;for(g=0;g<f;g++)l[g]=h.extend({},d[g],l[g]),d[g]?"color"in d[g]&&!1!==h.isArray(d[g].color)||(d[g].color=l[g].color||[0,0,0,0]):d[g]=q("0 0 0 0 rgba(0,0,0,0)")[0];b.run=function(b){b=r(d,l,b);m[n]=b}}})});
