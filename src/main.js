
// modify at mark
document.addEventListener("DOMContentLoaded", function(event) {
	var es = document.getElementsByClassName("fa-at");
	es = Array.from(es);
	es.forEach(function(e) {
		e.outerHTML = "@";
	});
});
