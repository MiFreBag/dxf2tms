function SvgViewer(document, svg, editor) 
{
	this.svg = svg;
	
	zoomIndex = null;
	zoomTable = [];
	
	massstab = null;
	
	$lageplan = $("#LAGEPLAN", $("defs", svg));
	
 	var base = 
	{
		x : svg.viewBox.baseVal.x,
		y : svg.viewBox.baseVal.y,
		width : svg.viewBox.baseVal.width,
		height : svg.viewBox.baseVal.height
	};
	var boundary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	boundary.setAttribute("class", "boundary-rect");
	//svg.appendChild(boundary);
	
	
	var updateView = function() 
    {
		var zoom = zoomTable[zoomIndex];
		
        svg.viewBox.baseVal.x = zoom.x;
		svg.viewBox.baseVal.y = zoom.y;
		svg.viewBox.baseVal.width = zoom.width;
		svg.viewBox.baseVal.height = zoom.height;
		
		boundary.setAttribute("x", base.x);
		boundary.setAttribute("y", base.y);
		boundary.setAttribute("width", base.width);
		boundary.setAttribute("height", base.height);
		/*
		viewboxTable[viewboxIndex].x = zoom.x;
		viewboxTable[viewboxIndex].y = zoom.y;
		viewboxTable[viewboxIndex].width = zoom.width;
		viewboxTable[viewboxIndex].height = zoom.height;
		*/
    }
	
	var updateScale = function() 
    {
		var zoom = zoomTable[zoomIndex];
		
		var scale = 0;
		switch (massstab)
		{
		case 200:
			scale = 0.4*zoom.width/200;
			break;
		case 500:
			scale = 1.2*zoom.width/500;
			break;
		case 1000:
			scale = 1.5*zoom.width/1000;
			break;
		}
		scale = Math.max(0.2,scale);
		
		boundary.setAttribute("stroke-width", scale);
		editor.setScale(scale);
    }
	
	
	mousewheel = function (e) 
    {
		var deltaY = 0;
		if (e.originalEvent.wheelDelta) 
		{
		    deltaY = -e.originalEvent.wheelDelta;
		}
		
		var p = svg.createSVGPoint();    
		p.x = e.originalEvent.pageX;
		p.y = e.originalEvent.pageY;
		p = p.matrixTransform(svg.getScreenCTM ().inverse());
		
		var zoom = zoomTable[zoomIndex];
		var ratioX = (p.x - zoom.x)/zoom.width;
		var ratioY = (p.y - zoom.y)/zoom.height;
		
		// Update the bg size:
		if (deltaY < 0) 
		{
			zoom.x = zoom.x + (zoom.width * ratioX * 0.1);
			zoom.y = zoom.y + (zoom.height * ratioY * 0.1);
			zoom.width -= zoom.width*0.1;
			zoom.height -= zoom.height*0.1;
		} 
		else 
		{
			zoom.x = zoom.x - (zoom.width * ratioX * 0.1);
		 	zoom.y = zoom.y - (zoom.height * ratioY * 0.1);
			zoom.width += zoom.width*0.1;
			zoom.height += zoom.height*0.1;
		}
		
		updateView();
		updateScale();
		e.preventDefault();
    }	
	
	var p0 = null;
	var pN = null;
	var ctm = null;
	
	mousedown = function (e) 
    {
		ctm = svg.getScreenCTM ().inverse();
		p0 = svg.createSVGPoint();    
		p0.x = e.originalEvent.pageX;
		p0.y = e.originalEvent.pageY;
		p0 = p0.matrixTransform(ctm);
		
		pS = svg.createSVGPoint();    
		pS.x = svg.viewBox.baseVal.x;
		pS.y = svg.viewBox.baseVal.y;
    }
	
	mouseup = function (e) 
    {
		p0 = null;
    }	
	
	mousemove = function (e) 
    {
		if (p0 != null)
		{
			pN = svg.createSVGPoint();    
			pN.x = e.originalEvent.pageX;
			pN.y = e.originalEvent.pageY;
			pN = pN.matrixTransform(ctm);
			
			var zoom = zoomTable[zoomIndex];
			zoom.x = pS.x - (pN.x - p0.x);
			zoom.y = pS.y - (pN.y - p0.y);
			updateView();
			
      		e.preventDefault();
	      	e.stopPropagation();
		};
    }

	
	this.setPlan = function($plan)
    {
		var bounds = $lageplan.attr("region").split(' '); 
	    
	   	var region = $plan.attr("region").split(' ');  
		var x = parseFloat(region[0]) - parseFloat(bounds[0]);
		var y = parseFloat(region[1]) - parseFloat(bounds[1]);
		var width = parseFloat(region[2]);
		var height = parseFloat(region[3]);
 		
		svg.setAttribute("viewBox", x + " " + y + " " + width + " " + height);
		
		base = 
		{
			x : svg.viewBox.baseVal.x,
			y : svg.viewBox.baseVal.y,
			width : svg.viewBox.baseVal.width,
			height : svg.viewBox.baseVal.height
		};
		
		zoomIndex = $plan.attr("id");
		if (zoomTable[zoomIndex] == null)
		{
			zoomTable[zoomIndex] = {
											x : base.x,
											y : base.y,
											width : base.width,
											height : base.height
										};
		}
		
		massstab = Number($plan.attr("massstab"));

		updateView();    
		updateScale();
    }
	
	this.getViewbox = function()
    {
		return zoomTable[zoomIndex];
    }
	
	this.enable = function()
	{
		$(svg).bind('mousewheel', mousewheel);       
		$(svg).bind('mousedown', mousedown);	
		$(svg).bind('mouseup', mouseup);	    
		$(svg).bind('mousemove', mousemove); 
		p0 = null;
    }
	
	this.disable = function()
	{
		$(svg).unbind('mousewheel', mousewheel);  
		$(svg).unbind('mousedown', mousedown);	 
		$(svg).unbind('mouseup', mouseup);	   
		$(svg).unbind('mousemove', mousemove);  
		p0 = null;
    }
	
	
	this.showBoundary = function()
	{
		if (boundary.parentNode == null)
		{
			svg.appendChild(boundary);
		}
    }
	
	this.hideBoundary = function()
	{
		if (boundary.parentNode != null)
		{
			svg.removeChild(boundary);
		}
    }
	
}
	