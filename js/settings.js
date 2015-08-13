$(function(){
	if(!chrome.extension.getBackgroundPage().wyn.isConnected)
		createSnackbar("Could not connect to YouTube's Servers");
	
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
		elem.children(".channelColumn:nth-child(1)").children(".channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
		elem.children(".channelColumn:nth-child(2)").children(".channel_author").text(channels[i].name);
		elem.children(".channelColumn:nth-child(2)").children(".channel_author_info").text(addCommas(channels[i].subscriberCount) + " subscribers \u2022 " + addCommas(channels[i].viewCount) + " views");
		elem.children(".channelColumn:nth-child(2)").children(".channel_a").attr("href", "https://www.youtube.com/channel/" + channels[i].id);
		elem.children(".channelColumn:nth-child(2)").children(".channel_a").attr("title",  channels[i].name);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_img").attr("src", channels[i].latestVideo.thumbnail);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
		elem.children(".channelColumn:nth-child(4)").children(".channel_video_a").attr("href", "https://www.youtube.com/watch?v=" + channels[i].latestVideo.id);
		elem.children(".channelColumn:nth-child(3)").children(".channel_video_a").attr("title", channels[i].latestVideo.title);
		elem.children(".channelColumn:nth-child(4)").children(".channel_video_a").attr("title", channels[i].latestVideo.title);
		elem.children(".channelColumn:nth-child(4)").children(".channel_video_title").text(channels[i].latestVideo.title);
		elem.children(".channelColumn:nth-child(4)").children(".channel_video_time").text(date);
	}
}

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
			console.log("Removed YouTube Channel: " + name);
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
		var id = parseInt($(this).parent().children("#popup_card").children(".channelRow").attr("data-id"));
		displayPopupCard(id);
	});
	
	$("#settings_refresh").on("click", function(){
		chrome.extension.sendMessage({type: "checkYoutubeBatch", refresh: true});
		createSnackbar("Updating...");
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
			createSnackbar("Saved");
			
			$(this).attr("data-toggle", "false");
		}else{
			$(".channelRow:not(#masterChannelRow)").addClass("editable");
			sortable.option("disabled", false);
			disableButtons(true);
			
			$(this).attr("data-toggle", "true");
		}
	});
}

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

var popupId = -1, savedData = {};
function displayPopupCard(num){
	if(typeof $("#channels .channelRow:not(#masterChannelRow)")[num] !== "undefined"){
		if($("#popup_card").attr("data-toggle") != "true"){
			popupId = num;
			$("#popup_card").children(":not(#popup_videoList):not(#popup_loading)").remove();//Remove items from popup before
			$("#popup_card").children("#popup_videoList").children(":not(#masterVideoListRow)").remove();//Remove video list items from popup before
			$("#popup_card").prepend($("#channels .channelRow:not(#masterChannelRow)")[num].outerHTML);//Prepend clicked contents
			$("#popup_card").css("top", $("#channels .channelRow:not(#masterChannelRow)")[num].getBoundingClientRect().top - parseInt($($(".main_card")[0]).css("margin")));//Align popup with clicked card
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
				top: $("#channels .channelRow:not(#masterChannelRow)")[popupId].getBoundingClientRect().top - parseInt($($(".main_card")[0]).css("margin")),
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
				$("#popup_card .channel_info_btn").css("marginTop", "");//Reset info button
				$("#popup_card .channelColumn").not(":first").not(":last").show();//Re-add buttons
				$("#popup_card").attr("data-toggle", "false");
			}, 450);
			popupId = -1;
		}
	}
}

function getChannelVideos(){
	var id = parseInt($("#popup_card .channelRow").attr("data-id")),
		channelId = JSON.parse(localStorage.getItem("channels"))[id].id,
		url = "https://data.wassup789.ml/youtubenotifications/getvideos.php?query=" + channelId;
	if(typeof savedData[channelId] !== "undefined")
		setChannelVideos(savedData[channelId]);
	else{
		$("#popup_loading").delay(500).fadeIn("fast");//Fade in loading (will look strange without fades)
		$.ajax({
			type: "GET",
			dataType: "json",
			url: url,
			success: function(data) {
				if(data.status == "success" && popupId != -1) {
					data = data.data;
					setChannelVideos(data);
					savedData[channelId] = data;
					$("#popup_loading").fadeOut("slow");
					$("#popup_videoList").fadeIn("slow");
				}
			}
		});
	}
}
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
		elem.children("a").attr("href", "https://www.youtube.com/watch?v=" + data[i].videoId);
		elem.children("a").attr("title", data[i].title);
		elem.children("a").children(".videoListColumn:nth-child(1)").children(".videoList_img").attr("src", data[i].thumbnail);
		elem.children("a").children(".videoListColumn:nth-child(2)").children(".videoList_title").text(data[i].title);
		elem.children("a").children(".videoListColumn:nth-child(2)").children(".videoList_sub").text(date);
		elem.children("a").children(".videoListColumn:nth-child(3)").children(".videoList_title").text(addCommas(data[i].views) + " views | " + likesa + "% likes | " + dislikesa + "% dislikes");
		elem.children("a").children(".videoListColumn:nth-child(3)").children(".videoList_sub").text(data[i].duration);
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
function addCommas(num) {
	var str = num.toString().split('.');
	if (str[0].length >= 5)
		str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
	if (str[1] && str[1].length >= 5) 
		str[1] = str[1].replace(/(\d{3})/g, '$1 ');
	return str.join('.');
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