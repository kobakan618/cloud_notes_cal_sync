var extname = "CloudNotes-GooCalSync";
chrome.runtime.sendMessage({
	method: "getRcalUrl"
}, function(response) {
	var url = window.location.toString();
	if (response) {
		var rcalurl = response.rcalurl ? response.rcalurl : "";
		rcalurl_match = rcalurl.substr(0, rcalurl.indexOf(".nsf") + 4);
		if (rcalurl.match(/https:\/\/mail\.notes\.ap\.collabserv\.com\/data[0-9]+\/[0-9]+\/[0-9]+\.nsf\/[a-zA-Z\?\/]*/) && url.match(new RegExp(rcalurl_match))) {
			console.log("Start parsing :" + url);
			startParsingNotes()
		} else {
			console.log('Unmatched url :' + url)
		}
	} else {
		console.log('No response from background.')
	}
});

function startParsingNotes() {
	var count = 0;
	var observer = new MutationObserver(moCallback);
	var events = new NotesEvents();
	var timer = null;
	var google = null;

	function moCallback(records, obsv) {
		records.forEach(function(mutation) {
			if (mutation.addedNodes.length > 0) {
				for (var i = 0; i < mutation.addedNodes.length; i++) {
					var node = mutation.addedNodes[i];
					if (node.className == "s-cv-entry" && node.getAttribute("unid") && node.getAttribute("id") != "e-calendarview-frame-entry-selected") {
						var calendar_type = node.getAttribute("calendar_type");
						var start = node.getAttribute("calendar_start");
						var end = node.getAttribute("calendar_end");
						if (calendar_type != 1 && calendar_type != 2) {
							start = start.substr(0, 15);
							end = end.substr(0, 15)
						}
						var title = node.getElementsByClassName("s-cv-grid-entry-subject")[0];
						if (title) {
							title = title.innerText.trim()
						}
						var location = "";
						var unid = node.getAttribute("unid");
						if (node.getElementsByClassName("s-cv-grid-entry-subject").length) {} else if (node.getElementsByClassName("s-cv-timeslot-entry-subject").length) {
							var inframe = node.getElementsByClassName("s-cv-entry-innerframe s-cv-text")[0];
							var title_location = inframe.innerText.trim().split("\n");
							title = title_location[0];
							location = title_location[1]
						} else {
							alert(extname + "\nParse error!");
							console.log("Parse error! 日・週・月表示の判別不能");
							console.log(node);
							return
						}
						var event = new NotesEvent();
						event.SetNotesEvent(start, end, title, location, unid, calendar_type);
						if (!events.contain(event)) {
							events.push(event)
						}
						if (timer) {
							clearTimeout(timer);
							timer = null
						}
						timer = window.setTimeout(syncCalendar, 1000)
					}
				}
			}
		})
	}

	function syncCalendar() {
		console.log("syncCalendar()");
		console.log(events);
		var strevents = JSON.stringify(events);
		chrome.runtime.sendMessage({
			method: "syncEvents",
			events: strevents
		}, function(response) {});
		events.clear()
	}
	observer.observe(document, {
		attributes: true,
		childList: true,
		subtree: true
	})
}