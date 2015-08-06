$(function(){
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		switch (request.type) {
			case "refreshPage":
				sendResponse(refreshPage());
				break;
			case "refreshStart":
				sendResponse(addLoading());
				break;
			case "refreshEnd":
				sendResponse(remLoading());
				break;
			case "createSnackbar":
				createSnackbar(request.message);
				break;
		}
	});
	getVideoList();
	registerListeners();
	setTimeout(function(){
		configureSettings();
	}, 500);
});

function getVideoList() {
	var channels = JSON.parse(localStorage.getItem("channels"));
	for(var i = 0; i < channels.length; i++) {
		var date = new Date(parseInt(channels[i].latestVideo.timestamp)*1000);
		date = timeSince(date);
		if(date.indexOf("/") != -1)
			date = "Published on " + date;
		else
			date = "Published " + date + " ago";
		
		var elem = $("#masterChannelRow").clone().appendTo("#channels");
		elem.removeAttr("id");
		elem.attr("data-id", i);
		elem.css("display", "");
		elem.children(".channelColumn:nth-child(1)").children(".channel_img").attr("src", channels[i].thumbnail);
		elem.children(".channelColumn:nth-child(1)").children(".channel_author").text(channels[i].name);
		elem.children(".channelColumn:nth-child(1)").children(".channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
		elem.children(".channelColumn:nth-child(1)").children(".channel_a").attr("title",  channels[i].name);
		elem.children(".channelColumn:nth-child(2)").children(".channel_video_img").attr("src", channels[i].latestVideo.thumbnail);
		elem.children(".channelColumn:nth-child(2)").children(".channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
		elem.children(".channelColumn:nth-child(2)").children(".channel_video_a").attr("title", channels[i].latestVideo.title);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_a").attr("title", channels[i].latestVideo.title);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_title").text(channels[i].latestVideo.title);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_time").text(date);
	}
}

function registerListeners(){
	$(document).on("click", "a", function(){
		if($(this).attr("href") != null && $(this).attr("href").charAt(0) != "#")
			chrome.tabs.create({url: $(this).attr("href")});
	});
	$("#add_channels-fab").on("click", function(){
		$("#add_channels-container").attr("data-toggle", "true");
	});
	$("#add_channels-container .overlay").on("click", function(){
		if(!$("#loading").is(":visible"))
			$("#add_channels-container").attr("data-toggle", "false");
	});
	$("#add_channels-more-button").on("click", function(){
		$($("#add_channels-dialog .mdl-card__supporting-text .mdl-textfield")[0]).clone().appendTo("#add_channels-dialog .mdl-card__supporting-text").children("input").val("");
	});
	
	$("#add_channels-add-button").on("click", function(){
		$("#add_channels-dialog").fadeOut("slow");
		$("#loading").fadeIn("slow");
		var i = 0;
		$(".add_channel_input").each(function(i){
			if($($(".add_channel_input")[i]).val() != ""){
				chrome.extension.sendMessage({type: "setYoutube", name: $($(".add_channel_input")[i]).val(), refresh: true});
				i++;
			}
		});
		if(i > 0){
			$("#loading").stop().hide();
			$("#add_channels-dialog").stop().show();
			$("#add_channels-container").attr("data-toggle", "false");
		}
	});
	
	$(".channel_remove_btn").on("click", function(){
		var id = parseInt($(this).parent().parent().attr("data-id"));
		var channels = JSON.parse(localStorage.getItem("channels"));
		channels.splice(id, 1);
		localStorage.setItem("channels", JSON.stringify(channels));
		$(this).parent().parent().remove();
		$(".channelRow:not(#masterChannelRow)").each(function(i){
			$(this).attr("data-id", i);
		});
	});
	
	$("#settings_refresh").on("click", function(){
		chrome.extension.sendMessage({type: "checkYoutubeBatch", refresh: true});
		createSnackbar("Updating...");
	});
	
	$("#settings_notifications_test").on("click", function(){
		chrome.extension.sendMessage({type: "testNotify"});
	});
}

function refreshPage(){
	setTimeout(function(){
		$("body").fadeOut("slow");
		setTimeout(function(){
			location.reload();
		}, 600);
	}, 500);
}

function configureSettings(){
	var settings = JSON.parse(localStorage.getItem("settings"));
	if(settings.notifications.enabled){
		$("#settings_notifications_toggle").addClass("is-checked");
		$("#settings_notifications_toggle input")[0].checked = true;
	}else{
		$("#settings_notifications_toggle").removeClass("is-checked");
		$("#settings_notifications_toggle input")[0].checked = false;
	}
	$("#settings_notifications_toggle input").on("change", function(){
		var value = $("#settings_notifications_toggle input")[0].checked,
			settings = JSON.parse(localStorage.getItem("settings"));
		settings.notifications.enabled = value;
		localStorage.setItem("settings", JSON.stringify(settings));
		createSnackbar("Saved");
	});
	
	$("#settings_notifications_volume").val(settings.notifications.volume);
	$("#settings_notifications_volume").parent().children(".mdl-slider__background-flex").children(".mdl-slider__background-lower").css("flex", (settings.notifications.volume/100) + " 1 0%");
	$("#settings_notifications_volume").parent().children(".mdl-slider__background-flex").children(".mdl-slider__background-upper").css("flex", (1-(settings.notifications.volume/100)) + " 1 0%");
	$("#settings_notifications_volume").on("change", function(){
		var value = $("#settings_notifications_volume").val(),
			settings = JSON.parse(localStorage.getItem("settings"));
		settings.notifications.volume = value;
		localStorage.setItem("settings", JSON.stringify(settings));
		createSnackbar("Saved");
	});
	
	
	if(settings.tts.enabled){
		$("#settings_tts_toggle").addClass("is-checked");
		$("#settings_tts_toggle input")[0].checked = true;
	}else{
		$("#settings_tts_toggle").removeClass("is-checked");
		$("#settings_tts_toggle input")[0].checked = false;
	}
	$("#settings_tts_toggle input").on("change", function(){
		var value = $("#settings_tts_toggle input")[0].checked,
			settings = JSON.parse(localStorage.getItem("settings"));
		settings.tts.enabled = value;
		localStorage.setItem("settings", JSON.stringify(settings));
		createSnackbar("Saved");
	});
	
	launchSpeechSynthesis();
}

function launchSpeechSynthesis(){
	var speechSynthesisList = window.speechSynthesis.getVoices();
	if(speechSynthesisList.length < 1){
		setTimeout(function(){
			launchSpeechSynthesis();
		},100);
	}else{
		for(var i = 0; i < speechSynthesisList.length; i++)			
			$("#settings_tts_select").append($("<option></option>").attr("value", i).text(speechSynthesisList[i].name));
		$("#settings_tts_select").val(JSON.parse(localStorage.getItem("settings")).tts.type);
		$("#settings_tts_select").on("change", function(){
			var value = parseInt($("#settings_tts_select").val()),
				settings = JSON.parse(localStorage.getItem("settings"));
			settings.tts.type = parseInt($("#settings_tts_select").val());
			localStorage.setItem("settings", JSON.stringify(settings));
			createSnackbar("Saved");
		});
	}
}

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
		return interval + " days";
	
	interval = Math.floor(seconds / 3600);
	if (interval > 1){
		if(interval > 23)
			return "1 day";
		else
			return interval + " hours";
	}
	
	interval = Math.floor(seconds / 60);
	if (interval > 1){
		if(interval > 59)
			return "1 hour";
		else
			return interval + " minutes";
	}
	
	interval = Math.floor(seconds);
	if (interval > 1){
		if(interval > 59)
			return "1 minute";
		else
			return interval + " seconds";
	}else
		return interval + " second";
}

// SNACKBAR
var createSnackbar=function(){var t=null;return function(e,i,n){t&&t.dismiss();var a=document.createElement("div");a.className="paper-snackbar",a.dismiss=function(){this.style.opacity=0};var s=document.createTextNode(e);if(a.appendChild(s),i){n||(n=a.dismiss.bind(a));var d=document.createElement("button");d.className="action",d.innerHTML=i,d.addEventListener("click",n),a.appendChild(d)}setTimeout(function(){t===this&&t.dismiss()}.bind(a),5e3),a.addEventListener("transitionend",function(e){"opacity"===e.propertyName&&0==this.style.opacity&&(this.parentElement.removeChild(this),t===this&&(t=null))}.bind(a)),t=a,document.body.appendChild(a),getComputedStyle(a).bottom,a.style.bottom="0px",a.style.opacity=1}}();