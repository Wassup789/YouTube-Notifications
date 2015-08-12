var wyn = {};
	wyn.version = chrome.runtime.getManifest().version,
	wyn.notificationSound = new Audio("sound/notification.mp3"),
	wyn.isConnected = false,
	wyn.isTimedout = false,
	wyn.batchChecking = false,
	wyn.activeCheckings = [],
	wyn.strings = {
		"notification_watch": "Watch Video",
		"notification_close": "Dismiss",
		"notification_log_check": "Checking YouTube User: ",
		"notification_log_new": "Found new YouTube video for: ",
		"snackbar_nonewvideos": "No new videos found",
		"connect_success": "Connected to YouTube's Servers",
		"connect_failed": "Could not connect to YouTube's Servers",
		"log_color_prefix": "%c",
		"log_color_green": "font-weight: bold; color: #2E7D32",
		"log_color_red": "font-weight: bold; color: #B71C1C"
	}

if(localStorage.getItem("channels") == null)
	localStorage.setItem("channels", JSON.stringify([]));
if(localStorage.getItem("settings") == null)
	localStorage.setItem("settings", JSON.stringify({
		notifications: {
			enabled: true,
			volume: 100
		},
		tts: {
			enabled: false,
			type: 1
		}
	}));

chrome.notifications.onClicked.addListener(onNotificationClick);
chrome.notifications.onButtonClicked.addListener(onNotificationButtonClick);
chrome.notifications.onClosed.addListener(onNotificationClosed);

$(function(){
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		switch (request.type) {
			case "checkYoutubeBatch":
				sendResponse(checkYoutubeBatch(request.refresh));
				break;
			case "checkYoutube":
				sendResponse(checkYoutube(request.name));
				break;
			case "setYoutube":
				sendResponse(setYoutube(request.name, request.refresh));
				break;
			case "testNotify":
				sendResponse(wyn.testNotify());
				break;
		}
	});
	
	checkYoutubeStatus();
});

