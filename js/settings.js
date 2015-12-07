var wyns = {};
	wyns.apiKey = chrome.extension.getBackgroundPage().wyn.apiKey,
	wyns.strings = {
		"connect_failed": chrome.extension.getBackgroundPage().wyn.strings.connect_failed,
		"updating": "Updating...",
		"saved": "Saved",
		"user_remove_chanel": "Removed YouTube Channel: "
	};
$(function(){
	if(!chrome.extension.getBackgroundPage().wyn.isConnected)
		createSnackbar(wyns.strings.connect_failed);
	
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
	
	var manifest = chrome.runtime.getManifest(),
		homeUrl = "https://github.com/Wassup789";
	$("#version").html("Version " + manifest.version + "<br/>by <a href=\"" + homeUrl + "\">Wassup789</a>");
	
	var settings = JSON.parse(localStorage.getItem("settings"));
	if(settings.updated.enabled)
		$("#version-updated").show();
	
	getVideoList();
	registerListeners();
	setTimeout(function(){
		configureSettings();
	}, 500);
});

/**
 *  Gets information of all YouTube channels and displays it in the options menu
 */
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
		elem.find(".channelColumn:nth-child(1) .channel_img").attr("src", channels[i].thumbnail);
		elem.find(".channelColumn:nth-child(1) .channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
		elem.find(".channelColumn:nth-child(2) .channel_author").text(channels[i].name);
		elem.find(".channelColumn:nth-child(2) .channel_author_info").text(addCommas(channels[i].subscriberCount) + " subscribers \u2022 " + addCommas(channels[i].viewCount) + " views");
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
	$(".add_channel_input").on("keyup", function(e){
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
			console.log(wyns.strings.user_remove_chanel + name);
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
		$("#changelog-container").attr("data-toggle", true);
		var settings = JSON.parse(localStorage.getItem("settings"));
		settings.updated.enabled = false;
		localStorage.setItem("settings", JSON.stringify(settings));
	});
	$("#changelog-close-button").on("click", function(){
		$("#changelog-container").attr("data-toggle", false);
	});
	$("#changelog-container .overlay").on("click", function(){
		if(!$("#loading").is(":visible"))
			$("#changelog-container").attr("data-toggle", false);
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
var popupId = -1, savedData = {};
function displayPopupCard(num){
	if(typeof $("#channels .channelRow:not(#masterChannelRow)")[num] !== "undefined"){
		if($("#popup_card").attr("data-toggle") != "true"){
			popupId = num;
			$("main").addClass("unscrollable");//Disable scrolling so popup_card doesn't look weird
			$("#popup_card").children(":not(#popup_videoList):not(#popup_loading)").remove();//Remove items from popup before
			$("#popup_card").children("#popup_videoList").children(":not(#masterVideoListRow)").remove();//Remove video list items from popup before
			$("#popup_card").prepend($("#channels .channelRow:not(#masterChannelRow)")[num].outerHTML);//Prepend clicked contents
			$("#popup_card").css("top", $("#channels .channelRow:not(#masterChannelRow)")[num].getBoundingClientRect().top - parseInt($($(".main_card")[0]).css("marginTop")) - parseInt($("main").css("marginTop"))+1);//Align popup with clicked card
			$("#popup_card").css("height", 70);
			
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
			$("#popup_card").delay(150).animate({//Card goes back to content
				boxShadow: "0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0)",
			}, 350);
			$("#popup_card").delay(500).fadeOut("fast");
			$("#popup_overlay").delay(500).fadeOut("fast");
			setTimeout(function(){
				$("main").removeClass("unscrollable");//Delays scrollability until popup_card completely disapears
			}, 1100);
			setTimeout(function(){
				$("#popup_card .channel_info_btn").css("marginTop", "");//Reset info button
				$("#popup_card .channelColumn").not(":first").not(":last").show();//Re-add buttons
				$("#popup_card").attr("data-toggle", "false");
			}, 450);
			popupId = -1;
		}
	}
}

/**
 *  Recieves information about the popup channel
 */
function getChannelVideos(){
	var id = parseInt($("#popup_card .channelRow").attr("data-id")),
		channelId = JSON.parse(localStorage.getItem("channels"))[id].id,
		playlistId = JSON.parse(localStorage.getItem("channels"))[id].playlistId,
		url = "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=10&playlistId=" + playlistId + "&key=" + wyns.apiKey;
	if(typeof savedData[channelId] !== "undefined")
		setChannelVideos(savedData[channelId]);
	else{
		$("#popup_loading").delay(500).fadeIn("fast");//Fade in loading (will look strange without fades)
		$.ajax({
			type: "GET",
			dataType: "json",
			url: url,
			success: function(data) {
				var videos = "";
				for(var i = 0; i < data.items.length; i++)
					videos += data.items[i].contentDetails.videoId + ",";
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
						savedData[channelId] = output;
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
	for(var i = 0; i < data.length; i++) {
		var date = new Date(parseInt(data[i].timestamp)*1000);
		date = timeSince(date);
		if(date.indexOf("/") != -1)
			date = "Published on " + date;
		else
			date = "Published " + date + " ago";
		
		if(data[i].views == "301")
			data[i].views = "301+";
		data[i].likes = parseInt(data[i].likes);
		data[i].dislikes = parseInt(data[i].dislikes);
		var likesa = Math.round((data[i].likes / (data[i].likes + data[i].dislikes)) * 100);
		var dislikesa = Math.round((data[i].dislikes / (data[i].likes + data[i].dislikes)) * 100);
		if((likesa + dislikesa) > 100)
			dislikesa--;
		
		var elem = $("#masterVideoListRow").clone().appendTo("#popup_videoList");
		elem.removeAttr("id");
		elem.css("display", "");
		elem.children("a").attr("href", "https://www.youtube.com/watch?v=" + data[i].id);
		elem.children("a").attr("title", data[i].title);
		elem.find("a .videoListColumn:nth-child(1) .videoList_img").attr("src", data[i].thumbnail);
		elem.find("a .videoListColumn:nth-child(2) .videoList_title").text(data[i].title);
		elem.find("a .videoListColumn:nth-child(2) .videoList_sub").text(date);
		elem.find("a .videoListColumn:nth-child(3) .videoList_title").text(addCommas(data[i].views) + " views | " + likesa + "% likes | " + dislikesa + "% dislikes");
		elem.find("a .videoListColumn:nth-child(3) .videoList_sub").text(data[i].duration);
	}
}

/**
 *  Returns the time difference from today
 *  
 *  @param {number} date A UNIX timestamp
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

/**
 *  Add commas to numbers > 3
 *  Ex: 1234567 -> 1,234,567
 *  
 *  @param {number} num The number to add commas to
 *  @returns {string} Number inputted with commas
 */
function addCommas(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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