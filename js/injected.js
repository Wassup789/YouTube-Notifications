$(function(){
	chrome.runtime.sendMessage({type: "showAddButton"}, function(response){
		if(response){
			launch();
			setInterval(function(){
				launch();
			}, 1000);
		}
	});
	
	$(document).on("click", "#ytn-btn", function(){
		var channelId = $(".yt-uix-button.yt-uix-subscription-button").attr("data-channel-external-id");
		if($(this).hasClass("yt-uix-button-subscribe-branded")){// Add channel
			chrome.runtime.sendMessage({type: "setYoutube", contentScript: true, name: channelId, refresh: true}, function(response){
				if(response)
					$("#ytn-btn").removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
			});
		}else if($(this).hasClass("yt-uix-button-subscribed-branded")){// Remove channel
			chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true}, function(response){
				if(response)
					$("#ytn-btn").addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
			});
		}
	});
	$(document).on("click", ".ytn-btn", function(){
		var channelId = $(this).parent().children(".yt-uix-button").attr("data-channel-external-id");
		if($(this).hasClass("yt-uix-button-subscribe-branded")){// Add channel
			chrome.runtime.sendMessage({type: "setYoutube", contentScript: true, name: channelId, refresh: true}, function(response){
				if(response)
					$("#ytn-btn").removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
			});
		}else if($(this).hasClass("yt-uix-button-subscribed-branded")){// Remove channel
			chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true}, function(response){
				if(response)
					$("#ytn-btn").addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
			});
		}
	});
});
function launch(){
	var slashes = window.location.href.split("/");
	if(slashes.indexOf("user") < 0 && slashes.indexOf("channel") < 0 && slashes.indexOf("subscription_manager") < 0 && slashes.pop().split("?").shift() != "watch"){
		return;
	}
	if(slashes.indexOf("subscription_manager") > -1 && $(".ytn-btn").length == 0){// If is on page: https://www.youtube.com/subscription_manager
		var elem = '<button class="yt-uix-button yt-uix-button-size-default yt-uix-button-has-icon no-icon-markup hover-enabled ytn-btn" type="button" style="margin-left: 5px;">\
			<span class="yt-uix-button-content">\
				<span class="subscribe-label" aria-label="Add to YouTube Notifications">Add to YouTube Notifications</span>\
				<span class="subscribed-label" aria-label="Added to YouTube Notifications">Added to YouTube Notifications</span>\
				<span class="unsubscribe-label" aria-label="Remove from YouTube Notifications">Remove from YouTube Notifications</span>\
			</span>\
		</button>';
		var elems = $(elem).insertBefore(".yt-uix-overlay");
		for(var i = 0; i < elems.length; i++){
			var channelId = $($(".yt-uix-overlay")[i]).parent().children(".yt-uix-button").attr("data-channel-external-id");
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
				<span class="subscribe-label" aria-label="Add to YouTube Notifications">Add to YouTube Notifications</span>\
				<span class="subscribed-label" aria-label="Added to YouTube Notifications">Added to YouTube Notifications</span>\
				<span class="unsubscribe-label" aria-label="Remove from YouTube Notifications">Remove from YouTube Notifications</span>\
			</span>\
		</button>';
		$(elem).insertBefore(".yt-uix-overlay");
		
		var channelId = $(".yt-uix-button.yt-uix-subscription-button").attr("data-channel-external-id");
		chrome.runtime.sendMessage({type: "doesYoutubeExist",  id: channelId}, function(response){
			if(response.status)
				$("#ytn-btn").removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
			else
				$("#ytn-btn").addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
		});
	}
}