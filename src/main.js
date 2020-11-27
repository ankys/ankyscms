
// library
function defined(obj) {
	return obj !== undefined;
}

// modify at mark
var es = document.getElementsByClassName("fa-at");
es = Array.from(es);
es.forEach(function(e) {
	e.outerHTML = "@";
});

// navigation
var url = "directory.txt";
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
			parent.children.push(item);
		}
	}
	console.log(items);
	var eNav = document.getElementById("main-nav");
	var eNavInfo = document.getElementById("main-nav-info");
	var parents = eNavInfo.textContent.split(">");
	parents.forEach(function(path) {
		console.log(items[path].title);
		if (items[path].children.length > 0) {
			console.log(">");
		}
	});
});
xhr.open("GET", url);
xhr.send();
