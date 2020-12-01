
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

// modify at mark
var es = document.getElementsByClassName("fa-at");
es = Array.from(es);
es.forEach(function(e) {
	e.outerHTML = "@";
});

// navigation
var ePathDirectory = document.getElementById("path-directory");
var pathDirectory = ePathDirectory.textContent;
var url = pathDirectory;
var xhr = new XMLHttpRequest();
xhr.addEventListener("load", function(event) {
	var text = xhr.responseText;
	var items = JSON.parse(text);
	for (var path in items) {
		var item = items[path];
		item.children = [];
	}
	for (var path in items) {
		var item = items[path];
		var parent = items[item.parent];
		if (defined(parent)) {
			parent.children.push(path);
		}
	}
	console.log(items);
	var eNav = document.getElementById("main-nav2");
	var eNavInfo = document.getElementById("main-nav-info");
	var parents = eNavInfo.textContent.split(" > ");
	parents.forEach(function(path) {
		var item = items[path];
		DomCreateElement(document, eNav, "a", { text: item.title || path, href: path, description: item.description });
		if (items[path].children.length > 0) {
			DomCreateText(document, eNav, " ");
			var e = DomCreateElement(document, eNav, "a", { text: ">", href: "javascript:void(0);" });
			e.addEventListener("click", function(event) {
				var children = item.children;
				var block = DomCreateElement(document, eNav, "div", { text: "aaaa", style: { display: "inline-block", position: "absolute", left: event.x, top: event.y } });
			});
			DomCreateText(document, eNav, " ");
		}
	});
});
xhr.open("GET", url);
xhr.send();
