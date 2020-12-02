
// library
function defined(obj) {
	return obj !== undefined;
}
function DomClearChildren(element) {
	var range = document.createRange();
	range.selectNodeContents(element);
	range.deleteContents();
}
function DomCreateElement(document, parent, tagName, attributes) {
	attributes = attributes || {};
	var element = document.createElement(tagName);
	for (var key in attributes) {
		var value = attributes[key];
		if (key == "text") {
			element.appendChild(document.createTextNode(value));
		} else if (key == "style") {
			for (var key2 in value) {
				var value2 = value[key2];
				element.style.setProperty(key2, value2);
			}
		} else {
			element.setAttribute(key, value);
		}
	}
	if (parent !== undefined && parent !== null) {
		parent.appendChild(element);
	}
	return element;
}
function DomCreateText(document, parent, text) {
	var node = document.createTextNode(text);
	if (parent !== undefined && parent !== null) {
		parent.appendChild(node);
	}
	return node;
}
var Path = {};
Path.dirname = function(path) {
	var ns = path.split("/");
	var filename = ns.pop();
	var path2 = ns.length == 0 ? "." : ns.join("/");
	return path2;
};
Path.relative = function(from, to) {
	var ns1 = from == "." ? [] : from.split("/");
	var ns2 = to == "." ? [] : to.split("/");
	var c = ns1.length;
	for (var i = 0; i < ns1.length; i++) {
		if (!(i < ns2.length) || ns1[i] !== ns2[i]) {
			c = i;
			break;
		}
	}
	var ns = [];
	for (var i = c; i < ns1.length; i++) {
		ns.push("..");
	}
	for (var i = c; i < ns2.length; i++) {
		ns.push(ns2[i]);
	}
	var path = ns.join("/");
	return path;
};
Path.parse = function(path) {
	var ns = path.split("/");
	var filename = ns.pop();
	var dirname = ns.length == 0 ? "." : ns.join("/");
	return { dir: dirname, base: filename };
};
Path.join = function(path1, path2) {
	if (path2 == ".") {
		path2 = "";
	}
	var path = path1 + "/" + path2;
	return path;
}

// modify at mark
var es = document.getElementsByClassName("fa-at");
es = Array.from(es);
es.forEach(function(e) {
	e.outerHTML = "@";
});

// navigation
var defaultFile = "index.html";
function getRelPath(base, path) {
	var root = Path.dirname(base);
	var path2 = Path.relative(root, path);
	// console.log(base, root, path, path2);
	return path2;
}
function normalizePath(path) {
	var r = Path.parse(path);
	var dir = r.dir;
	var name = r.base;
	if (name === defaultFile) {
		path = Path.join(dir, ".");
	}
	return path;
}
var items = window.directoryInfoItems;
for (var path in items) {
	var item = items[path];
	item.path = path;
	item.children = [];
}
for (var path in items) {
	var item = items[path];
	var parent = items[item.parent];
	if (defined(parent)) {
		parent.children.push(path);
	}
}
// console.log(items);
var eNav = document.getElementById("main-nav");
var eNavInfo = document.getElementById("main-nav-info");
var parents = eNavInfo.textContent.split(" > ");
var pathRoot = parents[parents.length - 1];
function setupItem(e, item) {
	e.style.display = "inline-block";
	// e.style.position = "relative";
	var pathParent = item.path;
	var eA = DomCreateElement(document, e, "span", { text: ">" });
	eA.addEventListener("click", function(event) {
		var children = item.children;
		// var eMenu = DomCreateElement(document, e, "ul", { class: "menu", style: { display: "inline-block", position: "absolute", left: event.offsetX, top: event.offsetY } });
		var eMenu = DomCreateElement(document, eNavMenus, "ul", { class: "menu", style: { display: "inline-block", position: "absolute", left: event.x, top: event.y } });
		children.forEach(function(path) {
			var item = items[path];
			var title = item.title || normalizePath(getRelPath(pathParent, path));
			var url = normalizePath(getRelPath(pathRoot, path));
			var eItem = DomCreateElement(document, eMenu, "li");
			DomCreateElement(document, eItem, "a", { text: title, href: url, description: item.description });
			if (item.children.length > 0) {
				DomCreateText(document, eItem, " ");
				var e = DomCreateElement(document, eItem, "div");
				setupItem(e, item);
			}
		});
	});
}
DomClearChildren(eNav);
for (var i = 0; i < parents.length; i++) {
	var pathParent = i > 0 ? parents[i - 1] : "";
	var path = parents[i];
	var item = items[path];
	var title = item.title || normalizePath(getRelPath(pathParent, path));
	var url = normalizePath(getRelPath(pathRoot, path));
	DomCreateElement(document, eNav, "a", { text: title, href: url, description: item.description });
	if (item.children.length > 0) {
		DomCreateText(document, eNav, " ");
		var e = DomCreateElement(document, eNav, "div");
		setupItem(e, item);
		DomCreateText(document, eNav, " ");
	}
}
var eNavMenus = DomCreateElement(document, eNav, "div");
document.addEventListener("click", function(event) {
	var e = event.target;
	var b = e.matches("#main-nav *");
	if (!b) {
		DomClearChildren(eNavMenus);
	}
});
