var awaitingResponse = [];

/**
 *  Gets the string from the locales
 *
 *  @param {string} name A valid localized string which doesn't include 'settingsJs'
 *  @returns {string} The localized string
 */
function getString(name) {
    return chrome.i18n.getMessage("contentScript_" + name);
}

window.onload = function(){
    chrome.runtime.sendMessage({type: "showAddButton"}, function(response){
        if(response && !(document.querySelector("ytd-app") !== null))
            $(function(){launchLegacy();});
        launch(response);

        setInterval(function() {
            if (response && !(document.querySelector("ytd-app") !== null)){
                if (window.$)
                    launchLegacy();
            }
            launch(response);
        }, 1000);
    });

    chrome.runtime.sendMessage({type: "watchNotificationButton"}, function(response){
        if(response){
            $(function(){
                $(document).on("click", "#notification-button", function(){
                    if(!this.hasAttribute("data-channelId"))
                        return;
                    var status = $(this).find("yt-icon-button").attr("aria-pressed") === "true",
                        channelId = this.getAttribute("data-channelId");

                    if(status)
                        chrome.runtime.sendMessage({type: "addYoutubeChannel", contentScript: true, name: channelId, refresh: true});
                    else
                        chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true});
                });
            });
        }
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
        switch (request.type) {
            case "contentScript_response":
                onMessageResponse(request.responseType, request.id);
                break;
        }
    });
};

$(function(){
    //Legacy
    if(!(document.querySelector("ytd-app") !== null)){
        $(document).on("click", "#ytn-btn, .ytn-btn", function(){
            var elem = $(this),
                channelId = elem.attr("data-channelId");

            if(elem.hasClass("yt-uix-button-subscribe-branded")){// Add channel
                awaitingResponse.push({
                    id: channelId,
                    elem: elem
                });
                chrome.runtime.sendMessage({type: "addYoutubeChannel", contentScript: true, name: channelId, refresh: true});
            }else if(elem.hasClass("yt-uix-button-subscribed-branded")){// Remove channel
                awaitingResponse.push({
                    id: channelId,
                    elem: elem
                });
                chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true});
            }
        });
    }else{
        $(document).on("click", ".ytn-btn", function(){
            var elem = $(this),
                channelId = elem.attr("data-channelId");

            awaitingResponse.push({
                id: channelId,
                elem: elem
            });
            if(!elem.attr("subscribed")){// Add channel
                chrome.runtime.sendMessage({type: "addYoutubeChannel", contentScript: true, name: channelId, refresh: true});
            }else{// Remove channel
                chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true});
            }
        });
    }
});
function onMessageResponse(type, id){
    awaitingResponse.forEach(function(item, i) {
        if(item.id === id){
            if(document.querySelector("ytd-app") === null) {
                if (type)
                    item.elem.removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
                else
                    item.elem.addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
            }else{
                if (type) {
                    item.elem.find("span").text(getString("removeChannel").replace("YouTube Notifications", "YTN"));
                    item.elem.attr("subscribed", true);
                }else{
                    item.elem.find("span").text(getString("addChannel").replace("YouTube Notifications", "YTN"));
                    item.elem.removeAttr("subscribed");
                }
            }
            awaitingResponse.pop(i);
        }
    });
}

