
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
var items = window.directoryInfoItems;
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
// console.log(items);
var eNav = document.getElementById("main-nav");
var eNavInfo = document.getElementById("main-nav-info");
var parents = eNavInfo.textContent.split(" > ");
function setupItem(e, item) {
	e.style.display = "inline-block";
	// e.style.position = "relative";
	var eA = DomCreateElement(document, e, "a", { text: ">", href: "javascript:void(0);" });
	eA.addEventListener("click", function(event) {
		var children = item.children;
		// var eMenu = DomCreateElement(document, e, "ul", { class: "menu", style: { display: "inline-block", position: "absolute", left: event.offsetX, top: event.offsetY } });
		var eMenu = DomCreateElement(document, eNav, "ul", { class: "menu", style: { display: "inline-block", position: "absolute", left: event.x, top: event.y } });
		children.forEach(function(path) {
			var item = items[path];
			var eItem = DomCreateElement(document, eMenu, "li");
			DomCreateElement(document, eItem, "a", { text: item.title || path, href: path, description: item.description });
			if (item.children.length > 0) {
				DomCreateText(document, eItem, " ");
				var e = DomCreateElement(document, eItem, "div");
				setupItem(e, item);
			}
		});
	});
}
function setupNav() {
	DomClearChildren(eNav);
	parents.forEach(function(path) {
		var item = items[path];
		DomCreateElement(document, eNav, "a", { text: item.title || path, href: path, description: item.description });
		if (item.children.length > 0) {
			DomCreateText(document, eNav, " ");
			var e = DomCreateElement(document, eNav, "div");
			setupItem(e, item);
			DomCreateText(document, eNav, " ");
		}
	});
}
document.addEventListener("click", function(event) {
	var e = event.target;
	var b = e.matches("#main-nav *");
	if (!b) {
		setupNav();
	}
});
setupNav();
