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
	},
	wyns.previousLastListItem;
$(function(){
	setLocales();
	
	if(!chrome.extension.getBackgroundPage().wyn.isConnected)
		createSnackbar(wyns.strings.connect_failed);
	
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		switch (request.type) {
			case "refreshPage":
				refreshPage();
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
					createSnackbar(wyns.strings.add_channels_failed);
					
					$("#add_channels-dialog .mdl-card__supporting-text").children().not(":first").remove();
					$("#add_channels-dialog .mdl-card__supporting-text .mdl-textfield input").val("");
					wyns.channelsToAdd2 = -1;
				}
				break;
			case "createSnackbar":
				createSnackbar(request.message);
				break;
		}
	});
	
	var manifest = chrome.runtime.getManifest(),
		homeUrl = "https://github.com/Wassup789";
	$("#version").html(wyns.strings.info_version + " " + manifest.version + "<br/>" + wyns.strings.info_by + " <a href=\"" + homeUrl + "\">Wassup789</a>");
	
	var settings = JSON.parse(localStorage.getItem("settings"));
	if(settings.updated.enabled)
		$("#version-updated").show();
	
	getVideoList();
	registerListeners();
	setTimeout(function(){
		initSearch();// This includes the listener for search
		configureSettings();
	}, 500);
});

/**
 *  Sets the appropriate text to all html tags with the attribute 'i18n'
 */
function setLocales() {
	$("[i18n]").each(function(i, html){
		var string = chrome.i18n.getMessage($(html).attr("i18n"));
		$(html).text(string);
	});
}

/**
 *  Gets the string from the locales appropriate to settings.js
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
 */
