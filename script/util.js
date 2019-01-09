
"use strict";

// object
function defined(obj) {
	return obj !== undefined;
}

// map
// (key -> [key]) -> key -> [key]
function MapGetDescendants(map, key, includeSelf) {
	var descendants = [];
	var stack = [];
	function pushStack(list) {
		Array.prototype.push.apply(stack, list);
	}
	var checked = {};
	if (includeSelf) {
		descendants.push(key);
		checked[key] = true;
	}
	var childs = map[key];
	if (defined(childs)) pushStack(childs.reverse());
	while (defined(key = stack.pop())) {
		if (checked[key]) continue;
		descendants.push(key);
		checked[key] = true;
		childs = map[key];
		if (defined(childs)) pushStack(childs.reverse());
	}
	return descendants;
}
// (key -> [key]) -> (key -> [key])
function MapGetDescendantsAll(map, includeSelf) {
	var map2 = {};
	for (var key in map) {
		map2[key] = MapGetDescendants(map, key, includeSelf);
	}
	return map2;
}
// (key -> key) -> key -> [key]
function MapGetAncestors(map, key, includeSelf) {
	var ancestors = [];
	var checked = {};
	if (includeSelf) {
		ancestors.push(key);
		checked[key] = true;
	}
	key = map[key];
	while (defined(key) && !checked[key]) {
		ancestors.push(key);
		checked[key] = true;
		key = map[key];
	}
	return ancestors;
}
// (key -> key) -> (key -> [key])
function MapGetAncestorsAll(map, includeSelf) {
	var map2 = {};
	for (var key in map) {
		map2[key] = MapGetAncestors(map, key, includeSelf);
	}
	return map2;
}
Object.getDescendants = MapGetDescendants;
Object.getDescendantsAll = MapGetDescendantsAll;
Object.getAncestors = MapGetAncestors;
Object.getAncestorsAll = MapGetAncestorsAll;
