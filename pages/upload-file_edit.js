/*

ALL CODE HERE IS TEMPORARY, WILL BE REMOVED ONCE THIS ISSUE IS RESOLVED ON CHROMIUM: https://bugs.chromium.org/p/chromium/issues/detail?id=650536

*/

var NOTIFICATIONSOUND_DEFAULT = 0,
    NOTIFICATIONSOUND_CUSTOM = 100;

var database, databaseRequest;

document.title = "YouTube Notifications - " + chrome.i18n.getMessage("settings_editSettings_notificationSound");

window.addEventListener("WebComponentsReady", function() {
    $(function () {
        $Poly = Polymer.dom;

        // Open up the indexedDB vault

        databaseRequest = indexedDB.open("default", 2);
        databaseRequest.onsuccess = function(e) {
            database = e.target.result;

            loadSounds(true);
        };

        $("#settings_sound_upload").on("click", function(){
            $("#fileUploader").click();
        });
        $("#fileUploader").on("change", function(){
            createToast(chrome.i18n.getMessage("settingsJs_" + "uploading"));

            var file = $("#fileUploader")[0].files[0],
                fileReader = new FileReader();

            fileReader.onloadend = function(){
                var data = {
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    file: this.result
                };

                var transaction = database.transaction(["customMedia"], "readwrite"),
                    store = transaction.objectStore("customMedia"),
                    request = store.delete(0);

                request.onsuccess = function(){
                    transaction = database.transaction(["customMedia"], "readwrite");
                    store = transaction.objectStore("customMedia");
                    request = store.add(data, 0);

                    createToast(chrome.i18n.getMessage("settingsJs_" + "uploadcomplete"));
                    loadSounds(false);

                    chrome.extension.sendMessage({type: "updateNotificationSound"});
                };
            };
            fileReader.readAsDataURL(file)
        });
    });

    setLocales();

    setTimeout(function() {// Timeout 500 since script prediction is difficult
        $("#launch_screen").fadeOut("fast");
    }, 500);
});

/**
 *  Sets the appropriate text to all html tags with the attribute 'i18n'
 */
function setLocales() {
    $("[i18n]:not(paper-card)").each(function(i, elem){
        var string = chrome.i18n.getMessage($(elem).attr("i18n"));
        $(elem).text(string);
    });
    $("paper-card[i18n]").each(function(i, elem) {
        var string = chrome.i18n.getMessage($(elem).attr("i18n"));
        elem.heading = string;
        elem.alt = string;
    });
}

function loadSounds(registerListeners) {
    var selectElem = $("paper-listbox");
    selectElem[0].attrForSelected = "value";
    clearPaperItems(selectElem[0]);

    addPaperItem(selectElem[0], chrome.i18n.getMessage("settingsJs_" + "notificationSound_default"), NOTIFICATIONSOUND_DEFAULT);

    var transaction = database.transaction(["customMedia"], "readonly"),
        store = transaction.objectStore("customMedia"),
        data = store.get(0);

    data.onsuccess = function() {
        if (typeof data.result !== "undefined") {
            addPaperItem(selectElem[0], data.result.name, NOTIFICATIONSOUND_CUSTOM);

            selectElem[0].selected = JSON.parse(localStorage.getItem("settings")).notificationSound;
        }
    };

    selectElem[0].selected = JSON.parse(localStorage.getItem("settings")).notificationSound;

    if(registerListeners) {
        setTimeout(function(){//Set timeout so saving doesn't get triggered
            selectElem.on("iron-select", function(){
                var value = parseInt(selectElem[0].selected),
                    settings = JSON.parse(localStorage.getItem("settings"));
                settings.notificationSound = value;
                localStorage.setItem("settings", JSON.stringify(settings));
                createToast(chrome.i18n.getMessage("settingsJs_" + "saved"));

                chrome.extension.sendMessage({type: "updateNotificationSound"});
            });
        }, 10);
    }
}

/**
 * Clears all items from the paper-listbox
 */
function clearPaperItems(listboxElem) {
    $Poly(listboxElem).innerHTML = "";
}


/**
 * Adds an item to the paper-listbox
 */
function addPaperItem(listboxElem, title, value) {
    var element = document.createElement("paper-item");
    $(element).attr("value", value).text(title);
    $Poly(listboxElem).appendChild(element);
}

/**
 * Saves the current notification settings
 */
function save(override) {

    if(!override)
        createToast(chrome.i18n.getMessage("settingsJs_saved"));
}

/**
 * Shows and creates a toast
 * @param text The message to display
 */
function createToast(text){
    $("paper-toast")[0].opened = false;
    $("paper-toast")[0].refit();
    setTimeout(function() {
        $("paper-toast")[0].show({
            text: text
        });
    }, 1);
}
