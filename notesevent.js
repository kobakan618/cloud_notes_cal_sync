var NotesEvent = function() {
	this.start = {
		"dateTime": "",
		"date": null
	};
	this.end = {
		"dateTime": "",
		"date": null
	};
	this.description = "";
	this.summary = "";
	this.location = "";
	this.unid = "";
	this.gid = "";
	this.allday = "";
	this.calendar_type = ""
};
NotesEvent.prototype.toString = function() {
	return this.summary + "," + this.start.date.toLocaleDateString() + " " + this.start.date.toLocaleTimeString() + "," + this.end.date.toLocaleDateString() + " " + this.end.date.toLocaleTimeString() + "," + this.location + "," + this.gid + "," + this.unid
};
NotesEvent.prototype.SetNotesEvent = function(start, end, summary, location, unid, calendar_type) {
	if (start.length != 15 && start.length != 8 || end.length != 15 && end.length != 8 || unid.length != 32 || calendar_type > 4 || calendar_type < 0) {
		throw new Error("Invalid arguments.");
	}
	var styear = start.substr(0, 4);
	var stmon = start.substr(4, 2);
	var stday = start.substr(6, 2);
	var enyear = end.substr(0, 4);
	var enmon = end.substr(4, 2);
	var enday = end.substr(6, 2);
	if (calendar_type == 1 || calendar_type == 2) {
		this.allday = 1;
		this.start.date = new Date(styear + "-" + stmon + "-" + stday);
		this.end.date = new Date(enyear + "-" + enmon + "-" + enday)
	} else {
		var sthour = start.substr(9, 2);
		var stmin = start.substr(11, 2);
		var stsec = start.substr(13, 2);
		var enhour = end.substr(9, 2);
		var enmin = end.substr(11, 2);
		var ensec = end.substr(13, 2);
		this.allday = 0;
		this.start.date = new Date(styear + "-" + stmon + "-" + stday + "T" + sthour + ":" + stmin + ":" + stsec + "+09:00");
		this.end.date = new Date(enyear + "-" + enmon + "-" + enday + "T" + enhour + ":" + enmin + ":" + ensec + "+09:00")
	}
	this.start.dateTime = this.getStartDateString();
	this.end.dateTime = this.getEndDateString();
	this.summary = summary;
	this.location = (location) ? location : "";
	this.unid = unid;
	this.calendar_type = calendar_type;
	this.gid = ("micals" + styear + stmon + stday + unid).toLowerCase()
};
NotesEvent.prototype.getBody = function() {
	var body = {
		"status": "confirmed",
		"start": {},
		"end": {},
		"description": this.description,
		"summary": this.summary,
		"location": this.location,
		"id": this.gid
	};
	if (this.allday) {
		body.start.date = this.getStartDateString().substr(0, 10);
		body.end.date = this.getStartDateString().substr(0, 10)
	} else {
		body.start.dateTime = this.getStartDateString();
		body.end.dateTime = this.getEndDateString()
	}
	return body
};
NotesEvent.prototype.getStartDateString = function() {
	return this.getDateString("start")
};
NotesEvent.prototype.getEndDateString = function() {
	return this.getDateString("end")
};
NotesEvent.prototype.getDateString = function(st_en) {
	var date;
	if (st_en == "start") {
		date = this.start.date
	} else if (st_en == "end") {
		date = this.end.date
	} else {
		throw new Error("invalid argument");
	}
	var year = date.getFullYear();
	var mon = date.getMonth() + 1;
	var day = date.getDate();
	var hour = date.getHours();
	var min = date.getMinutes();
	var sec = date.getSeconds();
	mon = mon < 10 ? "0" + mon : mon;
	day = day < 10 ? "0" + day : day;
	hour = hour < 10 ? "0" + hour : hour;
	min = min < 10 ? "0" + min : min;
	sec = sec < 10 ? "0" + sec : sec;
	return new Array(year, mon, day).join("-") + "T" + new Array(hour, min, sec).join(":") + "+09:00"
};
NotesEvent.prototype.needsInsert = function(gres) {
	var self = this;
	var insflag = 1;
	var gindex = 0;
	gres.items.some(function(gevent) {
		if (gevent.id == self.gid) {
			var gstart = gevent.start.dateTime ? new Date(gevent.start.dateTime) : new Date(gevent.start.date);
			var gend = gevent.end.dateTime ? new Date(gevent.end.dateTime) : new Date(gevent.end.date);
			if (gevent.status == "cancelled" || gstart - self.start.date || gend - self.end.date || gevent.summary != self.summary || (self.location != "" && gevent.location != self.location)) {
				insflag = 2;
				return true
			} else {
				console.log("update不要：" + self);
				insflag = 0;
				return true
			}
		}
		gindex++
	});
	return {
		flag: insflag,
		index: gindex
	}
};

function getISODateString(d) {
	function pad(n) {
		return n < 10 ? '0' + n : n
	}
	return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z'
};
var NotesEvents = function() {
	this.events = new Array()
};
NotesEvents.prototype.getEvents = function() {
	return this.events
};
NotesEvents.prototype.push = function(event) {
	this.events.push(event)
};
NotesEvents.prototype.sort = function() {
	this.events.sort(function(a, b) {
		return a.start.date - b.start.date
	})
};
NotesEvents.prototype.clear = function() {
	this.events = new Array()
};
NotesEvents.prototype.getInsertEvents = function(gres) {
	var arins = new Array();
	var arupd = new Array();
	this.events.forEach(function(nevent) {
		var inscheck = nevent.needsInsert(gres);
		if (inscheck.flag == 1) {
			arins.push(nevent)
		} else if (inscheck.flag == 2) {
			nevent.description = gres.items[inscheck.index].description;
			arupd.push(nevent)
		} else {}
	});
	return {
		insert: arins,
		update: arupd
	}
};
NotesEvents.prototype.postJSONParse = function(eobjs) {
	var self = this;
	eobjs.forEach(function(eobj) {
		var start = eobj.start.dateTime.replace(/[\-\:]/g, "");
		var end = eobj.end.dateTime.replace(/[\-\:]/g, "");
		start = start.substr(0, 15);
		end = end.substr(0, 15);
		var event = new NotesEvent();
		event.SetNotesEvent(start, end, eobj.summary, eobj.location, eobj.unid, eobj.calendar_type);
		self.events.push(event)
	})
};
NotesEvents.prototype.contain = function(newev) {
	var hit = false;
	this.events.forEach(function(ev) {
		try {
			if (newev.gid == ev.gid) {
				hit = true;
				return
			}
		} catch (e) {
			console.log(e)
		}
	});
	return hit
};