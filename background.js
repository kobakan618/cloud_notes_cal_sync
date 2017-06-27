var nevents;
var extname = "CloudNoetsCalSync";
console.log("Start!");
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method == "getRcalUrl") {
		var rcalurl = localStorage.getItem("rcalurl");
		console.log(" getRcalUrl received.");
		sendResponse({
			rcalurl: rcalurl
		})
	} else if (request.method == "syncEvents") {
		console.log(" syncEvents received.");
		var obj = JSON.parse(request.events);
		nevents = new NotesEvents();
		nevents.postJSONParse(obj.events);
		nevents.sort();
		console.log(" 取得済みNotesイベント数：" + nevents.events.length);
		console.log(nevents);
		chrome.identity.getAuthToken({
			interactive: true
		}, getGoogleEvents);
		sendResponse({
			status: 0
		})
	} else {
		sendResponse({
			status: -1
		})
	}
});

function getGoogleEvents(token) {
	if (chrome.runtime.lastError) {
		console.log(chrome.runtime.lastError.message);
		alert("Error!\n" + chrome.runtime.lastError.message + "\nプロキシ認証が完了しているか確認して下さい。");
		return
	}
	var gcalid = localStorage.getItem("gcalid");
	console.log(" gcalid :" + gcalid);
	if (!gcalid) {
		alert("GoogleCalendarIDが指定されていません。\nオプションページにて指定して下さい。");
		return
	}
	var xhr = new XMLHttpRequest();
	var timemin = nevents.events[0].getStartDateString();
	var timemax = nevents.events[nevents.events.length - 1].getEndDateString();
	console.log(" Googleイベント取得期間：" + timemin + " から " + timemax);
	timemin = timemin.replace(/:/g, "%3A").replace(/\+/, "%2B");
	timemax = timemax.replace(/:/g, "%3A").replace(/\+/, "%2B");
	xhr.open('GET', "https://www.googleapis.com/calendar/v3/calendars/" + gcalid.replace(/\@/, "%40") + "/events?" + "orderBy=startTime" + "&singleEvents=true" + "&timeMin=" + timemin + "&timeMax=" + timemax + "&showDeleted=true", true);
	xhr.setRequestHeader('Authorization', 'Bearer ' + token);
	xhr.send(null);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				var geve = JSON.parse(xhr.responseText);
				console.log(" Googleイベント受信成功 イベント数 :" + geve.items.length);
				console.log(geve);
				var gres = JSON.parse(xhr.responseText);
				var insevents = nevents.getInsertEvents(gres);
				var inserts = insevents.insert;
				var updates = insevents.update;
				console.log(" 要登録イベント数 insert:" + inserts.length + " update:" + updates.length);
				console.log(insevents);
				var delay = 0;
				var restcnt = inserts.length + updates.length;
				inserts.forEach(function(ev) {
					setTimeout(function() {
						insertGoogleEvent(token, ev, gcalid);
						restcnt--
					}, delay);
					delay += 500
				});
				updates.forEach(function(ev) {
					setTimeout(function() {
						updateGoogleEvent(token, ev, gcalid);
						restcnt--
					}, delay);
					delay += 500
				});
				if (inserts.length || updates.length) {
					var items = inserts.map(function(ev) {
						return {
							title: "追加：",
							message: "(" + (ev.start.date.getMonth() + 1) + "/" + ev.start.date.getDate() + ") " + ev.summary
						}
					});
					items = items.concat(updates.map(function(ev) {
						return {
							title: "更新：",
							message: "(" + (ev.start.date.getMonth() + 1) + "/" + ev.start.date.getDate() + ") " + ev.summary
						}
					}));
					var opt = {
						iconUrl: "icon_128.png",
						type: 'list',
						title: extname + " 同期実行",
						message: extname + " 同期実行",
						items: items
					};
					chrome.notifications.create('', opt, function(id) {
						setTimeout(function() {
							chrome.notifications.clear(id, function() {})
						}, 5000)
					});
					if (geve.items.length >= 250) {
						var opt = {
							iconUrl: "icon_128.png",
							type: 'basic',
							title: extname + ' 注意',
							message: "同期対象期間のGoogleイベント数が250以上あります（削除済み含む）。\n正常に同期出来なかった可能性があります。",
						};
						chrome.notifications.create('', opt, function(id) {
							setTimeout(function() {
								chrome.notifications.clear(id, function() {})
							}, 10000)
						})
					}
				}
			} else {
				var res = JSON.parse(xhr.responseText);
				console.log(" ▲Googleイベント受信失敗");
				console.log(res);
				chrome.identity.removeCachedAuthToken({
					"token": token
				}, function() {});
				alert("Error! 予定受信失敗 " + res.error.code + " : " + res.error.message + "\nGoogle calendar IDが正しいか確認して下さい。")
			}
		}
	}
}

function insertGoogleEvent(token, event, gcalid) {
	var xhr = new XMLHttpRequest();
	eventid = event.gid;
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				var res = JSON.parse(xhr.responseText);
				console.log(" イベントInsert成功 :" + res.summary);
				console.log(res)
			} else {
				var res = JSON.parse(xhr.responseText);
				console.log(" ▲イベントInsert失敗");
				console.log(res);
				if (res.error.code == 409) {
					var opt = {
						iconUrl: "icon_128.png",
						type: 'basic',
						title: '同期失敗',
						message: "一部の予定の同期に失敗しました。",
					}
				} else {
					alert("Error! イベントInsert失敗\n" + res.error.code + " : " + res.error.message)
				}
			}
		}
	};
	console.log("イベントInsert実行");
	console.log(event);
	var body = JSON.stringify(event.getBody());
	xhr.open('POST', "https://www.googleapis.com/calendar/v3/calendars/" + gcalid.replace(/@/, "%40") + "/events", true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.setRequestHeader('Authorization', 'Bearer ' + token);
	xhr.send(body)
}

function updateGoogleEvent(token, event, gcalid) {
	var xhr = new XMLHttpRequest();
	eventid = event.gid;
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				var res = JSON.parse(xhr.responseText);
				console.log(" イベントUpdate成功 :" + res.summary);
				console.log(res)
			} else {
				var res = JSON.parse(xhr.responseText);
				console.log(" ▲イベントUpdate失敗");
				console.log(res);
				alert("Error! イベントUpdate失敗" + res.error.code + " : " + res.error.message)
			}
		}
	};
	console.log("イベントUpdate実行");
	console.log(event);
	var body = JSON.stringify(event.getBody());
	xhr.open('PUT', "https://www.googleapis.com/calendar/v3/calendars/" + gcalid.replace(/@/, "%40") + "/events/" + eventid, true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.setRequestHeader('Authorization', 'Bearer ' + token);
	xhr.send(body)
};