var wyn = {};
$(document).ready(function(){
	var logger = window.console.log;
	//window.console.log = function(){};
	
	var manifest = chrome.runtime.getManifest();
	var ns = new Audio("sound/notification.mp3");
	
	chrome.notifications.onClicked.addListener(ntClicked);
	chrome.notifications.onButtonClicked.addListener(ntBClicked);
	chrome.notifications.onClosed.addListener(ntCClicked);
	
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		if (request.browsing == "setSettings")
			sendResponse(setSettings());
		if (request.browsing == "removeSettings")
			sendResponse(removeSettings(request.setting));
		if (request.browsing == "updateSettings")
			sendResponse(updateSettings(request.setting, request.var1));
		if (request.browsing == "checkAllYoutube")
			sendResponse(checkAllYoutubeUsers(0));
		if (request.browsing == "checkYoutube")
			sendResponse(checkYoutube(request.var1));
		if (request.browsing == "editChannels")
			sendResponse(editChannels(request.setting));
		if (request.browsing == "editSettings2")
			sendResponse(editSettings2(request.name, request.setting, false));
	});

	var temp = [];
	
	var settings = {
		"cName": "Main",
		"refreshInterval": 2,
		"animations": true,
		"tts": false
	};
	
	if(localStorage.getItem("channels") == null)
		localStorage.setItem("channels", JSON.stringify(temp));
	if(localStorage.getItem("ytImg") == null)
		localStorage.setItem("ytImg", JSON.stringify(temp));
	if(localStorage.getItem("ytReleases") == null)
		localStorage.setItem("ytReleases", JSON.stringify(temp));
	if(localStorage.getItem("ytLinks") == null)
		localStorage.setItem("ytLinks", JSON.stringify(temp));
	if(localStorage.getItem("ytLogos") == null)
		localStorage.setItem("ytLogos", JSON.stringify(temp));
	if(localStorage.getItem("ytNames") == null)
		localStorage.setItem("ytNames", JSON.stringify(temp));
	if(localStorage.getItem("ytViews") == null)
		localStorage.setItem("ytViews", JSON.stringify(temp));
	if(localStorage.getItem("ytChannelUrls") == null)
		localStorage.setItem("ytChannelUrls", JSON.stringify(temp));
	if(localStorage.getItem("ytTitles") == null)
		localStorage.setItem("ytTitles", JSON.stringify(temp));
	if(localStorage.getItem("ytStatus") == null)
		localStorage.setItem("ytStatus", JSON.stringify(temp));
	if(localStorage.getItem("serverStatus") == null)
		localStorage.setItem("serverStatus", true);
	if(localStorage.getItem("badgeCount") == null)
		localStorage.setItem("badgeCount", 0);
	if(localStorage.getItem("settings") == null)
		localStorage.setItem("settings", JSON.stringify(settings));
	
	var settingsa = JSON.parse(localStorage.getItem("settings"));
	
	if(settingsa["cName"] == null)
		setVariable("settings", "cName", "Main", false);
	if(settingsa["refreshInterval"] == null)
		setVariable("settings", "refreshInterval", 2, false);
	if(settingsa["animations"] == null)
		setVariable("settings", "animations", true, false);
	if(settingsa["tts"] == null)
		setVariable("settings", "tts", false, false);
	if(settingsa["ttsVoice"] == null)
		setVariable("settings", "ttsVoice", 0, false);
	
	function setSettings(){
		return({
			badgeCount : localStorage.getItem("badgeCount"),
			channels : localStorage.getItem("channels"),
			ytImg : localStorage.getItem("ytImg"),
			ytReleases : localStorage.getItem("ytReleases"),
			ytLinks : localStorage.getItem("ytLinks"),
			ytLogos : localStorage.getItem("ytLogos"),
			ytNames : localStorage.getItem("ytNames"),
			ytViews : localStorage.getItem("ytViews"),
			ytChannelUrls : localStorage.getItem("ytChannelUrls"),
			ytTitles : localStorage.getItem("ytTitles"),
			ytStatus : localStorage.getItem("ytStatus"),
			serverStatus : localStorage.getItem("serverStatus"),
			settings : localStorage.getItem("settings"),
			version : manifest.version
		});
	}

	function refresh(){
		wyn.log(0, "Initializing YouTube channel check");
		checkAllYoutubeUsers(0);
		wyn.log(0, "Ended YouTube channel check");
		//MS*S*M
		var rI = JSON.parse(localStorage.getItem("settings"));
		setTimeout(function(){refresh();},1000*60*rI["refreshInterval"]);
	}

	function checkAllYoutubeUsers(check){
		var ytCheck = "https://gdata.youtube.com/feeds/";
		var ytStatus = false;
		
		if(JSON.parse(localStorage.getItem("channels")).length >= 30 && JSON.parse(localStorage.getItem("settings"))["refreshInterval"] < 5)
			setVariable("settings", "refreshInterval", 5, false);
		
		$.ajax({
			async: false,
			type: "POST",
			dataType: "text",
			url: ytCheck,
			success: function(data) {
				ytStatus = true;
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				if(XMLHttpRequest.status == 400)
					ytStatus = true;
				else
					ytStatus = false;
			}
		});
		if(!ytStatus){
			wyn.log(1, "Could not connect to YouTube API Servers");
			localStorage.setItem("serverStatus", false);
			if(check == 1){
				chrome.extension.sendMessage({browsing: "refreshPage"}, function(callback){});
			}
			return;
		}else{
			wyn.log(0, "Connection success");
			localStorage.setItem("serverStatus", true);
			var channelsa = JSON.parse(localStorage.getItem("channels"));
			for(var i = 0; i < Object.keys(channelsa).length; i++){
				if(channelsa[i] != null)
					checkYoutube(i, channelsa[i]);
			}
			if(check == 1){
				chrome.extension.sendMessage({browsing: "refreshPage"}, function(callback){});
			}
		}
	}
	
	function addCommas(num) {
		var str = num.toString().split('.');
		if (str[0].length >= 5) {
			str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1,');
		}
		if (str[1] && str[1].length >= 5) {
			str[1] = str[1].replace(/(\d{3})/g, '$1 ');
		}
		return str.join('.');
	}
	
	function checkYoutube(cnum, cname){
		if (typeof cname === 'undefined') {
			var channelsa = JSON.parse(localStorage.getItem("channels"));
			cname = channelsa[cnum];
		}
		
		if(cname.indexOf(".com/") > -1){
			if(cname.split(".com/")[1].split("/").length < 1){
				setVariable("ytStatus", cnum, false);
				wyn.log(1, "Channel: \"" + cname + "\" does not exist or connection cannot be made");
				return;
			}else{
				cname = cname.split(".com/")[1];
				if(cname.indexOf("channel/") > -1)
					cname = cname.split("channel/")[1].split("/")[0];
				else if(cname.indexOf("user/") > -1)
					cname = cname.split("user/")[1].split("/")[0];
				setVariable("channels", cnum, cname);
			}
		}
		
		var channel = "https://gdata.youtube.com/feeds/api/users/" + cname + "?v=2&alt=json";
		var channel2 = "https://gdata.youtube.com/feeds/api/users/" + cname + "/uploads?v=2&alt=json";

		String.prototype.trunc = String.prototype.trunc ||
			function(n){
				return this.length>n ? this.substr(0,n-1)+'...' : this;
			};

		String.prototype.toHHMMSS = function () {
			var sec_num = parseInt(this, 10);
			var hours = Math.floor(sec_num / 3600);
			var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
			var seconds = sec_num - (hours * 3600) - (minutes * 60);
			if (hours < 10) {hours = "0"+hours;}
			if (minutes < 10) {minutes = "0"+minutes;}
			if (seconds < 10) {seconds = "0"+seconds;}
			if (hours == 0){
				var time = minutes+':'+seconds;
			}else{
				var time = hours+':'+minutes+':'+seconds;
			}
			return time;
		}
		
		var channelStatus;
		
		$.ajax({
			async: false,
			type: "GET",
			dataType: "text",
			url: channel,
			success: function(data){
				data = JSON.parse(data);
				var lurl = data.entry.media$thumbnail.url;
				var curl = data.entry.link[0].href
				setVariable("ytLogos", cnum, lurl);
				setVariable("ytChannelUrls", cnum, curl);
				channelStatus = true;
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				channelStatus = false;
			}
		});
		
		if(!channelStatus){
			if(JSON.parse(localStorage.getItem("ytReleases"))[cnum] > 0)
				setVariable("ytStatus", cnum, false);
			wyn.log(1, "Channel: \"" + cname + "\" does not exist or connection cannot be made");
			return;
		}else
			setVariable("ytStatus", cnum, true);
		
		$.ajax({
			async: false,
			type: "GET",
			url: channel2,
			success: function(data) {
				var video = ({
					url: 			data.feed.entry[0].media$group.media$player.url,
					description: 	data.feed.entry[0].media$group.media$description.$t.substring(0,100).replace(/(\r\n|\n|\r)/gm," "),
					timestamp: 		new Date(Date.parse(data.feed.entry[0].published.$t)).getTime(),
					title: 			data.feed.entry[0].title.$t,
					image: 			data.feed.entry[0].media$group.media$thumbnail[2].url.replace("https://", "http://"),
					name: 			data.feed.entry[0].author[0].name.$t,
					views: 			data.feed.entry[0].yt$statistics.viewCount,
					seconds: 		data.feed.entry[0].media$group.yt$duration.seconds,
					likes: 			data.feed.entry[0].yt$rating.numLikes,
					dislikes: 		data.feed.entry[0].yt$rating.numDislikes
				});

				var ytReleasea = JSON.parse(localStorage.getItem("ytReleases"));
				
				setVariable("ytNames", cnum, video.name);
				setVariable("ytImg", cnum, video.image);
				setVariable("ytReleases", cnum, video.timestamp);
				setVariable("ytLinks", cnum, video.url);
				setVariable("ytViews", cnum, video.views);
				setVariable("ytTitles", cnum, video.title);
				
				wyn.log(0, "Checking YouTube User: " + video.name);
				
				if(video.timestamp > ytReleasea[cnum]) {					
					if(video.views == "301")
						video.views = "301+";
					video.likes = parseInt(video.likes);
					video.dislikes = parseInt(video.dislikes);
					var likesa = Math.round((video.likes / (video.likes + video.dislikes)) * 100);
					var dislikesa = Math.round((video.dislikes / (video.likes + video.dislikes)) * 100);
					if((likesa + dislikesa) > 100)
						dislikesa--;
					
					var options = {
						type: "image",
						priority: 0,
						title: video.title + " by " + video.name,
						message: video.description,
						imageUrl: video.image,
						iconUrl: "img/icon_yt.png",
						contextMessage: video.seconds.toHHMMSS() + " | "+ addCommas(video.views) + " views | " + likesa + "% likes | " + dislikesa + "% dislikes",
						buttons: [{
							title: "Watch Video",
							iconUrl: "img/icon_play2.png"
						}, {
							title: "Close"
						}]
					};
 					var ntID = rndStr(10) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + rndStr(5) + "-" + cnum;
 					notify(ntID, options);
					wyn.log(0, "Found new YouTube video for " + video.name, "green");
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				wyn.log(2, textStatus + " ; " + errorThrown.message);
			}
		});
	}

	function notify(ntID, options){
		chrome.notifications.create(ntID, options, function(){
			var bc = localStorage.getItem("badgeCount");
			localStorage.setItem("badgeCount", ++bc);
			bc = localStorage.getItem("badgeCount");
			updateBadge({colour:'#e12a27', text:"" + bc});
			
			ns.volume = 0.6;
			ns.play();
			if(JSON.parse(localStorage.getItem("settings"))["tts"]){
				var voice = JSON.parse(localStorage.getItem("settings"))["ttsVoice"];
				var message = new SpeechSynthesisUtterance();
				message.voice = speechSynthesis.getVoices()[voice];
				var sList =  ["\\bEp\\b", "\\b\Ep.\b", "\\bPt\\b", "\\bPt.\\b"];
				var sList2 = ["Episode", "Episode", "Part", "Part"];
				for(var i = 0; i > sList.length; i++)
					options.title.replace(new RegExp(sList[i], "g"), sList2[i]);
				options.title = options.title
				message.text = options.title;
				speechSynthesis.speak(message);
			}
		});
	}

	function ntClicked(ntID){
		var ytLinka = JSON.parse(localStorage.getItem("ytLinks"));
		createTab(ytLinka[ntID.split("-")[4]]);
		var bc = localStorage.getItem("badgeCount");
		if(bc > 1){
			bc--;
			localStorage.setItem("badgeCou3nt", bc);
			bc = localStorage.getItem("badgeCount");
			updateBadge({colour:'#e12a27', text:"" + bc});
		}else{
			localStorage.setItem("badgeCount", 0);
			updateBadge({colour:'#e12a27', text:""});
		}
		wyn.log(0, "User clicked on notification; NTID: " + ntID);
		wyn.log(0, "Sending user to " + ytLinka[ntID.split("-")[4]]);
		chrome.notifications.clear(ntID);
	}
	
	function ntBClicked(ntID, btnID){
		if(btnID == 0){
			var ytLinka = JSON.parse(localStorage.getItem("ytLinks"));
			createTab(ytLinka[ntID.split("-")[4]]);
			remBadge();
			wyn.log(0, "User clicked on \"Watch Video\" button; NTID: " + ntID);
			wyn.log(0, "Sending user to " + ytLinka[ntID.split("-")[4]]);
		}else if (btnID == 1){
			remBadge();
			wyn.log(0, "User clicked on \"Close\" button; NTID: " + ntID);
		}
	}
	
	function ntCClicked(ntID, byUsr){
		if(byUsr){
			remBadge();
			wyn.log(0, "User clicked on \"X\" button; NTID: " + ntID);
		}else{}
	}

	function updateSettings(setting, var1){
		var state;
		setVariable("channels", setting, var1);
		setVariable("ytReleases", setting, "0");
		
		chrome.extension.sendMessage({browsing: "refreshPage"});
		
		state = "Variable channels has changed.";
		return({response: state});
	}
	
	function editSettings2(name, setting, refresh){
		if (typeof refresh === 'undefined') { refresh = true; }
		var state;
		setVariable("settings", name, setting, false);
		state = "Variable " + settings + " has changed.";
		if(refresh)
			chrome.extension.sendMessage({browsing: "refreshPage"});
		return({response: state});
	}
	
	function editChannels(name){
		var state;
		name = JSON.parse(name);
		var cName = name[name.length-2];
		name[name.length-1] = null
		name[name.length-2] = null;
		name.clean();
		name = JSON.stringify(name);
		localStorage.setItem("channels", name);
		state = "Variable channels has changed.";
		setVariable("settings", "cName", cName, false);
		state = "Variable settings has changed.";
		checkAllYoutubeUsers(1);
		return({response: state});
	}
	
	Array.prototype.clean = function(deleteValue) {
		for (var i = 0; i < this.length; i++) {
			if (this[i] == deleteValue) {
			this.splice(i, 1);
			i--;
			}
		}
		return this;
	};
	
	function removeSettings(setting){
		var state;
		
		setVariable("channels", setting, null);
		setVariable("ytLogos", setting, null);
		setVariable("ytNames", setting, null);
		setVariable("ytImg", setting, null);
		setVariable("ytReleases", setting, null);
		setVariable("ytLinks", setting, null);
		setVariable("ytViews", setting, null);
		setVariable("ytChannelUrls", setting, null);
		setVariable("ytTitles", setting, null);
		
		chrome.extension.sendMessage({browsing: "refreshPage"});
		
		state = "Variable channels has changed.";
		return({response: state});
	}
	
	function setVariable(item, num, var1, clean){
		if (typeof clean === 'undefined')
			clean = true;
		var a = JSON.parse(localStorage.getItem(item));
		a[num] = var1;
		if(clean) {
			a.clean();
		}
		localStorage.setItem(item, JSON.stringify(a));
	}
	
	wyn.changeVariable = function(settings, cnum, cont){
		if(localStorage.getItem(settings)){
			var yt = JSON.parse(localStorage.getItem(settings));
			yt[cnum] = cont;
			localStorage.setItem(settings, JSON.stringify(yt));
			return("Changed variable: \"" + settings + "\" for User #" + cnum + " to: \"" + cont + "\".");
		}else{
			return("Usage: changeVariable(setting, user#, content);.");
		}
	}
	
	wyn.log = function(type, var1, var2){
		var date = new Date();
		var hour, minute, info, color;
		if(date.getHours().toString().length == 1){
			hour = "0" + date.getHours();
		}else{
			hour = date.getHours();
		}
		if(date.getMinutes().toString().length == 1){
			minute = "0" + date.getMinutes();
		}else{
			minute = date.getMinutes();
		}
		var prefix = hour + ":" + minute + " ";
		if(type == 0){
			info = "[INFO]";
		}else if(type == 1){
			info = "[WARNING]";
			color = "#FF8F00";
		}else if(type == 2){
			info = "[ERROR]";
			color = "#FF0000";
		}else{
			info = color = "";
		}
		if(var2){
			color = var2;
		}
		if(type == 0){
			console.log("%c" + prefix + info + " " + var1, "color: " + color + ";");
		}else if(type == 1){
			console.warn("%c" + prefix + info + " " + var1, "color: " + color + ";");
		}else if(type == 2){
			console.error(prefix + info + " " + var1);
		}
	}
	
	function updateBadge(options) {
		var t = options.text,
			c = options.color||options.colour;
		if(t !== undefined)
			chrome.browserAction.setBadgeText({text: (t||'')});
		if(c !== undefined)
			chrome.browserAction.setBadgeBackgroundColor({color: c});
	}
	
	function remBadge() {
		var bc = localStorage.getItem("badgeCount");
		if(bc > 1){
			bc--;
			localStorage.setItem("badgeCount", bc);
			bc = localStorage.getItem("badgeCount");
			updateBadge({colour:'#e12a27', text:"" + bc});
		}else{
			localStorage.setItem("badgeCount", 0);
			updateBadge({colour:'#e12a27', text:""});
		}
	}
	
	function rndStr(len){
		var text = "";
		var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		for(var i = 0; i < len; i++)
			text += charset.charAt(Math.floor(Math.random() * charset.length));
		return text;
	}
	
	function createTab(urL) {
		var numTabs = 0;
		chrome.windows.getAll(function(data){
			numTabs = data.length;
			if(numTabs > 0)
				chrome.tabs.create({url: urL});
			else
				chrome.windows.create({url: urL});
		});
	}
	refresh();
});