function getVideoList() {
	var channels = JSON.parse(localStorage.getItem("channels"));
	for(var i = 0; i < channels.length; i++) {
		var date = new Date(parseInt(channels[i].latestVideo.timestamp)*1000);
		date = timeSince(date);
		if(date.indexOf("/") != -1)
			date = wyns.strings.info_publishedOn + " " + date;
		else
			date = wyns.strings.info_published + " " + date + " " + wyns.strings.info_ago;
		
		var elem = $("#masterChannelRow").clone().appendTo("#channels");
		elem.removeAttr("id");
		elem.attr("data-id", i);
		elem.css("display", "");
		elem.find(".channelColumn:nth-child(1) .channel_img").attr("src", channels[i].thumbnail);
		elem.find(".channelColumn:nth-child(1) .channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
		elem.find(".channelColumn:nth-child(2) .channel_author").text(channels[i].name);
		elem.find(".channelColumn:nth-child(2) .channel_author_info").text(addCommas(channels[i].subscriberCount) + " " + wyns.strings.info_subscribers + " \u2022 " + addCommas(channels[i].viewCount) + " " + wyns.strings.info_views);
		elem.find(".channelColumn:nth-child(2) .channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
		elem.find(".channelColumn:nth-child(2) .channel_a").attr("title",  channels[i].name);
		elem.find(".channelColumn:nth-child(3) .channel_video_img").attr("src", channels[i].latestVideo.thumbnail);
		elem.find(".channelColumn:nth-child(3) .channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
		elem.find(".channelColumn:nth-child(4) .channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
		elem.find(".channelColumn:nth-child(3) .channel_video_a").attr("title", channels[i].latestVideo.title);
		elem.find(".channelColumn:nth-child(4) .channel_video_a").attr("title", channels[i].latestVideo.title);
		elem.find(".channelColumn:nth-child(4) .channel_video_title").text(channels[i].latestVideo.title);
		elem.find(".channelColumn:nth-child(4) .channel_video_time").text(date);
	}
}

/**
 *  Registers all listeners
 */
function registerListeners(){
	$(document).on("click", "a", function(){
		if($(this).attr("href") != null && $(this).attr("href").charAt(0) != "#")
			chrome.tabs.create({url: $(this).attr("href")});
	});
	$("#add_channels-fab").on("click", function(){
		$("#add_channels-container").attr("data-toggle", "true");
		$($(".add_channel_input")[0]).focus();
	});
	$("#add_channels-container .overlay").on("click", function(){
		if(!$("#loading").is(":visible"))
			$("#add_channels-container").attr("data-toggle", "false");
	});
	$("#add_channels-more-button").on("click", function(){
		var elem = $($("#add_channels-dialog .mdl-card__supporting-text .mdl-textfield")[0]).clone().appendTo("#add_channels-dialog .mdl-card__supporting-text").children("input").val("");
		elem = elem.parent();
		elem.removeClass("is-upgraded");
		elem.removeAttr("data-upgraded");
		componentHandler.upgradeElement(elem[0]);
	});
	
	$("#add_channels-add-button").on("click", function(){
		$("#add_channels-dialog").fadeOut("slow");
		$("#loading").fadeIn("slow");
		var num = 0;
		$(".add_channel_input").each(function(i){
			if($($(".add_channel_input")[i]).val() != ""){
				chrome.extension.sendMessage({type: "setYoutube", name: $($(".add_channel_input")[i]).val(), refresh: true});
				num++;
			}
		});
		if(num < 1){
			$("#loading").stop().hide();
			$("#add_channels-dialog").stop().show().css("opacity", 1);
			$("#add_channels-container").attr("data-toggle", "false");
			createSnackbar(wyns.strings.add_channels_failed);
					
			$("#add_channels-dialog .mdl-card__supporting-text").children().not(":first").remove();
			$("#add_channels-dialog .mdl-card__supporting-text .mdl-textfield input").val("");
		}else
			wyns.channelsToAdd = num;
	});
	$("body").on("keyup", ".add_channel_input", function(e){
		if(e.keyCode == 13)
			$("#add_channels-add-button").click();
	});
	
	$(".channel_remove_btn").on("click", function(){
		if(sortable.option("disabled")){
			var id = parseInt($(this).parent().parent().attr("data-id"));
			var channels = JSON.parse(localStorage.getItem("channels")),
				name = channels[id].name;
			channels.splice(id, 1);
			localStorage.setItem("channels", JSON.stringify(channels));
			$(this).parent().parent().remove();
			$(".channelRow:not(#masterChannelRow)").each(function(i){
				$(this).attr("data-id", i);
			});
			createSnackbar(wyns.strings.user_remove_channel + "\"" + name + "\"");
			console.log(wyns.strings.user_remove_channel + name);
		}
	});
	$(".channel_info_btn").on("click", function(){
		var id = parseInt($(this).parent().parent().attr("data-id"));
		displayPopupCard(id);
	});
	$("#popup_card").on("click", ".channel_info_btn", function(){
		var id = parseInt($(this).parent().parent().attr("data-id"));
		displayPopupCard(id);
	});
	$("#popup_overlay").on("click", function(){
		var id = parseInt($(this).parent().find("#popup_card .channelRow").attr("data-id"));
		displayPopupCard(id);
	});
	
	$("#settings_refresh").on("click", function(){
		chrome.extension.sendMessage({type: "checkYoutubeBatch", refresh: true});
		createSnackbar(wyns.strings.updating);
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
	$("#menu_changeAlignment").on("click", function(){
		if($(this).attr("data-toggle") != "false"){
			$(".channelRow:not(#masterChannelRow)").removeClass("editable");
			sortable.option("disabled", true);
			disableButtons(false);
			
			var newArr = [],
				oldArr = JSON.parse(localStorage.getItem("channels"));
			$(".channelRow:not(#masterChannelRow)").each(function(){
				var id = parseInt($(this).attr("data-id"));
				newArr.push(oldArr[id]);
			});
			
			localStorage.setItem("channels", JSON.stringify(newArr));
			createSnackbar(wyns.strings.saved);
			
			$(this).attr("data-toggle", "false");
		}else{
			$(".channelRow:not(#masterChannelRow)").addClass("editable");
			sortable.option("disabled", false);
			disableButtons(true);
			
			$(this).attr("data-toggle", "true");
		}
	});
	$("#menu_help").on("click", function(){
		chrome.extension.getBackgroundPage().wyn.firstLaunch();
	});
	$("#version-updated").on("click", function(){
		$("#changelog-dialog .card-header").text("v" + chrome.runtime.getManifest().version);
		$("#changelog-container").attr("data-toggle", true);
		var settings = JSON.parse(localStorage.getItem("settings"));
		settings.updated.enabled = false;
		localStorage.setItem("settings", JSON.stringify(settings));
	});
	$("#changelog-close-button").on("click", function(){
		$("#changelog-container").attr("data-toggle", false);
	});
	$("#changelog-container .overlay, #import_channels-container .overlay").on("click", function(){
		if(!$("#loading").is(":visible"))
			$(this).parent().attr("data-toggle", false);
	});
	$("#import_channels-close-button").on("click", function(){
		$("#import_channels-container").attr("data-toggle", false);
	});
	$("#import_channels-import-button").on("click", function(){
		$("#import_channels-container").attr("data-toggle", false);
	});
	$("#popup_videoList_more").on("click", function(){
		getChannelVideos(publishedBeforeDate);
	});
	$("#settings_addbtn_viewsubs").on("click", function(){
		chrome.tabs.create({url: "https://www.youtube.com/subscription_manager"});
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
		
		$("a.mdl-layout__tab").removeClass("is-active");
		$("a[href='#tab-newest_uploads']").addClass("is-active");
		$(".mdl-layout__tab-panel").removeClass("is-active");
		$("#tab-newest_uploads").addClass("is-active");
	}else{
		$(".channelRow:not(#masterChannelRow) .channelColumn:nth-child(5) .channel_info_btn").show();
		$("#add_channels-fab").show();
	}
}

/**
 *  Refreshes the options menu
 */
function refreshPage(){
	setTimeout(function(){
		$("body").fadeOut("slow");
		setTimeout(function(){
			location.reload();
		}, 600);
	}, 500);
}

/**
 *  Updates the values in the settings page
 */
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
		createSnackbar(wyns.strings.saved);
	});
	
	$("#settings_notifications_volume").val(settings.notifications.volume);
	$("#settings_notifications_volume").parent().find(".mdl-slider__background-lower").css("flex", (settings.notifications.volume/100) + " 1 0%");
	$("#settings_notifications_volume").parent().find(".mdl-slider__background-upper").css("flex", (1-(settings.notifications.volume/100)) + " 1 0%");
	$("#settings_notifications_volume").on("change", function(){
		var value = $("#settings_notifications_volume").val(),
			settings = JSON.parse(localStorage.getItem("settings"));
		settings.notifications.volume = value;
		localStorage.setItem("settings", JSON.stringify(settings));
		createSnackbar(wyns.strings.saved);
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
		createSnackbar(wyns.strings.saved);
	});
	
	
	if(settings.addBtn.enabled){
		$("#settings_addbtn_toggle").addClass("is-checked");
		$("#settings_addbtn_toggle input")[0].checked = true;
	}else{
		$("#settings_addbtn_toggle").removeClass("is-checked");
		$("#settings_addbtn_toggle input")[0].checked = false;
	}
	$("#settings_addbtn_toggle input").on("change", function(){
		var value = $("#settings_addbtn_toggle input")[0].checked,
			settings = JSON.parse(localStorage.getItem("settings"));
		settings.addBtn.enabled = value;
		localStorage.setItem("settings", JSON.stringify(settings));
		createSnackbar(wyns.strings.saved);
	});
	
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
		for(var i = 0; i < speechSynthesisList.length; i++)			
			$("#settings_tts_select").append($("<option></option>").attr("value", i).text(speechSynthesisList[i].name));
		$("#settings_tts_select").val(JSON.parse(localStorage.getItem("settings")).tts.type);
		$("#settings_tts_select").on("change", function(){
			var value = parseInt($("#settings_tts_select").val()),
				settings = JSON.parse(localStorage.getItem("settings"));
			settings.tts.type = parseInt($("#settings_tts_select").val());
			localStorage.setItem("settings", JSON.stringify(settings));
			createSnackbar(wyns.strings.saved);
		});
	}
}

/**
 *  Displays a popup card for a channel displaying it's information and it's last ten videos
 *  
 *  @param {number} num The channel's index
 */
var popupId = -1, savedData = {}, publishedBeforeDate;
function displayPopupCard(num){
	if(typeof $("#channels .channelRow:not(#masterChannelRow)")[num] !== "undefined"){
		if($("#popup_card").attr("data-toggle") != "true"){
			popupId = num;
			$("main").addClass("unscrollable");//Disable scrolling so popup_card doesn't look weird
			$("#popup_card").children(":not(#popup_videoList):not(#popup_loading)").remove();//Remove items from popup before
			$("#popup_card").children("#popup_videoList").children(":not(#masterVideoListRow):not(#popup_videoList_more_container)").remove();//Remove video list items from popup before
			$("#popup_card").prepend($("#channels .channelRow:not(#masterChannelRow)")[num].outerHTML);//Prepend clicked contents
			$("#popup_card").css("top", $("#channels .channelRow:not(#masterChannelRow)")[num].getBoundingClientRect().top - parseInt($($(".main_card")[0]).css("marginTop")) - parseInt($("main").css("marginTop"))+1);//Align popup with clicked card
			$("#popup_card").css("height", 70);
			
			$("#popup_videoList_more_container").hide();//Hides the display of the button whilst loading the popup
			
			$("#popup_card").fadeIn("fast");
			$("#popup_card").animate({//Card appears to be lifted
				boxShadow: "0 16px 24px 2px rgba(0,0,0,.14),0 6px 30px 5px rgba(0,0,0,.12),0 8px 10px -5px rgba(0,0,0,.2)",
			}, 350);
			$("#popup_card .channel_info_btn").animate({//Seamless info button on transition from cards
				marginTop: -45
			}, 350);
			$("#popup_card").delay(150).animate({//Stretch card to fill content
				top: 104,
				height: 466
			}, 350);
			$("#popup_overlay").delay(650).fadeIn("fast");
			setTimeout(function(){
				$("#popup_card .channel_info_btn").css("marginTop", "");//Reset info button
				$("#popup_card .channelColumn").not(".popup_show").hide();//Remove unneeded content
				$("#popup_card .channel_remove_btn").fadeOut("fast");//Remove the X button thats behind the info button
				$("#popup_card").attr("data-toggle", "true");
				getChannelVideos();
			}, 650);
		}else{
			$("#popup_card").animate({ scrollTop: 0 }, "fast");//Scroll to top for info button transition alignment
			$("#popup_loading").fadeOut("fast");//Remove loading if exists
			$("#popup_card").animate({//Transform card to original size
				top: $("#channels .channelRow:not(#masterChannelRow)")[popupId].getBoundingClientRect().top - parseInt($($(".main_card")[0]).css("marginTop")) - parseInt($("main").css("marginTop"))+1,
				height: 70
			}, 350);
			$("#popup_card .channel_info_btn").animate({//Seamless info button transition
				marginTop: 27,
				marginRight: 5
			}, 350);
			$("#popup_card .channel_remove_btn").fadeIn("fast");//Fade in the X button
			$("#popup_card").delay(150).animate({//Card goes back to content
				boxShadow: "0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0)",
			}, 350);
			$("#popup_overlay").delay(500).fadeOut("fast");
			setTimeout(function(){
				$("#popup_card .channel_info_btn").css("marginTop", "");//Reset info button
				$("#popup_card .channelColumn").not(":first").not(":last").show();//Re-add buttons
				$("#popup_card").attr("data-toggle", "false");
			}, 450);
			setTimeout(function(){
				$("#popup_card").hide();
				$("main").removeClass("unscrollable");//Delays scrollability until popup_card completely disapears
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
		channelId = JSON.parse(localStorage.getItem("channels"))[id].id,
		playlistId = JSON.parse(localStorage.getItem("channels"))[id].playlistId,
		//url = "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=10&playlistId=" + playlistId + "&key=" + wyns.apiKey;
		url = "https://www.googleapis.com/youtube/v3/search?part=snippet&order=date&safeSearch=none&type=video&maxResults=10" + (typeof publishedBefore === "undefined" ? "" : "&publishedBefore=" + publishedBefore) + "&channelId=" + channelId + "&key=" + wyns.apiKey;
	if(typeof savedData[channelId] !== "undefined" && typeof publishedBefore === "undefined")
		setChannelVideos(savedData[channelId]);
	else{
		$("#popup_loading").fadeIn("fast");//Fade in loading (will look strange without fades)
		$.ajax({
			type: "GET",
			dataType: "json",
			url: url,
			success: function(data) {
				if(data.items.length < 10)
					$("#popup_videoList_more_container").slideUp();
				
				var videos = "";
				for(var i = 0; i < data.items.length; i++)
					//videos += data.items[i].contentDetails.videoId + ",";
					videos += data.items[i].id.videoId + ",";
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
								thumbnail:		data.items[i].snippet.thumbnails.high.url,
								likes:			data.items[i].statistics.likeCount,
								dislikes:		data.items[i].statistics.dislikeCount,
								views:			data.items[i].statistics.viewCount,
								duration:		convertISO8601Duration(data.items[i].contentDetails.duration)
							};
							output.push(outputAdd);
						}
						setChannelVideos(output);
						if(typeof publishedBefore === "undefined")
							savedData[channelId] = output;
						else
							savedData[channelId] = savedData[channelId].concat(output);
						$("#popup_loading").fadeOut("slow");
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
		
		if(data[i].views == "301")
			data[i].views = "301+";
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
		elem.find("a .videoListColumn:nth-child(3) .videoList_title").text(addCommas(data[i].views) + " " + wyns.strings.info_views + " | " + likesa + "% " + wyns.strings.info_likes + " | " + dislikesa + "% " + wyns.strings.info_dislikes);
		elem.find("a .videoListColumn:nth-child(3) .videoList_sub").text(data[i].duration);
		
		if(i == data.length - 1)
			publishedBeforeDate = new Date(parseInt(data[i].timestamp)*1000 - 1000).toISOString();
	}
	
	$("#popup_videoList_more_container").show();//Display the "load more" container incase the button is removed due to the lack of videos
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
	$("#search-btn").on("click", updateSearchExact);
}

/**
 *  Updates the search items
 */
function updateSearch() {
	if(popupId != -1)
		return;
	
	var val = $("#search-input").val().toLowerCase().trim();
	var max = 0;
	
	$(".channelRow:not(#masterChannelRow)").show().filter(function() {
		var text = $(this).find(".channel_author").text().toLowerCase();
		if(text.indexOf(val) < 0) max++;
		return !~text.indexOf(val);
	}).hide();
	
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
		displayPopupCard(parseInt(list.attr("data-id")));
	list.filter(function(){
		if($(this).find(".channel_author").text().toLowerCase().trim() == val)
			displayPopupCard(parseInt($(this).attr("data-id")));
	});
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
 *  Add commas to numbers > 3
 *  Ex: 1234567 -> 1,234,567
 *  
 *  @param {number} num The number to add commas to
 *  @returns {string} Number inputted with commas
 */
function addCommas(num) {return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");}

/**
 *  Converts an ISO-8601 formatted string to a different timestamp format (HH:MM:SS)
 *  Script by Mikolaj Lukasik on stackoverflow.com
 *  
 *  @param {string} r The ISO-8601 formmated string
 *  @returns {string} Returns duration in HH:MM:SS format
 */
function convertISO8601Duration(r){var e=r.split("T"),t="",i={},n={},s="string",a="variables",l="letters",v={period:{string:e[0].substring(1,e[0].length),len:4,letters:["Y","M","W","D"],variables:{}},time:{string:e[1],len:3,letters:["H","M","S"],variables:{}}};v.time.string||(v.time.string="");for(var g in v)for(var o=v[g].len,M=0;o>M;M++)v[g][s]=v[g][s].split(v[g][l][M]),v[g][s].length>1?(v[g][a][v[g][l][M]]=parseInt(v[g][s][0],10),v[g][s]=v[g][s][1]):(v[g][a][v[g][l][M]]=0,v[g][s]=v[g][s][0]);return n=v.period.variables,i=v.time.variables,i.H+=24*n.D+168*n.W+672*n.M+8064*n.Y,i.H&&(t=i.H+":",i.M<10&&(i.M="0"+i.M)),i.S<10&&(i.S="0"+i.S),t+=i.M+":"+i.S}


// SNACKBAR
var createSnackbar=function(){var t=null;return function(e,i,n){t&&t.dismiss();var a=document.createElement("div");a.className="paper-snackbar",a.dismiss=function(){this.style.opacity=0};var s=document.createTextNode(e);if(a.appendChild(s),i){n||(n=a.dismiss.bind(a));var d=document.createElement("button");d.className="action",d.innerHTML=i,d.addEventListener("click",n),a.appendChild(d)}setTimeout(function(){t===this&&t.dismiss()}.bind(a),5e3),a.addEventListener("transitionend",function(e){"opacity"===e.propertyName&&0==this.style.opacity&&(this.parentElement.removeChild(this),t===this&&(t=null))}.bind(a)),t=a,document.body.appendChild(a),getComputedStyle(a).bottom,a.style.bottom="0px",a.style.opacity=1}}();

// SHADOW TRANSITION
'use strict';jQuery(function(h){function r(b,m,d){var l=[];h.each(b,function(f){var g=[],e=b[f];f=m[f];e.b&&g.push("inset");"undefined"!==typeof f.left&&g.push(parseFloat(e.left+d*(f.left-e.left))+"px "+parseFloat(e.top+d*(f.top-e.top))+"px");"undefined"!==typeof f.blur&&g.push(parseFloat(e.blur+d*(f.blur-e.blur))+"px");"undefined"!==typeof f.a&&g.push(parseFloat(e.a+d*(f.a-e.a))+"px");if("undefined"!==typeof f.color){var p="rgb"+(h.support.rgba?"a":"")+"("+parseInt(e.color[0]+d*(f.color[0]-e.color[0]),
10)+","+parseInt(e.color[1]+d*(f.color[1]-e.color[1]),10)+","+parseInt(e.color[2]+d*(f.color[2]-e.color[2]),10);h.support.rgba&&(p+=","+parseFloat(e.color[3]+d*(f.color[3]-e.color[3])));g.push(p+")")}l.push(g.join(" "))});return l.join(", ")}function q(b){function m(){var a=/^inset\b/.exec(b.substring(c));return null!==a&&0<a.length?(k.b=!0,c+=a[0].length,!0):!1}function d(){var a=/^(-?[0-9\.]+)(?:px)?\s+(-?[0-9\.]+)(?:px)?(?:\s+(-?[0-9\.]+)(?:px)?)?(?:\s+(-?[0-9\.]+)(?:px)?)?/.exec(b.substring(c));
return null!==a&&0<a.length?(k.left=parseInt(a[1],10),k.top=parseInt(a[2],10),k.blur=a[3]?parseInt(a[3],10):0,k.a=a[4]?parseInt(a[4],10):0,c+=a[0].length,!0):!1}function l(){var a=/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/.exec(b.substring(c));if(null!==a&&0<a.length)return k.color=[parseInt(a[1],16),parseInt(a[2],16),parseInt(a[3],16),1],c+=a[0].length,!0;a=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/.exec(b.substring(c));if(null!==a&&0<a.length)return k.color=[17*parseInt(a[1],16),17*parseInt(a[2],
16),17*parseInt(a[3],16),1],c+=a[0].length,!0;a=/^rgb\(\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*\)/.exec(b.substring(c));if(null!==a&&0<a.length)return k.color=[parseInt(a[1],10),parseInt(a[2],10),parseInt(a[3],10),1],c+=a[0].length,!0;a=/^rgba\(\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*,\s*([0-9\.]+)\s*\)/.exec(b.substring(c));return null!==a&&0<a.length?(k.color=[parseInt(a[1],10),parseInt(a[2],10),parseInt(a[3],10),parseFloat(a[4])],c+=a[0].length,!0):!1}function f(){var a=/^\s+/.exec(b.substring(c));
null!==a&&0<a.length&&(c+=a[0].length)}function g(){var a=/^\s*,\s*/.exec(b.substring(c));return null!==a&&0<a.length?(c+=a[0].length,!0):!1}function e(a){if(h.isPlainObject(a)){var b,e,c=0,d=[];h.isArray(a.color)&&(e=a.color,c=e.length);for(b=0;4>b;b++)b<c?d.push(e[b]):3===b?d.push(1):d.push(0)}return h.extend({left:0,top:0,blur:0,spread:0},a)}for(var p=[],c=0,n=b.length,k=e();c<n;)if(m())f();else if(d())f();else if(l())f();else if(g())p.push(e(k)),k={};else break;p.push(e(k));return p}h.extend(!0,
h,{support:{rgba:function(){var b=h("script:first"),m=b.css("color"),d=!1;if(/^rgba/.test(m))d=!0;else try{d=m!==b.css("color","rgba(0, 0, 0, 0.5)").css("color"),b.css("color",m)}catch(l){}b.removeAttr("style");return d}()}});var s=h("html").prop("style"),n;h.each(["boxShadow","MozBoxShadow","WebkitBoxShadow"],function(b,h){if("undefined"!==typeof s[h])return n=h,!1});n&&(h.Tween.propHooks.boxShadow={get:function(b){return h(b.elem).css(n)},set:function(b){var m=b.elem.style,d=q(h(b.elem)[0].style[n]||
h(b.elem).css(n)),l=q(b.end),f=Math.max(d.length,l.length),g;for(g=0;g<f;g++)l[g]=h.extend({},d[g],l[g]),d[g]?"color"in d[g]&&!1!==h.isArray(d[g].color)||(d[g].color=l[g].color||[0,0,0,0]):d[g]=q("0 0 0 0 rgba(0,0,0,0)")[0];b.run=function(b){b=r(d,l,b);m[n]=b}}})});