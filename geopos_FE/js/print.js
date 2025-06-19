var page = require('webpage').create();
var system = require('system');
var address = system.args[1];
var output = system.args[2];
var auslegung = system.args[3];
var format = system.args[4];
var width = system.args[5];
var height = system.args[6];


//interchange if width is equal to height
if(auslegung === 'quer')
{
    page.paperSize = {  format: format,  orientation: 'landscape', margin: { top : 0, left : 0, right : 0, bottom : 0 } };
    page.viewportSize = { width: width, height: height };
}
else
{
    page.paperSize = {  format: format,  orientation: 'portrait', margin: { top : 0, left : 0, right : 0, bottom : 0 } };
    page.viewportSize = { width: width, height: height };
}

/*
console.log("format: "+page.paperSize.format);
console.log("orient: "+page.paperSize.orientation);
console.log("margin: "+page.paperSize.margin.top+","+page.paperSize.margin.left);

console.log(page.viewportSize.width);
console.log(page.viewportSize.height);
*/

//landscape
page.open(address, function (status) {
	if (status !== 'success') {
		console.log('Unable to load the address!');
		phantom.exit(1);
	} else {
		window.setTimeout(function () {
			page.render(output);
			phantom.exit();
		}, 200);
	}
});

