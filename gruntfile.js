module.exports = function(grunt){
	grunt.initConfig({
		watch: {
		  default: {
			options: {
			  spawn: false,
			  interrupt: true
			},
			files: ["settings_edit.html", "js/settings_edit.js", "css/settings.css"],
			tasks: ["vulcanize"]
		  }
		},
		vulcanize: {
		  default: {
			options: {
				inlineCss: false,
				csp: "js/settings.js"
			},
			files: {
			  "settings.html": "settings_edit.html"
			}
		  }
		}
	});
	
	grunt.loadNpmTasks("grunt-vulcanize");
	grunt.loadNpmTasks("grunt-contrib-watch");
	
	grunt.registerTask("default", ["vulcanize", "watch"]);
};