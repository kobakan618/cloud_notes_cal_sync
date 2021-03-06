﻿$(function() {
	var gcalid = localStorage.getItem("gcalid");
	var rcalurl = localStorage.getItem("rcalurl");
	rcalurl = rcalurl ? rcalurl : "";
	$("#rcalurl").val(rcalurl);
	if (!gcalid) {
		chrome.identity.getProfileUserInfo(function(user) {
			if (chrome.runtime.lastError) {
				alert(chrome.runtime.lastError.message);
				return
			}
			gcalid = user.email;
			$("#gcalid").val(gcalid);
			localStorage.setItem("gcalid", gcalid)
		})
	} else {
		$("#gcalid").val(gcalid)
	}
	chrome.identity.getAuthToken({
		interactive: true
	}, function(token) {
		if (chrome.runtime.lastError) {
			alert(chrome.runtime.lastError.message);
			return
		}
		var x = new XMLHttpRequest();
		x.open('GET', 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&access_token=' + token);
		x.onload = function() {
			$("#connecting").remove();
			var gcallist = JSON.parse(x.response);
			console.log(gcallist);
			if (gcallist.items.length) {
				gcallist.items.forEach(function(cal) {
					var btnid = cal.id.split(/@/, 2)[0];
					$("#tbl_gcallist>tbody").append('<tr><td bgcolor="' + cal.backgroundColor + '">' + cal.summary + '</td><td class="gcalid">' + cal.id + '</td><td>' + cal.accessRole + '</td><td><input type="button" value="選択" class="btn_apply">' + "</td></tr>")
				})
			}
		};
		x.send()
	});
	$("#rcalurl").change(function() {
		localStorage.setItem("rcalurl", $("#rcalurl").val())
	});
	$("#tbl_gcallist").on("click", "input", function(e) {
		var gcalid = $(this).closest("tr").find(".gcalid").text();
		$("#gcalid").val(gcalid);
		localStorage.setItem("gcalid", $("#gcalid").val())
	})
});