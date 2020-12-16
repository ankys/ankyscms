#!node

// 
// cms for ankys work
// 

(function(global) {
"use strict";

var Getopt = require("node-getopt");
var Path = require("path").posix;
var URL = require("url");
var FS = require("fs");
var Crypto = require("crypto");

var MacroText = require("./macrotext.js");

function defined(obj) {
	return obj !== undefined;
}
Array.prototype.mapA = function() {
	var arrayList = Array.prototype.map.apply(this, arguments);
	return Array.prototype.concat.apply([], arrayList);
};
Object.clone = function(obj) {
	var obj2 = {};
	Object.assign(obj2, obj);
	return obj2;
};
function KvlistForEach(kvlist, callback, self) {
	var index = 0;
	for (var i = 0; i + 1 < kvlist.length; i += 2) {
		var key = kvlist[i];
		var value = kvlist[i + 1];
		callback.call(self, key, value, index, kvlist);
		index++;
	}
}
function KvlistToObject(kvlist) {
	var obj = {};
	KvlistForEach(kvlist, function(key, value) {
		obj[key] = value;
	});
	return obj;
}
function StringFormatList(format, args) {
	var str = format.replace(/(\$(\$|[0-9]+))/g, function(match, s, a) {
		var s2;
		return (
			a == "\$" ? a :
			(s2 = args[a - 1]) !== undefined ? s2 :
			s
		);
	});
	return str;
}
function TSVEscape(obj) {
	function escape(c) {
		return (
			c == "\x0D" ? "\\r" :
			c == "\x0A" ? "\\n" :
			c == "\t" ? "\\t" :
			c == "\\" ? "\\\\" :
			""
		);
	}
	var re = /\x0D|\x0A|\t|\\/g;
	var str = obj.toString();
	if (!re.test(str)) {
		return str;
	}
	var str2 = str.replace(re, escape);
	return "\"" + str2 + "\"";
}
function TSVFDump(table, fields) {
	// return TextDumpFieldedTable(table, fields, "\n", "\t", identity, TSVEscape, true);
	var delimiter = "\n";
	var separator = "\t";
	var escapeValue = TSVEscape;
	var fieldsE = fields.map(function(field) {
		var fieldE = escapeValue(field);
		return fieldE;
	});
	var line0 = fieldsE.join(separator);
	var linesE = table.map(function(row) {
		var valuesE = fields.map(function(field) {
			var value = row[field];
			var valueE = value == undefined || value == null ? "" : escapeValue(value);
			return valueE;
		});
		var line = valuesE.join(separator);
		return line;
	});
	linesE.unshift(line0);
	linesE.push("");
	var text = linesE.join(delimiter);
	return text;
}
function TSVFKDump(table, fields, keyName) {
	// return TextDumpFieldedTable(table, fields, "\n", "\t", identity, TSVEscape, true);
	var delimiter = "\n";
	var separator = "\t";
	var escapeValue = TSVEscape;
	var fieldsE = fields.map(function(field) {
		var fieldE = escapeValue(field);
		return fieldE;
	});
	var keyNameE = escapeValue(keyName);
	fieldsE.unshift(keyNameE);
	var line0 = fieldsE.join(separator);
	var keys = Object.keys(table).sort();
	var linesE = keys.map(function(key) {
		var row = table[key];
		var valuesE = fields.map(function(field) {
			var value = row[field];
			var valueE = value == undefined || value == null ? "" : escapeValue(value);
			return valueE;
		});
		var keyE = escapeValue(key);
		valuesE.unshift(keyE);
		var line = valuesE.join(separator);
		return line;
	});
	linesE.unshift(line0);
	linesE.push("");
	var text = linesE.join(delimiter);
	return text;
}
function TSVUnescape(str) {
	function unescape(c) {
		return (
			c == "\\r" ? "\x0D" :
			c == "\\n" ? "\x0A" :
			c == "\\t" ? "\t" :
			c == "\\\\" ? "\\" :
			""
		);
	}
	var m;
	if (!(m = str.match(/^"(.*)"$/))) {
		return str;
	}
	var str2 = m[1];
	var re = /\\r|\\n|\\t|\\\\/g;
	return str2.replace(re, unescape);
}
function TSVFParse(text, fields) {
	// return TextParseFieldedTable(text, fields, /\x0D\x0A|\x0D|\x0A/g, "\t", identity, TSVUnescape, true);
	var delimiter = "\n";
	var separator = "\t";
	var unescapeValue = TSVUnescape;
	var lines = text.split(delimiter);
	if (lines[lines.length - 1] === "") {
		lines.pop();
	}
	var line0 = lines.shift();
	var heads = line0.split(separator);
	var headsU = heads.map(function(head) {
		var headU = unescapeValue(head);
		return headU;
	});
	var mapFieldIndex = {};
	fields.forEach(function(field) {
		var index = headsU.indexOf(field);
		mapFieldIndex[field] = index;
	});
	var table = lines.map(function(line) {
		var words = line.split(separator);
		var obj = {};
		fields.forEach(function(field) {
			var index = mapFieldIndex[field];
			var word = words[index];
			var wordU = word === undefined ? null : unescapeValue(word);
			obj[field] = wordU;
		});
		return obj;
	});
	return table;
}
function TSVFKParse(text, fields, keyName) {
	// return TextParseFieldedTable(text, fields, /\x0D\x0A|\x0D|\x0A/g, "\t", identity, TSVUnescape, true);
	var delimiter = "\n";
	var separator = "\t";
	var unescapeValue = TSVUnescape;
	var lines = text.split(delimiter);
	if (lines[lines.length - 1] === "") {
		lines.pop();
	}

	var line0 = lines.shift();
	var heads = line0.split(separator);
	var headsU = heads.map(function(head) {
		var headU = unescapeValue(head);
		return headU;
	});
	var indexKey = headsU.indexOf(keyName);
	var mapFieldIndex = {};
	fields.forEach(function(field) {
		var index = headsU.indexOf(field);
		mapFieldIndex[field] = index;
	});
	var table = {};
	lines.forEach(function(line, i) {
		var words = line.split(separator);
		var key = words[indexKey];
		var keyU = key === undefined ? i : unescapeValue(key);
		var obj = {};
		fields.forEach(function(field) {
			var index = mapFieldIndex[field];
			var word = words[index];
			var wordU = word === undefined ? null : unescapeValue(word);
			obj[field] = wordU;
		});
		table[keyU] = obj;
	});
	return table;
}
function SkvtextDump(kvlist) {
	var text = "";
	KvlistForEach(kvlist, function(key, value) {
		if (/\x0D\x0A|\x0D|\x0A/.exec(value)) {
			text += key + "\n" + value + "\n\n";
		} else {
			text += key + "\t" + value + "\n";
		}
	});
	return text;
}
function SkvtextParse(text) {
	// ([^\t\x0D\x0A]*)\t(.*?)(?:\x0D\x0A|\x0D|\x0A)
	// ([^\t\x0D\x0A]*)(?:\x0D\x0A|\x0D|\x0A)([\s\S]*?)(?:\x0D\x0A|\x0D|\x0A){2,}
	var re = /([^\t\x0D\x0A]*)\t(.*?)(?:\x0D\x0A|\x0D|\x0A|$)|([^\t\x0D\x0A]*)(?:\x0D\x0A|\x0D|\x0A)([\s\S]*?)(?:(?:\x0D\x0A|\x0D|\x0A){2,}|$)/g;
	var kvlist = [];
	var m;
	while (m = re.exec(text)) {
		if (m[1] !== undefined) {
			kvlist.push(m[1], m[2]);
		}
		if (m[3] !== undefined) {
			kvlist.push(m[3], m[4]);
		}
	}
	return kvlist;
}
function GlobToRegExp(pattern, useGroup) {
	// glob *
	// regexp +.*?()[]{}|\$^
	var pattern2 = pattern.replace(/([\?\+\.\(\)\[\]\{\}\|\\\$\^])/g, "\\$1").replace(/\*/g, useGroup ? "(.*)" : ".*");
	// .replace(/\?/g, useGroup ? "(.)" : ".");
	return new RegExp("^" + pattern2 + "$");
}
function FileMakePathSync(path) {
	var Path = require("path");
	var FS = require("fs");
	var dir = Path.dirname(path);
	if (dir !== path && dir !== ".") {
		FileMakePathSync(dir);
	}
	if (!FS.existsSync(path)) {
		FS.mkdirSync(path);
	}
}
function FileReadAllSync(path) {
	var FS = require("fs");
	try {
		return FS.readFileSync(path);
	} catch(err) {
		return;
	}
}
function FileWriteAllSync(path, data) {
	var Path = require("path");
	var FS = require("fs");
	var dir = Path.dirname(path);
	FileMakePathSync(dir);
	try {
		FS.writeFileSync(path, data);
		return true;
	} catch(err) {
		return;
	}
}
function FileCopySync(src, dest) {
	var Path = require("path");
	var FS = require("fs");
	var dir = Path.dirname(dest);
	FileMakePathSync(dir);
	try {
		FS.copyFileSync(src, dest);
		// utime(undef, (stat($src))[9], $dest);
		return true;
	} catch(err) {
		return;
	}
}
function DirectoryReadAllSync(path) {
	var FS = require("fs");
	var files = FS.readdirSync(path);
	return files;
}
function PathCombine(path1, path2) {
	var r1 = Path.parse(path1);
	var root1 = r1.dir;
	var name1 = r1.base;
	var r2 = Path.parse(path2);
	var root2 = r2.dir;
	var name2 = r2.base;
	if (Path.isAbsolute(path2)) {
		return Path.join(root2, name2);
	}
	return Path.join(root1, root2, name2);
}
var PosMap;
PosMap = function(entries) {
	this.get = function(p) {
		var entry = entries.find(function(entry) {
			var pos = entry.pos;
			var len = entry.len;
			return p >= pos && p < pos + len;
		});
		if (!defined(entry)) return [];
		var tag = entry.tag;
		var extra = p - entry.pos;
		return [tag, extra];
	};
};
PosMap.newLine = function(info) {
	var line = info.line;
	var eol = info.eol;
	var tag = info.tag;
	var len = line.length;
	var entry = { pos: 0, len: len, tag: tag };
	var entries = [entry];
	var posmap = new PosMap(entries);
	return [line, posmap];
};
PosMap.newLines = function(infos) {
	var p = 0;
	var text = "";
	var entries = [];
	infos.forEach(function(info) {
		var line = info.line;
		var eol = info.eol;
		var tag = info.tag;
		var len = line.length + eol.length;
		text += line + eol;
		var entry = { pos: p, len: len, tag: tag };
		entries.push(entry);
		p += line.length + eol.length;
	});
	var posmap = new PosMap(entries);
	return [text, posmap];
};
PosMap.newSplitLinesFile = function(path, text) {
	var re = /([^\x0D\x0A]*)(\x0D\x0A|\x0D|\x0A|$)/g;
	var entries = [];
	var row = 0;
	var m;
	while (m = re.exec(text)) {
		var pos = m.index;
		var len = m[2] === "" ? 1 : m[0].length;
		var entry = { pos: pos, len: len, path: path, row: row };
		entries.push(entry);
		row++;
		if (m[0].length === 0) {
			re.lastIndex = m.index + 1;
		}
	}
	return new PosMap(entries);
};

// library
function parseGlobs(text) {
	var lines = text.split(/\x0D\x0A|\x0D|\x0A/g);
	var globs = lines.map(function(line) {
		if (line === "") return;
		if (line.match(/^#/)) return;
		var glob = line.replace(/\\(.)/g, "$1");
		return glob;
	}).filter(defined);
	return globs;
}
function splitArray(str) {
	var tokens = str.match(/\s+|"|`.|[^`"\s]+/g);
	if (tokens === null) {
		return [];
	}
	var groups = [];
	var groupC = [];
	var modeC = false; // quot mode
	tokens.forEach(function(token) {
		if (!modeC && token.match(/^\s+$/)) {
			groups.push(groupC);
			groupC = [];
		} else {
			groupC.push(token);
			if (token === "\"") {
				modeC = !modeC;
			}
		}
	});
	groups.push(groupC);
	var m;
	var strs = groups.map(function(group) {
		var tokens = group;
		if (tokens.length === 0) return;
		var str = "";
		tokens.forEach(function(token) {
			if (token === "\"") {
			} else if (m = token.match(/^`(.)$/)) {
				str += m[1];
			} else {
				str += token;
			}
		});
		return str;
	}).filter(defined);
	return strs;
}
function splitNameValue(line) {
	var m = line.match(/^\s*(\w+)\s*:?(.*?):?\s*$/);
	return m ? [m[1], m[2]] : [];
}
function calcMd5Base64(data) {
  return Crypto.createHash("md5").update(data).digest("base64").replace(/=*$/, "");
}
function normalizePath(path) {
	var { dir: dir, base: name } = Path.parse(path);
	if (name === defaultFile) {
		path = Path.join(dir, ".");
	}
	return path;
}
function newLine(line, eol, tag) {
	return { line: line, eol: eol, tag: tag };
}
const messageTypes = {
	// general
	LOADFILE: "Debug",
	NGLOADFILE: "Warning",
	SAVEFILE: "Debug",
	NGSAVEFILE: "Warning",
	COPYFILE: "Debug",
	NGCOPYFILE: "Warning",
	DELETEFILE: "Debug",
	NGDELETEFILE: "Warning",
	// config
	LOADCONFIG: "Debug",
	NGLOADCONFIG: "Error",
	CONFIG: "Debug",
	CONFIGLINE: "Debug",
	INVALIDLINE: "Warning",
	INVALIDCOMMAND: "Warning",
	// cache
	LOADCACHE: "Debug",
	NGLOADCACHE: "Debug",
	SAVECACHE: "Debug",
	NGSAVECACHE: "Error",
	// user
	USER: "Debug",
	// scan command
	COMMAND: "Debug",
	NGCOMMAND: "Warning",
	NOCOMMAND: "Warning",
	// check file
	CHECKFILE: "Debug",
	NEWFILE: "Info",
	NOTEDITEDFILE: "Debug",
	NOTCHANGEDFILE: "Debug",
	UPDATEDFILE: "Info",
	REDEFINETEMPLATE: "Warning",
	NGTEMPLATE: "Warning",
	// check src
	NOSRC: "Error",
	NODEST: "Error",
	// add dest
	ADDDEST: "Debug",
	MULTISRC: "Warning",
	// convert file
	SKIPFILE: "Debug",
	CREATEFILE: "Info",
	CREATEFILET: "Info",
	// delete extra
	DELETEEXTRA: "Info",
};
const messagesC = {
	// general
	LOADFILE: "load file $1",
	NGLOADFILE: "cannot load file $1",
	SAVEFILE: "save file $1",
	NGSAVEFILE: "cannot save file $1",
	COPYFILE: "copy file $1 to $2",
	NGCOPYFILE: "cannot copy file $1 to $2",
	DELETEFILE: "delete file $1",
	NGDELETEFILE: "cannot delete file $1",
	// config
	LOADCONFIG: "load config file $1",
	NGLOADCONFIG: "cannot load config file $1",
	CONFIG: "config file $1",
	CONFIGLINE: "config $1",
	INVALIDLINE: "cannot parse $1",
	INVALIDCOMMAND: "no command $1",
	// cache
	LOADCACHE: "load cache file $1",
	NGLOADCACHE: "no cache file $1",
	SAVECACHE: "save cache file $1",
	NGSAVECACHE: "cannot save cache file $1",
	// user
	USER: "user is $1<$2> ($3)",
	// scan command
	COMMAND: "command $1",
	NGCOMMAND: "cannot parse command $1",
	NOCOMMAND: "no command $1",
	// check file
	CHECKFILE: "check file $1",
	NEWFILE: "find new file $1",
	NOTEDITEDFILE: "not edited file $1",
	NOTCHANGEDFILE: "not changed file $1",
	UPDATEDFILE: "find updated file $1",
	REDEFINETEMPLATE: "redefine template $1",
	NGTEMPLATE: "cannot find template $1",
	// check src
	NOSRC: "cannot find source directory $1",
	NODEST: "cannot create destination directory $1",
	// add dest
	ADDDEST: "register destination $1 from $2",
	MULTISRC: "file $1 has at least two source: $2 and $3",
	// convert file
	SKIPFILE: "skip create file $1",
	CREATEFILE: "create file $1 from $2",
	CREATEFILET: "create file $1 from $2 with $3",
	// delete extra
	DELETEEXTRA: "delete extra file $1",
};

// general
var flagVerbose = false;
var flagHaltOnWarning = false;
var flagSpider = false;
var tagDefault = [];
var messages = messagesC;
function showMessage(type, msg, path, row, col) {
	var str = "";
	if (defined(path)) str += path + ":";
	if (defined(row)) str += (row + 1) + ":";
	if (defined(col)) str += (col + 1) + ":";
	str += type + ": " + msg;
	console.log(str);
}
function callback(code, tag, args) {
	var type = messageTypes[code] || "Unknown Error";
	if (flagVerbose || type === "Error" || type === "Warning" || type === "Message" || type === "Info" || type === "Unknown Error") {
		var msg = StringFormatList(messages[code], args);
		tag = defined(tag) ? tag : {};
		var path = tag.path;
		var row = tag.row;
		var col = tag.col;
		showMessage(type, msg, path, row, col);
	}
	if (type === "Error") {
		process.exit(1);
	} else if (flagHaltOnWarning && type === "Warning") {
		process.exit(2);
	}
}
function mtcallback(code, src, getMsg) {
	var type = mt.getMessageType(code);
	if (flagVerbose || type === "Error" || type === "Warning" || type === "Message" || type === "Info" || type === "Unknown Error") {
		var pos = src.pos;
		var len = src.len;
		var posmap = src.tag;
		var [tag, col] = posmap.get(pos);
		tag = tag || {};
		var path = tag.path;
		var row = tag.row;
		var msg = getMsg();
		showMessage(type, msg, path, row);
	}
	if (type === "Error") {
		process.exit(1);
	} else if (flagHaltOnWarning && type === "Warning") {
		process.exit(2);
	}
}
function loadFile(path, tag, code, code_ng) {
	code = code || "LOADFILE";
	code_ng = code_ng || "NGLOADFILE";
	callback(code, tag, [path]);
	var data = FileReadAllSync(path);
	if (!defined(data)) {
		callback(code_ng, tag, [path]);
	}
	return data;
}
function loadText(path, encoding, tag, code, code_ng) {
	var data = loadFile(path, tag, code, code_ng);
	if (!defined(data)) return;
	var text = data.toString(encoding);
	return text;
}
function saveFile(path, data, tag, code, code_ng) {
	code = code || "SAVEFILE";
	code_ng = code_ng || "NGSAVEFILE";
	callback(code, tag, [path]);
	if (flagSpider) {
		return 1;
	}
	var result = FileWriteAllSync(path, data);
	if (!result) {
		callback(code_ng, tag, [path]);
	}
	return result;
}
function saveText(path, text, encoding, tag, code, code_ng) {
	encoding = encoding || "utf8";
	var data = Buffer.from(text, encoding);
	return saveFile(path, data, tag, code, code_ng);
}
function copyFile(srcpath, destpath, tag, code, code_ng) {
	code = code || "COPYFILE";
	code_ng = code_ng || "NGCOPYFILE";
	callback(code, tag, [srcpath, destpath]);
	if (flagSpider) {
		return 1;
	}
	var result = FileCopySync(srcpath, destpath);
	if (!result) {
		callback(code_ng, tag, [srcpath, destpath]);
	}
	return result;
}
function deleteFile(path, tag, code, code_ng) {
	code = code || "DELETEFILE";
	code_ng = code_ng || "NGDELETEFILE";
	callback(code, tag, [path]);
	if (flagSpider) {
		return true;
	}
	try {
		FS.unlinkSync(path);
		return true;
	} catch(err) {
		callback(code_ng, tag, [path]);
		return;
	}
}

// config
var configFile = "acms_config.txt";
var cacheFile = "acms_cache.dat";
var currentTime = Date.now();
var flagAllowSystem = false;
// default_macros : [macro]
// macro = (text  string) * (posmap : posmap)
var macrosDefault = [];
var userId = 0;
var userName = process.env.USERNAME || process.env.USER || "";
var hostName = process.env.HOSTNAME || process.env.HOST || "";
var currentUserName = userName;
var currentUserEmail = userName + "@" + hostName;
var currentUserDescription = "";
// exclude_rules : [rule]
// rule = (exclude : boolean) * (globs : regex list)
var excludeRules = [];
// template_rules : [rule]
// rule = (name : string) * (path : string)
var templateRules = [];
// afile_rules : [rule]
// rule : (type, pattern, replace, template, argument, info)
var afileRules = [];
var srcDir = "src";
var destDir = "www";
var defaultFile = "index.html";
var flagDeleteExtra = false;

// caches
var currentLoginIndex = 0;
var configfiles = [];
var configafiles = [];
var lmconfigfile;
var lmconfigafile;
// logins = [login : (time, name, email, description)]
var logins = [];
// templates : name -> template : (rpath, file, afile, commands, cache)
var templates = {};
// files = rpath -> file : (lmtime, digest, history, logins, update, checked)
var files = {};
// afiles : rpath -> afile : (cache, info, checked)
// info : (macro, dest, title, description, parent, depend)
var afiles = {};
// src_files : src_file list
// src_file : (file, path, rpath, afile, dests)
// afile : (template, commands, info, default_dest)
var srcfiles = [];
// dest_files : dest_file list
// dest_file : (path, rpath, src_file, dependings : file list, afile)
// afile : (parent, depend, title, description, macros)
var destfiles = [];
// dest_paths = rpath -> dest_file
var destPaths = {};

// commands : name -> command : (lines, eol)
var commands = {};
function cloneCommands(commands) {
	var commands2 = Object.clone(commands);
	return commands2;
}
var mt = MacroText.create({ callback: mtcallback });

function loadConfig(path, tag) {
	var text = loadText(path, "utf8", tag, "LOADCONFIG", "NGLOADCONFIG");
	if (!defined(text)) return;
	configfiles.push(path);

	callback("CONFIG", tag, [path]);
	var re = /([^\x0D\x0A]*)(\x0D\x0A|\x0D|\x0A|$)/g;
	var row = 0;
	var m;
	while (m = re.exec(text)) {
		var line = m[1];
		var eol = m[2];
		var tag = { path: path, row: row };
		loadConfigLine(line, eol, tag);
		row++;
		if (m[0].length === 0) {
			re.lastIndex = m.index + 1;
		}
	}
}
function loadConfigLine(line, eol, tag) {
	if (line === "" || line.match(/^#/)) {
		return;
	}
	callback("CONFIGLINE", tag, [line]);
	var [name, value] = splitNameValue(line);
	if (!defined(name)) {
		callback("INVALIDLINE", tag, [line]);
		return;
	}
	var m;
	if (name === "import_file") {
		loadConfig(value, tag);
	} else if (name === "cache_file") {
		cacheFile = value;
	} else if (name === "allow_system") {
		flagAllowSystem = value ? true : false;
	} else if (m = name.match(/^macro(|_from)$/)) {
		var macro;
		if (m[1] === "_from") {
			var path = value;
			var text = loadText(path, "utf8", tag);
			if (!defined(text)) return;
			configafiles.push(path);
			var posmap = PosMap.newSplitLinesFile(path, text);
			macro = { text: text, posmap: posmap };
		} else {
			var info = newLine(value, eol, tag);
			var [text, posmap] = PosMap.newLine(info);
			macro = { text: text, posmap: posmap };
		}
		macrosDefault.push(macro);
	} else if (name === "user_name") {
		currentUserName = value;
	} else if (name === "user_email") {
		currentUserEmail = value;
	} else if (name === "user_description") {
		currentUserDescription = value;
	} else if (m = name.match(/^(exclude|include)(|_from)$/)) {
		var exclude = m[1] === "exclude";
		var globs;
		if (m[2] === "_from") {
			var path = value;
			var text = loadText(path, "utf8", tag);
			if (!defined(text)) return;
			// no effect
			// configfiles.push(path);
			globs = parseGlobs(text);
		} else {
			globs = splitArray(value);
		}
		var regexs = globs.map(function(glob) {
			return GlobToRegExp(glob);
		});
		var rule = { exclude: exclude, globs: regexs };
		excludeRules.push(rule);
	} else if (name === "template") {
		var values = splitArray(value);
		if (!(values.length >= 2)) {
			callback("INVALIDLINE", tag, [line]);
			return;
		}
		var name = values[0];
		var path = values[1];
		var rule = { name: name, path: path, tag: tag };
		templateRules.push(rule);
	} else if (m = name.match(/^mark_file_(path|name|ext)$/)) {
		var type = m[1];
		var values = splitArray(value);
		if (!(values.length >= 2)) {
			callback("INVALIDLINE", tag, [line]);
			return;
		}
		var pattern = values[0];
		var replace = values[1];
		var template = values[2] || "";
		var argument = values.slice(3);
		var rule = { type: type, pattern: pattern, replace: replace, template: template, argument: argument, info: undefined, eol: eol, tag: tag };
		afileRules.push(rule);
	} else if (name === "src_dir") {
		srcDir = value;
	} else if (name === "dest_dir") {
		destDir = value;
	} else if (name === "default_file") {
		defaultFile = value;
	} else if (name === "delete_extra") {
		flagDeleteExtra = value ? true : 0;
	} else if (name === "set_command") {
		var [name, value] = splitNameValue(value);
		if (!defined(name)) {
			callback("NGCOMMAND", tag, [line]);
			return;
		}
		var lines = splitArray(value);
		var command = { lines: lines, eol: eol, tag: tag };
		commands[name] = command;
	} else {
		callback("INVALIDCOMMAND", tag, [line]);
	}
}

function loadCache(path, tag) {
	var text = loadText(path, "utf8", tag, "LOADCACHE", "NGLOADCACHE");
	if (!defined(text)) return;

	var kvlist = SkvtextParse(text);
	var kvobj = KvlistToObject(kvlist);
	var loginsT = kvobj["logins"];
	if (defined(loginsT)) {
		logins = TSVFParse(loginsT, ["time", "name", "email", "description"]);
		logins.forEach(function(login) {
			login.time = Number(login.time);
		});
	}
	var filesT = kvobj["files"];
	if (defined(files)) {
		files = TSVFKParse(filesT, ["lmtime", "digest", "history"], "path");
		for (var rpath in files) {
			var file = files[rpath];
			file.lmtime = Number(file.lmtime);
		}
	}
	var afilesT = kvobj["afiles"];
	if (defined(afiles)) {
		afiles = TSVFKParse(afilesT, ["cache"], "path");
	}
}
function saveCache(path, tag) {
	var kvlist = [
		"logins", TSVFDump(logins, ["time", "name", "email", "description"]),
		"files", TSVFKDump(files, ["lmtime", "digest", "history"], "path"),
		"afiles", TSVFKDump(afiles, ["cache"], "path"),
	];
	var text = SkvtextDump(kvlist);
	saveText(path, text, "utf8", tag, "SAVECACHE", "NGSAVECACHE");
}

// command text
// $command -> command
// \$escape -> $escape
// $$comment -> 
// $|verbatim -> verbatim
function parseCache(path, text) {
	var lines = [];
	var re = /(\d+):([^\x0D\x0A]*)(\x0D\x0A|\x0D|\x0A|$)/g;
	var m;
	while (m = re.exec(text)) {
		var row = Number(m[1]);
		var line = m[2];
		var eol = m[3];
		var tag = { path: path, row: row };
		lines.push(newLine(line, eol, tag));
		if (m[0].length === 0) {
			re.lastIndex = m.index + 1;
		}
	}
	return lines;
}
function getCache(lines) {
	var text = "";
	lines.forEach(function(info) {
		var line = info.line;
		var eol = info.eol;
		var tag = info.tag;
		var row = tag.row;
		text += row + ":" + line + eol;
	});
	return text;
}
function scanCommandText(path, text, commands) {
	var lines = [];
	var re = /([^\x0D\x0A]*)(\x0D\x0A|\x0D|\x0A|$)/g;
	var row = 0;
	var m;
	while (m = re.exec(text)) {
		var line = m[1];
		var eol = m[2];
		var tag = { path: path, row: row };
		lines.push(newLine(line, eol, tag));
		row++;
		if (m[0].length === 0) {
			re.lastIndex = m.index + 1;
		}
	}
	return scanCommandLines(lines, commands);
}
function scanCommandLines(lines, commands) {
	var infos = [];
	var caches = [];
	var values = [];
	lines.forEach(function(line){
		scanCommandLine(line.line, line.eol, commands, infos, caches, values, line.tag);
	});
	return [infos, caches, values];
}
function scanCommandLine(line, eol, commands, infos, caches, values, tag) {
	var m;
	if (m = line.match(/^\\(\$.*)$/)) {
		line = m[1];
		values.push(newLine(line, eol, tag));
		return;
	}
	if (m = line.match(/^\$\$/)) {
		return;
	}
	if (m = line.match(/^\$\|(.*)$/)) {
		line = m[1];
		line = line.replace(/\$(\$|\/)/g, function(match, s) {
			return s === "\$" ? "\$" : s === "\/" ? eol : s;
		});
		values.push(newLine(line, "", tag));
		return;
	}
	if (!(m = line.match(/^\$(.*)$/))) {
		values.push(newLine(line, eol, tag));
		return;
	}
	callback("COMMAND", tag, [line]);
	caches.push(newLine(line, eol, tag));
	var [name, value] = splitNameValue(m[1]);
	if (!defined(name)) {
		callback("INVALIDLINE", tag, [line]);
		return;
	}
	value = value.replace(/\$(\$|\/)/g, function(match, s) {
		return s === "\$" ? "\$" : s === "\/" ? eol : s;
	});
	var command = commands[name];
	if (defined(command)) {
		var lines = command.lines;
		var eol = command.eol;
		// var tag = command.tag;
		var args = splitArray(value);
		lines.forEach(function(line) {
			var line2 = line.replace(/(\$(\*|[0-9]+))/, function(match, s, c) {
				return (
					c === "*" ? value :
					defined(args[c - 1]) ? args[c - 1] :
					s
				);
			});
			scanCommandLine(line2, eol, commands, infos, [], values, tag);
		});
	} else if (name === "set_command") {
		var [name, value] = splitNameValue(value);
		if (!defined(name)) {
			callback("NGCOMMAND", tag, [line]);
			return;
		}
		var lines = splitArray(value);
		var command = { lines: lines, eol: eol, tag: tag };
		commands[name] = command;
	} else if (name === "macro" || name === "dest" || name === "parent" || name === "depend" || name === "depend_src" || name === "depend_dest" || name === "title" || name === "description") {
		var info = { type: name, line: newLine(value, eol, tag) };
		infos.push(info);
	} else {
		callback("NOCOMMAND", tag, [line]);
	}
}
// var text = FileReadAllSync("src/b.txt.acf");
// var [lines, info, strs] = scanCommand(text, {});
// console.log(strs);
// exit;

function checkFile(rpath, tag) {
	callback("CHECKFILE", tag, [rpath]);
	var data, lmtime, digest, history, update;
	// check update
	var file = files[rpath];
	if (defined(file) && file.checked) {
		// checked
		return [file];
	}

	var lmtimeC = FS.statSync(rpath).mtimeMs;
	if (defined(file)) {
		lmtime = file.lmtime;
		digest = file.digest;
		history = file.history;
		
		if (lmtimeC > lmtime) {
			lmtime = lmtimeC;
			data = loadFile(rpath, tag);
			if (!defined(data)) return [];

			var digestC = calcMd5Base64(data);
			if (digestC !== digest) {
				digest = digestC;
				update = true;
				callback("UPDATEDFILE", tag, [rpath]);
			} else {
				update = false;
				callback("NOTCHANGEDFILE", tag, [rpath]);
			}
		} else {
			update = false;
			callback("NOTEDITEDFILE", tag, [rpath]);
		}
	} else {
		history = "";
		update = true;
		callback("NEWFILE", tag, [rpath]);
	}
	
	// update file
	if (update) {
		lmtime = lmtimeC;
		if (!defined(digest)) {
			data = loadFile(rpath, tag);
			if (!defined(data)) return [];

			digest = calcMd5Base64(data);
		}
		history += (history === "" ? "" : ",") + String(currentLoginIndex);
	}

	var logins2 = history.split(",").map(Number).map(function(i) {
		return logins[i];
	}).filter(defined);
	var file = { lmtime: lmtime, digest: digest, history: history, logins: logins2, update: update, checked: true };
	files[rpath] = file;
	return [file, data];
}
function checkAFile(rpath, file, data, commands, tag) {
	var afile = afiles[rpath];
	if (defined(afile)) {
		if (afile.checked) {
			// checked
			return afile;
		}
		var update = file.update
		if (!update) {
			// not update
			var cache = afile.cache;
			var lines = parseCache(rpath, cache);
			var [info] = scanCommandLines(lines, commands);
			var afile = { cache: cache, info: info, checked: true };
			afiles[rpath] = afile;
			return afile;
		}
	}

	if (!defined(data)) {
		data = loadFile(rpath, tag);
		if (!defined(data)) return;
	}
	var text = data.toString("utf8");

	// check afile
	var [info, caches] = scanCommandText(rpath, text, commands);
	var cache = getCache(caches);
	var afile = { cache: cache, info: info, checked: true };
	afiles[rpath] = afile;
	return afile;
}
function checkFileAFile(rpath, commands, tag) {
	var [file, data] = checkFile(rpath, tag);
	if (!defined(file)) {
		return [];
	}
	var afile = checkAFile(rpath, file, data, commands);
	if (!defined(afile)) {
		return [file];
	}
	return [file, afile];
}
function getLmfile(a, b) {
	return (
		!defined(a) ? b :
		!defined(b) ? a :
		b.mtime > a.mtime ? b :
		a
	);
}

function checkConfigFiles() {
	configfiles.forEach(function(path) {
		var [file] = checkFile(path);
		if (!defined(file)) return;
		lmconfigfile = getLmfile(lmconfigfile, file);
	});
	configafiles.forEach(function(path) {
		var [file] = checkFile(path);
		if (!defined(file)) return;
		lmconfigafile = getLmfile(lmconfigafile, file);
	});
}
function checkTemplateRule(rule) {
	var name = rule.name;
	var rpath = rule.path;
	var tag = rule.tag;
	var commands2 = cloneCommands(commands);
	var [file, afile] = checkFileAFile(rpath, commands2, tag);
	if (!defined(afile)) {
		callback("REDEFINETEMPLATE", tag, [name]);
		return;
	}
	var template = { rpath: rpath, file: file, afile: afile, info: afile.info, commands: commands2, cache: undefined };
	templates[name] = template;
	return template;
}
function checkTemplateRules() {
	templateRules.forEach(function(rule) {
		checkTemplateRule(rule);
	});
}
function checkAFileRule(rule) {
	var templateName = rule.template;
	var linesArgument = rule.argument;
	var eol = rule.eol;
	var tag = rule.tag;
	var template = templates[templateName];
	if (!defined(template) && templateName !== "") {
		callback("NGTEMPLATE", tag, [templateName]);
	}
	// check argument
	var commands2 = defined(template) ? template.commands : commands;
	commands2 = cloneCommands(commands2);
	var lines = linesArgument.map(function(line) {
		return newLine(line, eol, tag);
	});
	var [argumentInfo] = scanCommandLines(lines, commands);
	var info = { template: template, argumentInfo: argumentInfo, commands: commands2 };
	return info;
}
function checkAFileRules() {
	afileRules.forEach(function(rule) {
		var info = checkAFileRule(rule);
		rule.info = info;
	});
}
function judgeExclude(fileName, defaultValue) {
	return excludeRules.reduce(function(v, rule) {
		return (
			!(v ^ rule.exclude) ? v :
			(v ^ rule.globs.some(function(regex) { return regex.test(fileName) }))
		);
	}, defaultValue);
}
function judgeAFile(path) {
	var { dir: fileroot, base: filename, name: filename2, ext: fileext } = Path.parse(path);
	for (var i = 0; i < afileRules.length; i++) {
		var rule = afileRules[i]
		var type = rule.type;
		var pattern = rule.pattern;
		var replace = rule.replace;
		var info = rule.info;
		var path;
		var m;
		if (type === "path") {
			rule.regex = rule.regex || GlobToRegExp(pattern, true);
			var regex = rule.regex;
			if (!(m = path.match(regex))) {
				continue;
			}
			path = StringFormatList(replace, [m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9]]);
		} else if (type === "name") {
			rule.regex = rule.regex || GlobToRegExp(pattern, true);
			var regex = rule.regex;
			if (!(m = filename.match(regex))) {
				continue;
			}
			var name = StringFormatList(replace, [m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9]]);
			path = Path.join(fileroot, name);
		} else if (type === "ext") {
			if (!(fileext === pattern)) {
				continue;
			}
			var name = filename2 + replace;
			path = Path.join(fileroot, name);
		}
		if (defined(path)) {
			return [info, path];
		}
	}
	return [];
}
function checkSrcDirFile(rpath, tag) {
	var [file, data] = checkFile(rpath, tag);
	if (!defined(file)) {
		return;
	}
	var path = Path.relative(srcDir, rpath);
	var srcafile = checkSrcDirAFile(rpath, path, file, data);
	var srcfile = { file: file, path: path, rpath: rpath, afile: srcafile, dests: undefined };
	srcfiles.push(srcfile);
	return srcfile;
}
function checkSrcDirAFile(rpath, path, file, data) {
	var [afileInfo, destDefault] = judgeAFile(path);
	if (!defined(afileInfo)) {
		// general file
		return;
	}

	var template = afileInfo.template;
	var templateInfo = defined(template) ? template.info : undefined;
	var argumentInfo = afileInfo.argumentInfo;
	var commands = afileInfo.commands;

	var commands2 = cloneCommands(commands);
	// check afile
	var afile = checkAFile(rpath, file, data, commands2);
	if (!defined(afile)) return;
	var srcInfo = afile.info;
	var srcafile = { template: template, commands: commands2, templateInfo: templateInfo, argumentInfo: argumentInfo, srcInfo: srcInfo, destDefault: destDefault };
	return srcafile;
}
function checkSrcDir(rpath, tag) {
	var files = DirectoryReadAllSync(rpath);
	files.forEach(function(file) {
		if (judgeExclude(file)) {
			return;
		}
		var rpath2 = Path.join(rpath, file);
		if (FS.statSync(rpath2).isDirectory()) {
			checkSrcDir(rpath2, tag);
		} else if (FS.statSync(rpath2).isFile()) {
			checkSrcDirFile(rpath2, tag);
		}
	});
}

// macrotext
var rmacro_load_text = {
	name: "load_text",
	func: function(pathA) {
		var path = this.evaluateAsString(pathA);
		var text = loadText(path);
		return text;
	}
};
var rmacro_get_rel_path = {
	name: "get_rel_path",
	func: function(baseA, pathA) {
		var base = this.evaluateAsString(baseA);
		var path = this.evaluateAsString(pathA);
		var root = Path.dirname(base);
		var path2 = Path.relative(root, path);
		return path2;
	}
};
var rmacro_normalize_path = {
	name: "normalize_path",
	func: function(pathA) {
		var path = this.evaluateAsString(pathA);
		return normalizePath(path);
	}
};
var rmacro_combine_url = {
	name: "combine_url",
	func: function(pathA, baseA) {
		var path = this.evaluateAsString(pathA);
		var base = defined(baseA) ? this.evaluateAsString(baseA) : undefined;
		var url = new URL.URL(path, base);
		return url.href;
	}
};
var rmacro_normalize_url = {
	name: "normalize_url",
	func: function(urlA) {
		var urlS = this.evaluateAsString(urlA);
		var url = new URL.URL(urlS);
		url.pathname = normalizePath(url.pathname);
		return url.href;
	}
};
function initializeMacroText() {
	if (flagAllowSystem) {
		mt.import("system");
		mt.addRMacro(rmacro_load_text);
	}
	mt.addRMacro(rmacro_get_rel_path, rmacro_normalize_path);
	mt.addRMacro(rmacro_combine_url, rmacro_normalize_url);
	macrosDefault.forEach(function(info) {
		var text = info.text;
		var posmap = info.posmap;
		mtExec(mt, text, posmap, false);
	});
}
function mtExec(mt, text, posmap, saveState) {
	var mtstate;
	if (saveState) {
		mtstate = mt.saveMacros();
	}
	var node = mt.parse(text, posmap);
	var value = mt.evaluate(node);
	if (saveState) {
		mt.restoreMacros(mtstate)
	}
	return value;
}
function mtExtendLineString(mt, line, saveState) {
	var [text, posmap] = PosMap.newLine(line);
	var value = mtExec(mt, text, posmap, saveState);
	return mt.getString(value);
}
function mtExtendLinesString(mt, lines, saveState) {
	var [text, posmap] = PosMap.newLines(lines);
	var value = mtExec(mt, text, posmap, saveState);
	return mt.getString(value);
}
function mtExtendLineStringList(mt, line, saveState) {
	var [text, posmap] = PosMap.newLine(line);
	var value = mtExec(mt, text, posmap, saveState);
	return mt.getStringList(value);
}

function getDefaultParent(path) {
	if (path === defaultFile) {
		return "";
	}
	var { dir: root, base: name } = Path.parse(path);
	if (name === defaultFile) {
		return Path.join(root, "..", defaultFile);
	}
	return Path.join(root, defaultFile);
}
function addDestFile(path, srcfile, tag) {
	var rpath = Path.join(destDir, path);
	var srcrpath = srcfile.rpath;
	var destfile = { path: path, rpath: rpath, srcfile: srcfile, file: undefined, afile: undefined };
	var destfile2 = destPaths[rpath];
	if (defined(destfile2)) {
		var srcfile2 = destfile2.srcfile;
		var srcrpath2 = srcfile2.rpath;
		if (srcrpath !== srcrpath2) {
			callback("MULTISRC", tag, [path, srcrpath, srcrpath2]);
		}
	} else {
		callback("ADDDEST", tag, [path, srcrpath]);
	}
	destPaths[rpath] = destfile;
	destfiles.push(destfile);
	return destfile;
}
function checkSrc(srcfile, tag) {
	var file = srcfile.file;
	var path = srcfile.path;
	var rpath = srcfile.rpath;
	var afile = srcfile.afile;

	if (!defined(afile)) {
		var destfile = addDestFile(path, srcfile, tag);
		return [destfile];
	}

	var history = file.logins;
	var create = history[0];
	var modify = history[history.length - 1];
	var ctime = create.time;
	var cuser = create.user;
	var mtime = modify.time;
	var muser = modify.user;

	// afile
	var templateInfo = afile.templateInfo;
	var argumentInfo = afile.argumentInfo;
	var srcInfo = afile.srcInfo;
	var destDefault = afile.destDefault;
	var infos = [].concat(defined(templateInfo) ? templateInfo : [], argumentInfo, srcInfo);
	var macroInfos = infos.filter(function(info) { return info.type === "macro"; }).map(function(info) { return info.line; });
	var destInfos = infos.filter(function(info) { return info.type === "dest"; }).map(function(info) { return info.line; });
	var titleInfos = infos.filter(function(info) { return info.type === "title"; }).map(function(info) { return info.line; });
	var titleInfo = titleInfos[0];
	var descriptionInfos = infos.filter(function(info) { return info.type === "description"; }).map(function(info) { return info.line; });
	var parentInfos = infos.filter(function(info) { return info.type === "parent"; }).map(function(info) { return info.line; });
	var parentInfo = parentInfos[0];
	var dependInfos = infos.filter(function(info) { return info.type === "depend"; }).map(function(info) { return info.line; });

	var mtstate = mt.saveMacros();
	mt.addMacro("src_file", path);
	mt.addMacro("src_ctime", new Date(ctime));
	mt.addMacro("src_ctimev", ctime);
	mt.addMacro("src_mtime", new Date(mtime));
	mt.addMacro("src_mtimev", mtime);
	mt.addMacro("src_muser", muser);
	mt.addMacro("default_dest", destDefault);

	// get macro
	macroInfos.forEach(function(info) {
		var line = info.line;
		var posmap = PosMap.newLine(info);
		mtExec(mt, line, posmap, false);
	});
	
	// get dest
	var m;
	var dests = destInfos.mapA(function(info) {
		return mtExtendLineStringList(mt, info, true );
	});
	dests = dests.filter(function(dest) { return dest !== "" });
	dests = (
		dests.length === 0 ? [destDefault] :
		dests.map(function(dest) {
			return (
				dest === "?" ? undefined :
				(m = dest.match(/^\/(.*?)$/)) ? m[1] :
				PathCombine(path, dest)
			);
		})
	);
	dests = dests.filter(defined);
	var destfiles = dests.map(function(dest) {
		return addDestFile(dest, srcfile, tag);
	});
	
	// check dests
	destfiles.forEach(function(destfile) {
		var destpath = destfile.path;
		var mtstate = mt.saveMacros();
		mt.addMacro("file", destpath);
		var title = defined(titleInfo) ? mtExtendLineString(mt, titleInfo, true) : "";
		mt.addMacro("title", title);
		var description = mtExtendLinesString(mt, descriptionInfos, true);
		mt.addMacro("description", description);
		var parentDefault = getDefaultParent(destpath);
		mt.addMacro("default_parent", parentDefault);
		var parent = defined(parentInfo) ? mtExtendLineString(mt, parentInfo, true) : "";
		parent = (
			parent === "" ? parentDefault :
			parent === "?" ? "" :
			(m = parent.match(/^\/(.*?)$/)) ? m[1] :
			PathCombine(path, parent)
		);
		mt.addMacro("parent", parent);
		var depends = dependInfos.mapA(function(dependInfo) {
			return mtExtendLineStringList(mt, dependInfo, true);
		});

		var mtstate2 = mt.saveMacros();
		var destafile = { parent: parent, depends: depends, title: title, description: description, state: mtstate2 };
		mt.restoreMacros(mtstate);
		destfile.afile = destafile;
	});
	mt.restoreMacros(mtstate);
	return destfiles;
}
function checkSrcs(tag) {
	srcfiles.forEach(function(srcfile) {
		var destfiles = checkSrc(srcfile, tag);
		srcfile.dests = destfiles;
	});
}

function checkDest(destfile, tag) {
	var destpath = destfile.path;
	var destrpath = destfile.rpath;
	var srcfile = destfile.srcfile;
	var srcrpath = srcfile.rpath;
	var fileSrc = srcfile.file;
	var afile = destfile.afile;

	var lmfile = fileSrc;
	lmfile = getLmfile(lmfile, lmconfigfile);
	if (defined(afile)) {
		lmfile = getLmfile(lmfile, lmconfigafile);
		var srcafile = srcfile.afile;
		var template = srcafile.template;
		if (defined(template)) {
			lmfile = getLmfile(lmfile, template.file);
		}
	}
	var depends = defined(afile) ? afile.depends : [];
	var dependsSrc = depends;
	var dependsDest = depends;
	var m;
	var regexsSrc = dependsSrc.map(function(depend) {
		var path = (m = depend.match(/^\/(.*?)$/)) ? m[1] : PathCombine(srcrpath, depend);
		return GlobToRegExp(path);
	});
	var regexsDest = dependsDest.map(function(depend) {
		var path = (m = depend.match(/^\/(.*?)$/)) ? m[1] : PathCombine(destpath, depend);
		return GlobToRegExp(path);
	});
	var dependings = [fileSrc];
	if (regexsSrc.length > 0) {
		for (var path in files) {
			var file = files[path];
			if (regexsSrc.some(function(regex) { return regex.test(path) })) {
				dependings.push(file);
			}
		}
	}
	if (regexsDest.length > 0) {
		destfiles.forEach(function(destfile) {
			var path = destfile.path;
			var srcfile = destfile.srcfile;
			var file = srcfile.file;
			if (regexsDest.some(function(regex) { return regex.test(path) })) {
				dependings.push(file);
			}
		});
	}
	var update = dependings.some(function(file) {
		return file.update;
	});
	var lmtime = Math.max.apply(null, dependings.map(function(file) {
		return file.lmtime;
	}));
	var history = [];
	var loginsSet = {};
	dependings.forEach(function(file) {
		file.logins.forEach(function(login) {
			var time = login.time;
			if (!loginsSet[time]) {
				history.push(login);
				loginsSet[time] = true;
			}
		});
	});
	history.sort(function(a, b) {
		return b.time - a.time;
	});
	destfile.dependings = dependings;
	destfile.update = update;
	destfile.lmtime = lmtime;
	destfile.history = history;
}
function checkDests(tag) {
	destfiles.forEach(function(destfile) {
		checkDest(destfile);
	});
}

var filesInfo, afilesInfo;
function convertFiles(tag) {
	filesInfo = {};
	destfiles.forEach(function(destfile) {
		var path = destfile.path;
		var fileSrc = destfile.srcfile.file;
		var historySrc = fileSrc.logins;
		var history = destfile.history;
		var create = historySrc[0];
		var modify = history[history.length - 1];
		var ctime = create.time;
		var cuser = create.user;
		var mtime = modify.time;
		var muser = modify.user;
		var info = { ctime: new Date(ctime), ctimev: ctime, mtime: new Date(mtime), mtimev: mtime, muser: muser };
		filesInfo[path] = info;
	});
	afilesInfo = {};
	destfiles.forEach(function(destfile) {
		var path = destfile.path;
		var afile = destfile.afile;
		if (!defined(afile)) return;
		var info = { parent: afile.parent, title: afile.title, description: afile.description };
		afilesInfo[path] = info;
	});
	
	srcfiles.forEach(function(srcfile) {
		var srcafile = srcfile.afile;
		if (!defined(srcafile)) {
			convertFile(srcfile, tag);
		} else {
			convertAFile(srcfile, tag);
		}
	});
}
function convertFile(srcfile, tag) {
	var srcrpath = srcfile.rpath;
	var destfiles = srcfile.dests;

	destfiles.forEach(function(destfile) {
		var destrpath = destfile.rpath;
		var update = destfile.update;
		var lmtime = destfile.lmtime;

		if (!update && FS.existsSync(destrpath) && lmtime > FS.statSync(destrpath).mtimeMs) {
			callback("SKIPFILE", tag, [destrpath, srcrpath]);
			return;
		}
		callback("CREATEFILE", tag, [destrpath, srcrpath]);
		copyFile(srcrpath, destrpath, tag);
		FS.utimesSync(destrpath, new Date(lmtime), new Date(lmtime));
	});
}
function convertAFile(srcfile, tag) {
	var srcrpath = srcfile.rpath;
	var destfiles = srcfile.dests;
	var srcafile = srcfile.afile;
	var template = srcafile.template;
	var templaterpath = defined(template) ? template.rpath : undefined;
	var textSrc, posmapSrc, nodeSrc;
	function getSrc() {
		var text = loadText(srcrpath, "utf8", tag);
		if (!defined(text)) return;
		var commands = srcafile.commands;
		var [info, caches, values] = scanCommandText(srcrpath, text, commands);
		[textSrc, posmapSrc] = PosMap.newLines(values);
		nodeSrc = mt.parse(textSrc, posmapSrc);
		return true;
	}
	var nodeTemplate;
	function getTemplate() {
		nodeTemplate = template.cache;
		if (defined(nodeTemplate)) {
			return true;
		}
		var text = loadText(templaterpath, "utf8", tag);
		if (!defined(text)) return;
		var commands2 = cloneCommands(commands);
		var [info, caches, values] = scanCommandText(templaterpath, text, commands2);
		var [textTemplate, posmapTemplate] = PosMap.newLines(values);
		nodeTemplate = mt.parse(textTemplate, posmapTemplate);
		return true;
	}

	destfiles.forEach(function(destfile) {
		var destrpath = destfile.rpath;
		var update = destfile.update;
		var lmtime = destfile.lmtime;
		if (!update && FS.existsSync(destrpath) && lmtime >= FS.statSync(destrpath).mtimeMs) {
			callback("SKIPFILE", tag, [destrpath, srcrpath]);
			return;
		}
		if (defined(template)) {
			callback("CREATEFILET", tag, [destrpath, srcrpath, templaterpath]);
		} else {
			callback("CREATEFILE", tag, [destrpath, srcrpath]);
		}

		// text
		if (defined(template)) {
			if (!defined(nodeTemplate)) {
				if (!getTemplate()) {
					return;
				}
			}
		}
		if (!defined(nodeSrc)) {
			if (!getSrc()) {
				return;
			}
		}

		var destafile = destfile.afile;
		var parent = destafile.parent;
		var title = destafile.title;
		var description = destafile.description;
		var fileSrc = destfile.srcfile.file;
		var historySrc = fileSrc.logins;
		var history = destfile.history;
		var create = historySrc[0];
		var modify = history[history.length - 1];
		var ctime = create.time;
		var cuser = create.user;
		var mtime = modify.time;
		var muser = modify.user;

		var mtstate = destafile.state;
		// macros
		mt.restoreMacros(mtstate);
		mt.addMacro("files_info", filesInfo);
		mt.addMacro("afiles_info", afilesInfo);
		mt.addMacro("ctime", new Date(ctime));
		mt.addMacro("ctimev", ctime);
		mt.addMacro("mtime", new Date(mtime));
		mt.addMacro("mtimev", mtime);
		mt.addMacro("muser", muser);

		// node
		var node;
		if (defined(nodeTemplate)) {
			mt.addMacro("article", nodeSrc);
			mt.addMacro("article_text", textSrc);
			node = nodeTemplate;
		} else {
			node = nodeSrc;
		}

		// extend macro
		var text = mt.evaluateAsString(node);

		saveText(destrpath, text, "utf8", tag);
		FS.utimesSync(destrpath, new Date(lmtime), new Date(lmtime));
	});
}

function deleteExtra(rpath, tag) {
	rpath = rpath || destDir;
	var files = DirectoryReadAllSync(rpath);
	files.forEach(function(file) {
		var filerpath = Path.join(rpath, file);
		if (FS.statSync(filerpath).isDirectory()) {
			deleteExtra(filerpath);
		} else {
			var registered = defined(destPaths[filerpath]);
			if (!registered) {
				callback("DELETEEXTRA", tag, [filerpath]);
				deleteFile(filerpath, tag);
			}
		}
	});
	if (DirectoryReadAllSync(rpath).length == 0) {
		FS.rmdirSync(rpath);
	}
}

(function runCMS() {
	var getopt = Getopt.create([
		["v", "verbose"],
		["", "Werror"],
		["", "spider"],
	]);
	var { argv: argv, options: options } = getopt.parseSystem();
	flagVerbose = options.verbose;
	flagHaltOnWarning = options.Werror;
	flagSpider = options.spider;
	var arg0 = argv.shift();

	if (defined(arg0)) {
		configFile = arg0;
	}
	loadConfig(configFile);
	if (!(FS.existsSync(srcDir) && FS.statSync(srcDir).isDirectory())) {
		callback("NOSRC", undefined, srcDir);
	}
	FileMakePathSync(destDir);
	if (!(FS.existsSync(destDir) && FS.statSync(destDir).isDirectory())) {
		callback("NODEST", undefined, destDir);
	}

	loadCache(cacheFile);

	callback("USER", undefined, [currentUserName, currentUserEmail, currentUserDescription]);
	var login = { time: currentTime, name: currentUserName, email: currentUserEmail, description: currentUserDescription };
	logins.push(login);
	currentLoginIndex = logins.length - 1;
	logins.forEach(function(login) {
		login.user = { name: login.name, email: login.email, description: login.description };
	});
	
	initializeMacroText();
	checkConfigFiles();
	checkTemplateRules();
	checkAFileRules();
	checkSrcDir(srcDir);

	saveCache(cacheFile);

	checkSrcs();

	checkDests();

	convertFiles();

	if (flagDeleteExtra) {
		deleteExtra(destDir);
	}
})();

})(Function("return this")());
