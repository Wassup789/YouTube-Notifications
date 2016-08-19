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

$(function(){
	chrome.runtime.sendMessage({type: "showAddButton"}, function(response){
		if(response){
			launch();
			setInterval(function(){
				launch();
			}, 1000);
		}
	});

	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		switch (request.type) {
			case "contentScript_response":
				onMessageResponse(request.responseType, request.id);
				break;
		}
	});

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
});
function onMessageResponse(type, id){
	awaitingResponse.forEach(function(item, i) {
		if(item.id == id){
			if(type)
				item.elem.removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
			else
				item.elem.addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
			awaitingResponse.pop(i);
		}
	});
}
function launch(){
	var slashes = window.location.href.split("/");
	if(slashes.indexOf("user") < 0 && slashes.indexOf("channel") < 0 && slashes.indexOf("subscription_manager") < 0 && slashes.pop().split("?").shift() != "watch"){
		return;
	}
	if(slashes.indexOf("subscription_manager") > -1 && $(".ytn-btn").length == 0){// If is on page: https://www.youtube.com/subscription_manager
		var elem = '<button class="yt-uix-button yt-uix-button-size-default yt-uix-button-has-icon no-icon-markup hover-enabled ytn-btn" type="button" style="margin-left: 5px;">\
			<span class="yt-uix-button-content">\
				<span class="subscribe-label" aria-label="' + getString("addChannel") + '">' + getString("addChannel") + '</span>\
				<span class="subscribed-label" aria-label="' + getString("channelAdded") + '">' + getString("channelAdded") + '</span>\
				<span class="unsubscribe-label" aria-label="' + getString("removeChannel") + '">' + getString("removeChannel") + '</span>\
			</span>\
		</button>';
		var elems = $(elem).insertBefore(".yt-uix-overlay");
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
	}else if($("#ytn-btn").length == 0 && slashes.indexOf("subscription_manager") < 0){// For everything else
		var elem = '<button id="ytn-btn" class="yt-uix-button yt-uix-button-size-default yt-uix-button-has-icon no-icon-markup hover-enabled" type="button" style="margin-left: 5px;">\
			<span class="yt-uix-button-content">\
				<span class="subscribe-label" aria-label="' + getString("addChannel") + '">' + getString("addChannel") + '</span>\
				<span class="subscribed-label" aria-label="' + getString("channelAdded") + '">' + getString("channelAdded") + '</span>\
				<span class="unsubscribe-label" aria-label="' + getString("removeChannel") + '">' + getString("removeAdded") + '</span>\
			</span>\
		</button>';
		$(elem).insertBefore(".yt-uix-overlay");

		var channelId = $(".yt-uix-button.yt-uix-subscription-button").attr("data-channel-external-id");
		$("#ytn-btn").attr("data-channelId", channelId);
		chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId}, function(response){
			if(response.status)
				$("#ytn-btn").removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
			else
				$("#ytn-btn").addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
		});
	}
}
