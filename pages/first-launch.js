$(function(){
	var resize = true;
	
	$("#header-title").css({
		marginLeft: ($(window).width() - $("#header-title").width()) / 2 + "px"
	});
	setTimeout(function(){
		windowResize();
	}, 200);
	$(window).resize(function(){
		windowResize();
	});
	
	// Opening transitions
	$("body").css({
		opacity: 0,
		marginTop: "20px",
		transform: "scale(.995)"
	});
	$("body").transition({
		opacity: 1,
		marginTop: 0,
		transform: "scale(1)"
	}, 1200);
	$("#get-started").delay(1000).fadeIn("slow");
	
	$("#get-started").on("click", function(){launchPage(1);});
	$("#content-1-next, #content-1-rightnext").on("click", function(){launchPage(2);});
	$("#content-2-next, #content-2-rightnext").on("click", function(){launchPage(3);});
	$("#content-3-next, #content-3-rightnext").on("click", function(){launchPage(4);});
	$("#content-4-next, #content-4-rightnext").on("click", function(){launchPage(5);});
	$("#content-5-next, #content-5-rightnext").on("click", function(){launchPage(6);});

	/**
	 *  Sends the user to the next page (page numbers HAS to be in order)
	 *  @param {number} num The page number
	 */
	function launchPage(num){
		if(num == 1){
			resize = false;
			$("body").attr("data-changedstyle", true);
			$("#header-intro").fadeOut("normal");//Remove "Thank you" message
			$("#get-started").fadeOut("normal");//Remove "next" message
			$("#header").transition({//Following functions to move "YouTube Notifications" into the top left corner
				padding: "20px",
				marginBottom: "15px",
				backgroundColor: "#F44336",
				color: "#FFF"
			}, 1200);
			$("#header-title").transition({
				top: 0,
				margin: 0
			}, 1200);
			$("#header-title img").transition({
				height: "35px"
			}, 1200);
			$("#header-title span").transition({
				marginLeft: "5px",
				fontSize: "28px"
			}, 1200);
			$("#content").transition({
				marginTop: 0
			}, 1200);
			$("#credits").fadeIn("normal");
			setTimeout(function(){
				$("#content-1").fadeIn("normal");
			}, 400);
			return;
		}
		$("#content-" + (num-1)).transition({
			marginLeft: -$("#content-" + (num-1)).width()-200,
			opacity: 0
		}, 500);
		setTimeout(function(){
			$("#content-" + (num-1)).hide();
			$("#content-" + num).show();
			$("#content-" + num).css("margin-left", $("#content-" + (num-1)).width()+200);
			$("#content-" + num).transition({
				marginLeft: 0,
				opacity: 1
			}, 1200);
		}, 500);
		if(num == 2 || num == 3)
			$("#add-channel-" + num)[0].play();
			
	}
	
	function windowResize(){
		if(resize)
			$("#header-title").css("marginLeft", ($(window).width() - $("#header-title").width()) / 2 + "px");
	}
});