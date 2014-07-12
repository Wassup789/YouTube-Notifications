$(document).ready(function(){
	var logger = window["console"]["log"];
	//window["console"]["log"] = function(){};
	
	$('#content').css('height', $('#main').height());
	var manifest = chrome.runtime.getManifest();
	
	var animate = true;
	
	$("#loading").fadeOut(0);
	$("#overlay").fadeOut(0);
	if(window.location.search != ""){
		$(".nbtn2").addClass("nav-active");
		getSlide2();
	}else{
		$(".nbtn1").addClass("nav-active");
		getSlide1();
	}
	
	var beta = true;
	if(beta)
		$("#version").html("Version " + manifest.version + " beta<br/>by Wassup789");
	else
		$("#version").html("Version " + manifest.version + "<br/>by Wassup789");
	
	var bc = localStorage.getItem("badgeCount");
	localStorage.setItem("badgeCount", 0);
	updateBadge({colour:'#e12a27', text:""});
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		if (request.browsing == "refreshPage"){
			sendResponse(refreshPage());
		}
	});
	function getSlide1(){
		chrome.extension.sendMessage({browsing: "setSettings"},  function(callback) {
			console.log(callback);
			if(callback.serverStatus == "false"){
				setError("ERROR: Connection could not be made with YouTube API Servers. Refresh?", -1, true);
				$("#overlay").fadeIn("slow");
				chrome.extension.sendMessage({browsing: "checkAllYoutube"}, function(callback){
					console.log(callback);
				});
			}
			var channelsa = JSON.parse(callback.channels);
			var namesa = JSON.parse(callback.ytNames);
			var logosa = JSON.parse(callback.ytLogos);
			var channelurlsa = JSON.parse(callback.ytChannelUrls);
			var ytreleasea = JSON.parse(callback.ytReleases);
			var ytimga = JSON.parse(callback.ytImg);
			var yttitlesa = JSON.parse(callback.ytTitles);
			var ytlinksa = JSON.parse(callback.ytLinks);
			var ytStatusa = JSON.parse(callback.ytStatus);
			var settings = JSON.parse(callback.settings);
			var cNamea = settings["cName"];
			animate = settings["animations"];
			if(!animate){
				$("#sl1").addClass("noanimate");
				$("#sl2").addClass("noanimate");
				$("#content").addClass("noanimate");
				$(".nav-btn").addClass("noanimate");
			}
			var ii = 0;
			$(".channellist1").html("<h1><span class=\"cName\">" + cNamea + "</span>Channels<span class=\"ctotal\"></span></h1>");
			for(var i = 0; i < Object.keys(channelsa).length; i++){
				var channels = channelsa[i];
				if(channels != null){
					var ytCName = namesa[i];
					var ytCLogo = logosa[i];
					var ytCStatus = ytStatusa[i];
					var ytCURL = channelurlsa[i];
					var ytVReleaseT = ytreleasea[i];
					var ytVImg = ytimga[i];
					var ytVTitle = yttitlesa[i];
					var ytVLink = ytlinksa[i];
					var newVideo = "";
					//MS*S*M*H
					if(ytVReleaseT + 1000*60*60*1 > Date.now()){
						newVideo = "style=\"background-color: #54E954!important;\"";
					}
					var date = new Date(parseInt(ytVReleaseT));
					date = timeSince(date);
					if(date.indexOf("/") != -1){
						date = "on " + date;
					}else{
						date = date + " ago";
					}
					if(ytCStatus == false){
						$(".channellist1").append('\
				<li class="channeld" style="background-color: #b31217!important">\
					<div class="content">\
						<a class="curl" title="This channel does not exist">\
							<span class="utitle" style="color: #000;">' + channels + '</span>\
						</a>\
						<a title="This channel does not exist">\
							<span class="vtitle" style="margin-left: 235px!important;margin-top: 0;color: #FFF!important;">This channel does not exist</span>\
						</a>\
					</div>\
				</li>');
					}else{
						ytVTitle = ytVTitle.replace(/"/g, "&quot;");
						$(".channellist1").append('\
				<li class="channeld" ' + newVideo + '>\
					<div class="content">\
						<a class="curl" href="' + ytCURL + '" title="' + ytCName + '">\
							<img src="' + ytCLogo + '" width="50px" height="50px">\
							<span class="utitle">' + ytCName + '</span>\
						</a>\
						<a href="' + ytVLink + '" title="' + ytVTitle + '">\
							<img class="vimg" src="' + ytVImg + '">\
							<span class="vtitle">' + ytVTitle + '</span>\
							<span class="vpub">Published ' + date + '</span>\
						</a>\
					</div>\
				</li>');
					}
					ii++;
				}
			}
			$(".ctotal").html("Total: " + ii++);
			switchSlide(0);
		});
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
	function getSlide2(){
		chrome.extension.sendMessage({browsing: "setSettings"},  function(callback) {
			console.log(callback);
			var channelsa = JSON.parse(callback.channels);
			var namesa = JSON.parse(callback.ytNames);
			var logosa = JSON.parse(callback.ytLogos);
			var channelurlsa = JSON.parse(callback.ytChannelUrls);
			var ytStatusa = JSON.parse(callback.ytStatus);
			var settings = JSON.parse(callback.settings);
			var cNamea = settings["cName"];
			
			var refreshInterval = settings["refreshInterval"];
			var animations = settings["animations"];
			var tts = settings["tts"];
			var ttsVoice = settings["ttsVoice"];
			$(".rIntervInp").val(refreshInterval);
			$(".cNameinp").val(cNamea);
			$(".animateInp").prop("checked", animations);
			$(".ttsInp").prop("checked", tts);
			if($(".ttsInp").prop("checked"))
				$(".ttsSelect").show();
			else
				$(".ttsSelect").hide();
			$(".ttsSelect").val(ttsVoice);
			
			var channelsa2 = JSON.parse(JSON.stringify(channelsa));
			channelsa2[channelsa2.length] = cNamea;
			channelsa2[channelsa2.length+1] = callback.version;
			channelsa2 = channelsa2.clean();
			if(channelsa2.length > 2){
				$(".exportInp").val(JSON.stringify(channelsa2));
				$(".exportInp").on("click", function () {
					$(this).select();
				});
				$(".exportInp").on("input", function() { 
					$(".exportInp").val(JSON.stringify(channelsa2));
				});
			}
			
			var ii = 0;
			$(".channellist2").html("<h1>Editing <span class=\"cName\">" + cNamea + "</span>Channels<span class=\"ctotal\"></span></h1>");
			for(var i = 0; i < Object.keys(channelsa).length; i++){
				var channels = channelsa[i];
				if(channels != null){
					var names = namesa[i];
					var logos = logosa[i];
					var curls = channelurlsa[i];
					var ytCStatus = ytStatusa[i];
					if(ytCStatus == false){
						$(".channellist2").append('\
				<li class="channeld" style="background-color: #b31217!important">\
					<div class="content">\
						<a class="curl" title="This channel does not exist">\
							<img src="" style="background-color:#FFF" width="50px" height="50px">\
							<span class="utitle uts1">' + channels + '</span>\
						</a>\
						<input type="text" placeholder="Channel ID or URL" value="' + encodeHTML(channels) + '" class="uinput">\
						<button class="bbutton cnumber brad1" setting="' + i + '">\
							<span class="bbutton_n">Save</span>\
						</button>\
						<button class="rbutton cnumber2 brad2" setting="' + i + '">\
							<span class="bbutton_n">X</span>\
						</button>\
					</div>\
				</li>');
					}else{
						$(".channellist2").append('\
				<li class="channeld">\
					<div class="content">\
						<a class="curl" href="' + curls + '" title="' + names + '">\
							<img src="' + logos + '" width="50px" height="50px">\
							<span class="utitle uts1">' + names + '</span>\
						</a>\
						<input type="text" placeholder="Channel ID or URL" value="' + encodeHTML(channels) + '" class="uinput">\
						<button class="bbutton cnumber brad1" setting="' + i + '">\
							<span class="bbutton_n">Save</span>\
						</button>\
						<button class="rbutton cnumber2 brad2" setting="' + i + '">\
							<span class="bbutton_n">X</span>\
						</button>\
					</div>\
				</li>');
					}
					ii++;
				}
			}
			$(".ctotal").html("Total: " + ii++);
			if(!animate){
				$("input").each(function(i){
					$(this).addClass("noanimate");
				});
			}
			switchSlide(1);
		});
	}
	$(document).on("click", ".cnumber", function(){	
		sendSettings($(this));
	});
	
	$(document).on("click", ".cnumber2", function(){	
		remSettings($(this));
	});
		
	$(document).on("click", "a", function(){
		if($(this).attr("href") == "" || $(this).attr("href") == null){
		}else{
			chrome.tabs.create({url: $(this).attr("href")});
		}
	});
	
	var wait = 0;
	$(document).on("click", ".nbtn1", function(){
		if(wait == 0){
			$(".nbtn1").addClass("nav-active");
			$(".nbtn2").removeClass("nav-active");
			getSlide1();
			wait = 1;
			setTimeout(function(){wait = 0;},500);
		}
		setTimeout(function(){wait = 0;},500);
	});
	
	$(document).on("click", ".nbtn2", function(){
		if(wait == 0){
			$(".nbtn1").removeClass("nav-active");
			$(".nbtn2").addClass("nav-active");
			getSlide2();
			wait = 1;
			setTimeout(function(){wait = 0;},500);
		}
	});
	
	$(document).on("click", "#add_more", function(){
		var number;
		var channelsa = JSON.parse(localStorage.getItem("channels"));
		for(var i = 0;i < Object.keys(channelsa).length;i++){
			if(channelsa[i] == null){
				number = i;
			}
		}
		if(number == null){
			if($(".cnumber").length > 0){
				number = parseInt($(".cnumber").last().attr("setting")) + 1;
			}else{
				number = 0;
			}
		}
		$(".channellist2").append('\
				<li class="channeld newchann" style="display: none;">\
					<div class="content">\
						<span class="utitle">New Channel</span>\
						<input type="text" placeholder="Channel ID or URL" class="uinput">\
						<button class="bbutton cnumber cbtn nchanb" setting="' + number + '">\
							<span class="bbutton_n">Save</span>\
						</button>\
					</div>\
				</li>');
		if(animate){
			$(".addm").css("margin-top", "-60px");
			$(".addm").fadeOut();
			$(".newchann").fadeIn();;
		}else{
			$(".newchann").show();
			$(".addm").hide();
		}
	});
	
	var aLoadTime = 200;
	
	$(document).on("click", "#refresh_all", function(){
		addLoading();
		setTimeout(function(){
			chrome.extension.sendMessage({browsing: "checkAllYoutube"}, function(callback){
				console.log(callback);
			});
		}, aLoadTime);
		refreshPage();
	});

	$(document).on("keypress", ".uinput", function(e) {
		if(e.which == 13)
			sendSettings($(this).parent().children(".cnumber"));
	});
	
	function sendSettings(element){
		addLoading();
		setTimeout(function(){
			chrome.extension.sendMessage({browsing: "updateSettings", setting: parseInt(element.attr('setting')), var1: element.parent().children("input").val()}, function(callback){
				console.log(callback);
			});
			chrome.extension.sendMessage({browsing: "checkYoutube", var1: parseInt(element.attr('setting'))}, function(callback){
				console.log(callback);
			});
		}, 200);
	}
	
	function remSettings(element){
		addLoading();
		setTimeout(function(){
			chrome.extension.sendMessage({browsing: "removeSettings", setting: parseInt(element.attr('setting'))}, function(callback){
				console.log(callback);
			});
		}, aLoadTime);
	}
	
	$(document).on("click", ".rInterv", function(){	
		editInterv();
	});
	
	$(document).on("keypress", ".rIntervInp", function(e) {
		if(e.which == 13)
			editInterv();
	});
	
	function editInterv(){
		if(isInt($(".rIntervInp").val()) && $(".rIntervInp").val() != "" && parseInt($(".rIntervInp").val()) > 0){
			setTimeout(function(){
				chrome.extension.sendMessage({browsing: "editSettings2", name: "refreshInterval", setting: parseInt($(".rIntervInp").val())}, function(callback){
					console.log(callback);
				});
			}, aLoadTime);
			setSuccess("Saved!", 2000);
		}else
			setError("Invalid refresh interval.");
	}
	
	function isInt(value) {
		return !isNaN(value) && parseInt(Number(value)) == value;
	}
	
	$(document).on("click", ".importBtn", function(){	
		importChannel();
	});
	
	$(document).on("keypress", ".importInp", function(e) {
		if(e.which == 13)
			importChannel();
	});
	
	function importChannel(){
		var importI = $(".importInp").val();
		if(isJSON(importI)){
			addLoading();
			chrome.extension.sendMessage({browsing: "editChannels", setting: importI}, function(callback){
				console.log(callback);
			});
		}else
			setError("Invalid channel import text entered.");
	}
	
	function isJSON(str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}
	
	$(document).on("click", ".cNamebtn", function(){	
		editCname();
	});
	
	$(document).on("keypress", ".cNameinp", function(e) {
		if(e.which == 13)
			editCname();
	});
	
	function editCname(){
		if($(".cNameinp").val() != ""){
			chrome.extension.sendMessage({browsing: "editSettings2", name: "cName", setting: $(".cNameinp").val()}, function(callback){
				console.log(callback);
			});
			$(".cName").html($(".cNameinp").val());
			setSuccess("Saved!", 2000);
		}else
			setError("Invalid channels name.");
	}
	
	$(document).on("click", ".animateInp", function(){	
		editAnim();
	});
	
	function editAnim(){
		chrome.extension.sendMessage({browsing: "editSettings2", name: "animations", setting: $(".animateInp").prop("checked")}, function(callback){
			console.log(callback);
		});
		setSuccess("Saved!", 2000);
		setTimeout(function(){
			refreshPage();
		}, 200);
	}
	
	$(document).on("click", ".ttsInp", function(){	
		editTTS();
		if($(".ttsInp").prop("checked"))
			$(".ttsSelect").show();
		else
			$(".ttsSelect").hide();
	});
	
	function editTTS(){
		chrome.extension.sendMessage({browsing: "editSettings2", name: "tts", setting: $(".ttsInp").prop("checked")}, function(callback){
			console.log(callback);
		});
		setSuccess("Saved!", 2000);
	}

	$(document).on("change", ".ttsSelect", function(){	
		editTTSVoice();
	});
	
	function editTTSVoice(){
		chrome.extension.sendMessage({browsing: "editSettings2", name: "ttsVoice", setting: parseInt($(".ttsSelect").val())}, function(callback){
			console.log(callback);
		});
		setSuccess("Saved!", 2000);
	}
	
	function removeJSONNull(obj){
		var isArray = obj instanceof Array;
		for (var k in obj){
			if (obj[k]===null) isArray ? obj.splice(k,1) : delete obj[k];
			else if (typeof obj[k]=="object") removeJSONNull(obj[k]);
		}
	}
	
	var statusTS = 0;
	
	function setError(message, timeout, refresh){
		if (typeof timeout === 'undefined') { timeout = 3500; }
		if (typeof refresh === 'undefined') { refresh = false; }
		statusTS = Date.now();
		var statusTS2 = Date.now();
		$("#statusc").hide();
		$("#statusc").css("background-color", "rgba(179, 18, 23, 0.9)");
		if(animate)
			$("#statusc").fadeIn("slow");
		else{
			setTimeout(function(){
				$("#statusc").show();
			}, 200);
		}
		if(refresh){
			$("#statusc").addClass("refClick");
			$("#statusc").css("cursor", "pointer");
		}else{
			$("#statusc").removeClass("refClick");
			$("#statusc").css("cursor", "initial");
		}
		$("#statust").html(message);
		if(timeout != -1){
			setTimeout(function(){
				if(statusTS == statusTS2){
						if(animate)
							$("#statusc").fadeOut("slow");
						else
							$("#statusc").hide();
				}
			},parseInt(timeout));
		}
	}

	function setSuccess(message, timeout, refresh){
		if (typeof timeout === 'undefined') { timeout = 3500; }
		if (typeof refresh === 'undefined') { refresh = false; }
		statusTS = Date.now();
		var statusTS2 = Date.now();
		$("#statusc").hide();
		$("#statusc").css("background-color", "rgba(24, 179, 18, 0.9)");
		if(animate)
			$("#statusc").fadeIn("slow");
		else{
			setTimeout(function(){
				$("#statusc").show();
			}, 200);
		}
		if(refresh){
			$("#statusc").addClass("refClick");
			$("#statusc").css("cursor", "pointer");
		}else{
			$("#statusc").removeClass("refClick");
			$("#statusc").css("cursor", "initial");
		}
		$("#statust").html(message);
		if(timeout != -1){
			setTimeout(function(){
				if(statusTS == statusTS2){
						if(animate)
							$("#statusc").fadeOut("slow");
						else
							$("#statusc").hide();
				}
			},parseInt(timeout));
		}
	}
	
	$(document).on("click", ".refClick", function(){
		refreshPage();
	});
	
	function addLoading(){
		if(animate){
			$("#loading").fadeIn("fast");
			$("#overlay").fadeIn("fast");
		}else{
			$("#loading").show();
			$("#overlay").show();
		}
	}
	
	function remLoading(){
		if(animate){
			$("#loading").fadeOut("fast");
			$("#overlay").fadeOut("fast");
		}else{
			$("#loading").hide();
			$("#overlay").hide();
		}
	}
	
	function refreshPage(){
		setTimeout(function(){
			if(animate){
				$("body").fadeOut("slow");
				setTimeout(function(){
					location.reload();
				}, 600);
			}else
				location.reload();
		}, 500);
	}
	
	function switchSlide(num){
		if(num == 0){
			$("#sl1").css("margin-left", "0");
			$("#sl2").css("margin-left", "600px");
			$("#sl1").css("-webkit-filter", "blur(0) grayscale(0%)");
			$("#sl2").css("-webkit-filter", "blur(2px) grayscale(100%)");
			if(animate){
				setTimeout(function(){
					$('#content').css('height', parseInt($("#sl1").css("top").replace("px", "")) + $("#sl1").height());
				},200);
			}else
				$('#content').css('height', parseInt($("#sl1").css("top").replace("px", "")) + $("#sl1").height());
		}else if(num == 1){
			$("#sl1").css("margin-left", "-600px");
			$("#sl2").css("margin-left", "0");
			$("#sl1").css("-webkit-filter", "blur(2px) grayscale(100%)");
			$("#sl2").css("-webkit-filter", "blur(0) grayscale(0%)");
			if(animate){
				setTimeout(function(){
					$('#content').css('height', parseInt($("#sl2").css("top").replace("px", "")) + $("#sl2").height());
				},200);
			}else
				$('#content').css('height', parseInt($("#sl2").css("top").replace("px", "")) + $("#sl2").height());
		}
	}
	function updateBadge(options) {
		var t = options.text,
			c = options.color||options.colour;
		if(t !== undefined){
			chrome.browserAction.setBadgeText({text: (t||'')});
		}
		if(c !== undefined) {
			chrome.browserAction.setBadgeBackgroundColor({color: c});
		}
	}
	
	function encodeHTML(s) {
		return s.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;').split("'").join('&#39;');
	}
	
	function timeSince(date) {
		var seconds = Math.floor((new Date() - date) / 1000);
		var interval = Math.floor(seconds / 31536000);
		var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
		var prefix = "",
			dateMonth = date.getMonth()+1;
		if(dateMonth.length < 2){
			prefix = "0";
		}
		if (interval > 1) {
			return prefix + (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
		}
		interval = Math.floor(seconds / 2592000);
		if (interval > 1) {
			return prefix + (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
		}
		interval = Math.floor(seconds / 86400);
		if (interval > 1) {
			return prefix + (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
		}
		interval = Math.floor(seconds / 3600);
		if (interval > 1) {
			if(interval > 23){
				return "1 day";
			}else{
				return interval + " hours";
			}
		}
		interval = Math.floor(seconds / 60);
		if (interval > 1) {
			if(interval > 59){
				return "1 hour";
			}else{
				return interval + " minutes";
			}
		}
		interval = Math.floor(seconds);
		if (interval > 1) {
			if(interval > 59){
				return "1 minute";
			}else{
				return interval + " seconds";
			}
		}else{
			return interval + " second";
		}
	}
});