function checkYoutubeStatus(){
	var url = "https://data.wassup789.ml/youtubenotifications/testserver.php";
	$.ajax({
		type: "GET",
		dataType: "json",
		url: url,
		success: function(data) {
			if(data.status == "success" && !wyn.isConnected){
				wyn.isConnected = true;
				chrome.extension.sendMessage({type: "createSnackbar", message: wyn.strings.connect_success});
				console.log(wyn.strings.log_color_prefix + wyn.strings.connect_success, wyn.strings.log_color_green);
				checkYoutubeBatch(true);
				setInterval(function(){
					checkYoutubeBatch(true);
				}, 1000*60*10);
			}else{
				wyn.isConnected = false;
				chrome.extension.sendMessage({type: "createSnackbar", message: wyn.strings.connect_failed});
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

function setYoutube(name, refresh){
	refresh = refresh || false;
	
	var url = "https://data.wassup789.ml/youtubenotifications/getchannel.php?query=" + encodeURIComponent(name);
	$.ajax({
		type: "GET",
		dataType: "json",
		url: url,
		success: function(data) {
			if(data.status == "success") {
				var output = {
					"id": 				data.data.id,
					"name":				data.data.name,
					"thumbnail":		data.data.thumbnail,
					"viewCount":		data.data.viewCount,
					"subscriberCount":	data.data.subscriberCount,
					"latestVideo":	{
						"id": 			"",
						"title":		"",
						"description":	"",
						"timestamp":	"",
						"thumbnail":	"",
						"views":		"",
						"duration":		"",
						"likes":		"",
						"dislikes":		""
					}
				};
				var arr = JSON.parse(localStorage.getItem("channels"));
				arr.push(output);
				localStorage.setItem("channels", JSON.stringify(arr));
				checkYoutube(arr.length-1, refresh);
			}
		}
	});
	
}

function checkYoutube(num, refresh) {
	refresh = refresh || false;
	wyn.activeCheckings[num] = true;
	
	var channels = JSON.parse(localStorage.getItem("channels"));
	var url = "https://data.wassup789.ml/youtubenotifications/getlist.php?query=" + encodeURIComponent(btoa(JSON.stringify([{id: channels[num].id}])));
	
	$.ajax({
		type: "GET",
		dataType: "json",
		url: url,
		success: function(data) {
			if(data.status == "success"){
				channels = JSON.parse(localStorage.getItem("channels"));
				data.data = data.data[0];
				
				console.log(wyn.strings.notification_log_check + channels[num].name);
				var prevVideoId = channels[i].latestVideo.id;
				channels[num].latestVideo.id = data.data.videoId;
				channels[num].latestVideo.title = data.data.title;
				channels[num].latestVideo.description = data.data.description.substring(0,100).replace(/(\r\n|\n|\r)/gm," ");
				channels[num].latestVideo.timestamp = data.data.timestamp;
				channels[num].latestVideo.thumbnail = data.data.thumbnail.replace("https:/", "http://");
				channels[num].latestVideo.views = data.data.views;
				channels[num].latestVideo.duration = data.data.duration;
				channels[num].latestVideo.likes = data.data.likes;
				channels[num].latestVideo.dislikes = data.data.dislikes;
				localStorage.setItem("channels", JSON.stringify(channels));
				var info = channels[num];
				
				if(prevVideoId != info.latestVideo.id) {
						if(info.latestVideo.views == "301")
							info.latestVideo.views = "301+";
						info.latestVideo.likes = parseInt(info.latestVideo.likes);
						info.latestVideo.dislikes = parseInt(info.latestVideo.dislikes);
						var likesa = Math.round((info.latestVideo.likes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
						var dislikesa = Math.round((info.latestVideo.dislikes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
						if((likesa + dislikesa) > 100)
							dislikesa--;
						
						var options = {
							type: "image",
							priority: 0,
							title: info.latestVideo.title + " by " + info.name,
							message: info.latestVideo.description,
							imageUrl: info.latestVideo.thumbnail,
							iconUrl: "img/icon_yt.png",
							contextMessage: info.latestVideo.duration + " | "+ addCommas(info.latestVideo.views) + " views | " + likesa + "% likes | " + dislikesa + "% dislikes",
							buttons: [{
								title: wyn.strings.notification_watch,
								iconUrl: "img/ic_play.png"
							}, {
								title: wyn.strings.notification_close,
								iconUrl: "img/ic_close.png"
							}]
						};
						var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + num;
						console.log(wyn.strings.log_color_prefix + wyn.strings.notification_log_new + info.name, wyn.strings.log_color_green);
						notify(ntID, options);
				}
				wyn.activeCheckings[num] = false;
				for(var i = 0; i < wyn.activeCheckings.length; i++)
					if(wyn.activeCheckings[i])
						return;
				if(refresh)
					chrome.extension.sendMessage({type: "refreshPage"});
			}
		}
	});
}

function checkYoutubeBatch(refresh){
	refresh = refresh || false;
	
	if(wyn.batchChecking)
		return;
	wyn.batchChecking = true;
	
	console.log("Initializing YouTube channel check");
	var channels = JSON.parse(localStorage.getItem("channels")),
		arr = [];
	for(var i = 0; i < channels.length; i++) 
		arr[i] = {id: channels[i].id};
	
	var url = "https://data.wassup789.ml/youtubenotifications/getlist.php?query=" + encodeURIComponent(btoa(JSON.stringify(arr))),
		hasChanged = false;
	
	$.ajax({
		type: "GET",
		dataType: "json",
		url: url,
		success: function(data) {
			if(data.status == "success"){
				for(var i = 0; i < data.data.length; i++){
					channels = JSON.parse(localStorage.getItem("channels"));
					if(!channels[i])
						return;
					console.log(wyn.strings.notification_log_check + channels[i].name);
					var vData = data.data[i];
					var prevVideoId = channels[i].latestVideo.id;
					channels[i].latestVideo.id = vData.videoId;
					channels[i].latestVideo.title = vData.title;
					channels[i].latestVideo.description = vData.description.substring(0,100).replace(/(\r\n|\n|\r)/gm," ");
					channels[i].latestVideo.timestamp = vData.timestamp;
					channels[i].latestVideo.thumbnail = vData.thumbnail.replace("https:/", "http://");
					channels[i].latestVideo.views = vData.views;
					channels[i].latestVideo.duration = vData.duration;
					channels[i].latestVideo.likes = vData.likes;
					channels[i].latestVideo.dislikes = vData.dislikes;
					localStorage.setItem("channels", JSON.stringify(channels));
					var info = channels[i];
					
					if(prevVideoId != info.latestVideo.id) {
							hasChanged = true;
							if(info.latestVideo.views == "301")
								info.latestVideo.views = "301+";
							info.latestVideo.likes = parseInt(info.latestVideo.likes);
							info.latestVideo.dislikes = parseInt(info.latestVideo.dislikes);
							var likesa = Math.round((info.latestVideo.likes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
							var dislikesa = Math.round((info.latestVideo.dislikes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
							if((likesa + dislikesa) > 100)
								dislikesa--;
							
							var options = {
								type: "image",
								priority: 0,
								title: info.latestVideo.title + " by " + info.name,
								message: info.latestVideo.description,
								imageUrl: info.latestVideo.thumbnail,
								iconUrl: "img/icon_yt.png",
								contextMessage: info.latestVideo.duration + " | "+ addCommas(info.latestVideo.views) + " views | " + likesa + "% likes | " + dislikesa + "% dislikes",
								buttons: [{
									title: wyn.strings.notification_watch,
									iconUrl: "img/ic_play.png"
								}, {
									title: wyn.strings.notification_close,
									iconUrl: "img/ic_close.png"
								}]
							};
							var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + i;
							console.log(wyn.strings.log_color_prefix + wyn.strings.notification_log_new + info.name, wyn.strings.log_color_green);
							notify(ntID, options);
					}
					if(i == data.data.length-1){
						wyn.batchChecking = false;
						console.log("End of YouTube channel check");
						if(hasChanged){
							if(refresh)
								chrome.extension.sendMessage({type: "refreshPage"});
						}else
							chrome.extension.sendMessage({type: "createSnackbar", message: wyn.strings.snackbar_nonewvideos});
					}
				}
			}
		}
	});
}

function addCommas(num) {
	var str = num.toString().split('.');
	if (str[0].length >= 5)
		str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
	if (str[1] && str[1].length >= 5) 
		str[1] = str[1].replace(/(\d{3})/g, '$1 ');
	return str.join('.');
}
function rndStr(len){
	var text = "";
	var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	for(var i = 0; i < len; i++)
		text += charset.charAt(Math.floor(Math.random() * charset.length));
	return text;
}

function notify(ntID, options){
	chrome.notifications.create(ntID, options, function(){
		/*var bc = localStorage.getItem("badgeCount");
		localStorage.setItem("badgeCount", ++bc);
		bc = localStorage.getItem("badgeCount");
		updateBadge({colour:'#e12a27', text:"" + bc});*/
		
		wyn.notificationSound.volume = parseInt(JSON.parse(localStorage.getItem("settings"))["notifications"]["volume"])/100;
		wyn.notificationSound.play()
		notifyTTS(options);
	});
}

function onNotificationClick(ntID){
	if(typeof ntID.split("-")[4] !== "undefined") {
		var channels = JSON.parse(localStorage.getItem("channels"));
		createTab("https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
		console.log("User clicked on notification; NTID: " + ntID);
		console.log("Sending user to https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
		chrome.notifications.clear(ntID);
	}
}

function onNotificationButtonClick(ntID, btnID){
	if(typeof ntID.split("-")[4] !== "undefined") {
		if(btnID == 0){
			var channels = JSON.parse(localStorage.getItem("channels"));
			createTab("https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
			console.log("User clicked on \"" + wyn.strings.notification_watch + "\" button; NTID: " + ntID);
			console.log("Sending user to https://www.youtube.com/watch?v=" + channels[ntID.split("-")[4]].latestVideo.id);
		}else if(btnID == 1){
			console.log("User clicked on \"" + wyn.strings.notification_close + "\" button; NTID: " + ntID);
		}
	}
}

function onNotificationClosed(ntID, byUser){
	if(typeof ntID.split("-")[4] !== "undefined" && byUser)
		console.log("User clicked on \"X\" button; NTID: " + ntID);
}

function createTab(url) {
	var numTabs = 0;
	chrome.windows.getAll(function(data){
		numTabs = data.length;
		if(numTabs > 0)
			chrome.tabs.create({url: url});
		else
			chrome.windows.create({url: url});
	});
}

wyn.testNotify = function(){
	var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5);
	var options = {
		type: "image",
		priority: 0,
		title: "Video by Youtube Creator",
		message: "Insert Description Here",
		imageUrl: "img/null.gif",
		iconUrl: "img/icon_yt.png",
		contextMessage: "12:34 | 5,678 views | 90% likes | 10% dislikes",
		buttons: [{
			title: wyn.strings.notification_watch,
			iconUrl: "img/ic_play.png"
		}, {
			title: wyn.strings.notification_close,
			iconUrl: "img/ic_close.png"
		}]
	};
	
	notify(ntID, options);
}

function notifyTTS(options) {
	if(JSON.parse(localStorage.getItem("settings")).tts.enabled){
		var voice = JSON.parse(localStorage.getItem("settings")).tts.type;
		var message = new SpeechSynthesisUtterance();
		message.voice = speechSynthesis.getVoices()[voice];
		var sList =  ["\\bEp\\b", "\\bEp.\\b", "\\bPt\\b", "\\bPt.\\b"];
		var sList2 = ["Episode", "Episode", "Part", "Part"];
		for(var i = 0; i < sList.length; i++)
			options.title = options.title.replace(new RegExp(sList[i], "g"), sList2[i]);
		message.text = options.title;
		speechSynthesis.speak(message);
	}
}

wyn.forceNotification = function(id) {
	var info = JSON.parse(localStorage.getItem("channels"))[id];
	if(info.latestVideo.views == "301")
		info.latestVideo.views = "301+";
	info.latestVideo.likes = parseInt(info.latestVideo.likes);
	info.latestVideo.dislikes = parseInt(info.latestVideo.dislikes);
	var likesa = Math.round((info.latestVideo.likes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
	var dislikesa = Math.round((info.latestVideo.dislikes / (info.latestVideo.likes + info.latestVideo.dislikes)) * 100);
	if((likesa + dislikesa) > 100)
		dislikesa--;
	
	var options = {
		type: "image",
		priority: 0,
		title: info.latestVideo.title + " by " + info.name,
		message: info.latestVideo.description,
		imageUrl: info.latestVideo.thumbnail,
		iconUrl: "img/icon_yt.png",
		contextMessage: info.latestVideo.duration + " | "+ addCommas(info.latestVideo.views) + " views | " + likesa + "% likes | " + dislikesa + "% dislikes",
		buttons: [{
			title: wyn.strings.notification_watch,
			iconUrl: "img/icon_play2.png"
		}, {
			title: wyn.strings.notification_close
		}]
	};
	var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + id;
	console.log(wyn.strings.log_color_prefix + wyn.strings.notification_log_new + info.name, wyn.strings.log_color_green);
	notify(ntID, options);
}