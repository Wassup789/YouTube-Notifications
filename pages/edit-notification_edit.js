var NOTIFICATION_ACTIONS = chrome.extension.getBackgroundPage().NOTIFICATION_ACTIONS;

document.title = "YouTube Notifications - " + chrome.i18n.getMessage("settings_editSettings_notificationCustomizer");

if(location.search == "?firstlaunch")
    document.body.setAttribute("firstlaunch", true);

window.addEventListener("WebComponentsReady", function() {
    $(function () {
        $Poly = Polymer.dom;

        $(window).resize(function(){
            onWindowResize();
        });
        onWindowResize();

        var settings = JSON.parse(localStorage.getItem("settings"));
        $(".notification_button[data-id=" + settings.notificationActions[0].id + "]").clone().appendTo("#notification_buttons");
        $(".notification_button[data-id=" + settings.notificationActions[1].id + "]").clone().appendTo("#notification_buttons");

        $("#header #header_button_test").on("click", function() {
            saveIndex++;
            save(true);
            chrome.extension.getBackgroundPage().wyn.testNotify();
        });
        $("#header #header_button_save").on("click", function() {
            var arr = [];
            $("#notification_buttons .notification_button").each(function(){
                arr.push(parseInt($(this).attr("data-id")));
            });
            if(arr.length == 1)
                arr.push(-1);
            else if(arr.length == 0)
                arr = [-1, -1];

            var settings = JSON.parse(localStorage.getItem("settings"))
            settings.notificationActions = arr;
            localStorage.setItem("settings", JSON.stringify(settings));

            createToast(chrome.i18n.getMessage("settingsJs_saved"));
        });

        $("body").on("click", "#notification .notification_button select", function(e){
            if($(this).children().length < 2) {
                e.preventDefault(true);

                createToast(chrome.i18n.getMessage("settingsJs_pleaseWait"));

                chrome.identity.getAuthToken({
                        interactive: true,
                        scopes: [
                            "https://www.googleapis.com/auth/youtube.readonly"
                        ]
                    },
                    function(token){
                        if(!chrome.runtime.lastError){
                            onReceiveExtendedToken();
                        }
                    }
                );
            }
        });

        $("body").on("input", "#notification .notification_button select", function(e){
            $this = $(this);
            if($this.val() != "-1") {
                var elem = $(this).parent();
                elem.attr("data-playlistId", $this.val());
                elem.attr("data-playlistName", $this.find(":selected").text());

                attemptSave();
            }
        });
    });

    setLocales();

    initSortable();

    setTimeout(function() {// Timeout 500 since script prediction is difficult
        $("#launch_screen").fadeOut("fast");
    }, 500);
});

/**
 *  Sets the appropriate text to all html tags with the attribute 'i18n'
 */
function setLocales() {
    $("[i18n]:not(paper-card)").each(function(i, elem){
        var string = chrome.i18n.getMessage($(elem).attr("i18n"));
        $(elem).text(string);
    });
    $("paper-card[i18n]").each(function(i, elem) {
        var string = chrome.i18n.getMessage($(elem).attr("i18n"));
        elem.heading = string;
        elem.alt = string;
    });
}

var notificationSortable, listSortable;
/**
 * Initializes Sortable.js
 */
function initSortable() {
    notificationSortable = Sortable.create($("#notification_buttons")[0], {// NOTIFICATION
        group: {
            name: "main",
            pull: true,
            put: true
        },
        draggable: ".notification_button",
        sort: true,
        animation: 150,
        filter: ".notification_button_remove_btn",
        onFilter: function(event) {
            event.item.parentNode.removeChild(event.item);
            checkButtonList();
            attemptSave();
        },
        onSort: function(event){
            checkButtonList();
            attemptSave();
        }
    });

    listSortable = Sortable.create($("#notificationCustomizer_buttons .card-content")[0], {// LIST
        group: {
            name: "main",
            pull: $("#notification_buttons").children().length > 3 ? false : "clone",
            put: false
        },
        draggable: ".notification_button",
        sort: false,
        animation: 150
    });

    /**
     * Check if the button lists need to pull or not
     */
    function checkButtonList() {
        var edit = listSortable.option("group"),
            children = $("#notification_buttons").children();
        edit.pull = children.length > 3 ? false : "clone";
        listSortable.option("group", edit);
    }
}

const notificationWidth = 357,
      notificationHeight = 396,
      notificationRatio = 132/119;
/**
 * Ran when the window is resized or upon page init
 */
function onWindowResize() {
    var scaleWidth = ($(window).width() * 0.45 / notificationWidth),
        scaleHeight = ($(window).height() * 0.6 / notificationHeight),
        proposedWidth = scaleWidth * notificationWidth,
        proposedHeight = notificationRatio * proposedWidth;

    var scale;
    if(proposedHeight >= $(window).height() * 0.6)
        scale = scaleHeight;
    else
        scale = scaleWidth;

    $("#notification").css("transform", "scale(" + scale + ")");
}

var saveIndex = 0;
/**
 * Attempts an automatic save after 1 second, if index is the same, initiate save
 */
function attemptSave() {
    var index = ++saveIndex;
    setTimeout(function(){
        if(index == saveIndex)
            save();
    }, 1000);
}

/**
 * Saves the current notification settings
 */
function save(override) {
    var arr = [];
    $("#notification_buttons .notification_button").each(function(){
        arr.push({
            id: parseInt($(this).attr("data-id")),
            playlist: {
                id: (typeof $(this).attr("data-playlistId") !== "undefined") ? $(this).attr("data-playlistId") : -1,
                name: (typeof $(this).attr("data-playlistName") !== "undefined") ? $(this).attr("data-playlistName") : ""
            }
        });
    });
    if(arr.length == 1)
        arr.push({id: -1, playlist: {id: -1, name: ""}});
    else if(arr.length == 0)
        arr = [{id: -1, playlist: {id: -1, name: ""}}, {id: -1, playlist: {id: -1, name: ""}}];


    var settings = JSON.parse(localStorage.getItem("settings"));
    settings.notificationActions = arr;
    localStorage.setItem("settings", JSON.stringify(settings));

    if(!override)
        createToast(chrome.i18n.getMessage("settingsJs_saved"));
}

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

/**
 * Ran when the extended token is approved by the user
 */
function onReceiveExtendedToken() {
    chrome.identity.getAuthToken({
        interactive: false,
        scopes: [
            "https://www.googleapis.com/auth/youtube.readonly"
        ]
    }, function(access_token) {
        if(chrome.runtime.lastError)
            return;

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true");
        xhr.setRequestHeader("Authorization", "Bearer " + access_token);
        xhr.onload = function(){
            var data = JSON.parse(this.response);

            if(data.items.length > 0) {
                for(var i = 0; i < data.items.length; i++) {
                    $("#notification .notification_button select").append("<option value=\"" + data.items[i].id + "\">" + (data.items[i].snippet.title).replace(/[\""]/g, '\\"') + "</option>");
                }
            }else{
                createToast(chrome.i18n.getMessage("settingsJs_noPlaylistsFound"));
            }
        };
        xhr.send();
    });
}