function launch(showAddButtons){
    var Polymer = {dom: function(a){return {appendChild: function(a){}}}};// Create a fake Polymer function since it won't be executed here
    function ytn_injectionCode(showAddButtons){
        if(showAddButtons) {
            var subscribeButtons = document.querySelectorAll("#subscribe-button");
            subscribeButtons.forEach(function (e) {
                if (e.querySelector(":scope > paper-button") !== null)
                    return;
                e.style.display = "flex";
                e.style.flexDirection = "row";
                e.style.alignItems = "center";

                var id = "";
                try {
                    id = e.querySelector("ytd-subscribe-button-renderer").__data__.data.channelId;
                } catch (e) {
                    window.ytn_errors.push(e);
                    if (window.ytn_errors.length > 10)
                        window.ytn_errors.shift();
                    return;
                }

                var paperButton = document.createElement("paper-button");
                paperButton.classList = "ytn-btn ytd-subscribe-button-renderer";
                paperButton.setAttribute("data-channelId", id);
                paperButton.setAttribute("init", false);
                paperButton.style.display = "none";

                var span = document.createElement("span");
                paperButton.appendChild(span);

                Polymer.dom(e).appendChild(paperButton);
            });
        }

        var notificationButtons = document.querySelectorAll("#notification-button");
        notificationButtons.forEach(function(e){
            try {
                e.setAttribute("data-channelId", e.dataHost.__data__.data.channelId);
            }catch(e){
                window.ytn_errors.push(e);
                if(window.ytn_errors.length > 10)
                    window.ytn_errors.shift();
            }
        });
    }

    document.querySelectorAll(".ytn-btn[init='false']").forEach(function (e) {
        var channelId = e.getAttribute("data-channelId");

        chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId, index: -1}, function (response) {
            if (response.status){
                e.querySelector("span").innerHTML = getString("removeChannel").replace("YouTube Notifications", "YTN");
                e.setAttribute("subscribed", true);
            }else{
                e.querySelector("span").innerHTML = getString("addChannel").replace("YouTube Notifications", "YTN");
                e.removeAttribute("subscribed");
            }
            e.style.display = "flex";

            e.removeAttribute("init");
        });
    });

    if(document.querySelector("[ytn-script]") !== null)
        return;
    var code = "window.ytn_errors = [];" + ytn_injectionCode.toString() + "setInterval(function(){ytn_injectionCode(" + showAddButtons + ");}, 1000);";

    var script = document.createElement("script");
    script.setAttribute("ytn-script", "");
    script.innerHTML = code;
    document.head.appendChild(script);
}

function launchLegacy(){
    var slashes = window.location.href.split("/");
    if(slashes.indexOf("user") < 0 && slashes.indexOf("channel") < 0 && slashes.indexOf("subscription_manager") < 0 && slashes.pop().split("?").shift() != "watch"){
        return;
    }
    
    var elemContent = '<button class="yt-uix-button yt-uix-button-size-default yt-uix-button-has-icon no-icon-markup hover-enabled ytn-btn" type="button" style="margin-left: 5px;float: initial;">\
            <span class="yt-uix-button-content">\
                <span class="subscribe-label" aria-label="' + getString("addChannel") + '">' + getString("addChannel") + '</span>\
                <span class="subscribed-label" aria-label="' + getString("channelAdded") + '">' + getString("channelAdded") + '</span>\
                <span class="unsubscribe-label" aria-label="' + getString("removeChannel") + '">' + getString("removeChannel") + '</span>\
            </span>\
        </button>';
    
    if(slashes.indexOf("subscription_manager") > -1 && $(".ytn-btn").length == 0){// If is on page: https://www.youtube.com/subscription_manager
        var elems = $(elemContent).insertBefore(".yt-uix-overlay");
        for(var i = 0; i < elems.length; i++){
            var channelId = $($(".yt-uix-overlay")[i]).parent().children(".yt-uix-button").attr("data-channel-external-id");
            $(elems[i]).attr("data-channelId", channelId);
            chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId, index: i}, function(response){
                if(response.status)
                    $(elems[response.index]).removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
                else
                    $(elems[response.index]).addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
            });
        }
    }else{// For everything else
        $(".yt-uix-overlay").each(function(){
            var $this = $(this),
                elem = null;
            if($this.is(".channel-settings-overlay, .featured-content-picker-overlay, .settings-dialog-container") ||
                $this.parents(".about-metadata-container, .channel-header-flagging-menu-container").length > 0 ||
                $this.parents(".primary-header-actions").find(".ytn-btn").length > 0)
                return;
            else{
                elem = $(elemContent);
                if($this.parents(".primary-header-actions").length > 0){
                    elem[0].style.float = "right";
                    $this.parents(".primary-header-actions").prepend(elem);
                }else
                    elem.insertBefore($this);
            }

            if(elem == null)
                return true;

            var channelId = $(".yt-uix-button.yt-uix-subscription-button").attr("data-channel-external-id");
            elem.attr("data-channelId", channelId);
            chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId}, function(response){
                if(response.status)
                    elem.removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
                else
                    elem.addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
            });
        });

    }
}