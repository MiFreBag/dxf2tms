
function ShapeTool(editor, viewer, shape) 
{
	var svg = editor.svg;
    var p0 = svg.createSVGPoint();    
    var pN = null;    
    var root = null;
    
	var mousedown = function(evt) 
	{
		viewer.disable();

		p0.x = parseInt(evt.clientX);
		p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(svg.getScreenCTM().inverse());
		
	    pN = svg.createSVGPoint();    
		pN.x = p0.x;
		pN.y = p0.y;
		
		shape.start(p0, pN);

      	$(svg).bind("mousemove", mousemove);
      	$(svg).bind("mouseup", mouseup);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
    	pN.x = parseInt(evt.clientX);
    	pN.y = parseInt(evt.clientY);
    	pN = pN.matrixTransform(svg.getScreenCTM().inverse());
    	
    	shape.update(p0, pN);

      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		viewer.enable();
		
		if (pN != null)
		{
		   	shape.commit(root);
			pN = 0;

	    	$(svg).unbind("mousemove", mousemove);
	      	$(svg).unbind("mouseup", mouseup);
     		evt.preventDefault();
	      	evt.stopPropagation();
		}
	};
	
	this.activate = function(layer) 
	{
		root = layer;
     	$(svg).bind("mousedown", mousedown);
    }

	this.deactivate = function(layer)
	{
		root = layer;
      	$(svg).unbind("mousedown", mousedown);
    }	
}

ShapeTool.CircleShape = function(editor) 
{
	var svg = editor.svg;
	var shape = null;
	
    this.start = function (p0, pN)
    {
		shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
    	shape.setAttribute("class", editor.getClass("circle"));
		shape.setAttribute("transform", "matrix(1 0 0 1 0 0)");
		shape.setAttribute("r", "1");
		svg.appendChild(shape);
		
		this.update(p0, pN);
   }
    
    this.update = function (p0, pN)
    {
    	var x0 = Math.min(p0.x, pN.x);
    	var x1 = Math.max(p0.x, pN.x);
    	var y0 = Math.min(p0.y, pN.y);
    	var y1 = Math.max(p0.y, pN.y);
    	var cx = (x0+x1)/2;
    	var cy = (y0+y1)/2;
    	var r = Math.min((y1-y0)/2, (x1-x0)/2);
     	
 		shape.setAttribute("transform", "matrix(1 0 0 1 "+(cx)+" "+(cy)+")");
 		shape.setAttribute("r", Math.max(1.0, r));
    }
    
    this.commit = function(root)
    {
    	root.appendChild(shape);
    	editor.callback.createNode(shape);
    }
}

ShapeTool.RectangleShape = function(editor) 
{
	var svg = editor.svg;
	var shape = null;
	
    this.start = function (p0, pN)
    {
    	shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "rect");
    	shape.setAttribute("class", editor.getClass("rect"));
		shape.setAttribute("transform", "matrix(1 0 0 1 0 0)");
    	shape.setAttribute("width", "1");
    	shape.setAttribute("height", "1");
		svg.appendChild(shape);
		
		this.update(p0, pN);
   }
    
    this.update = function (p0, pN)
    {
    	var x0 = Math.min(p0.x, pN.x);
    	var x1 = Math.max(p0.x, pN.x);
    	var y0 = Math.min(p0.y, pN.y);
    	var y1 = Math.max(p0.y, pN.y);

    	var dx = x1-x0;
    	var dy = y1-y0;
    	
 		shape.setAttribute("transform", "matrix(1 0 0 1 "+(x0+dx/2)+" "+(y0+dy/2)+")");
    	shape.setAttribute("x", -dx/2);
    	shape.setAttribute("y", -dy/2);
    	shape.setAttribute("width", Math.max(1.0,dx));
    	shape.setAttribute("height",Math.max(1.0,dy));
    }
    
    this.commit = function (root)
    {
    	root.appendChild(shape);
		editor.callback.createNode(shape);
    }
}

ShapeTool.EllipseShape = function(editor) 
{
	var svg = editor.svg;
	var shape = null;
	
    this.start = function (p0, pN)
    {
		shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    	shape.setAttribute("class", editor.getClass("ellipse"));
		shape.setAttribute("transform", "matrix(1 0 0 1 0 0)");
		shape.setAttribute("rx", "1");
		shape.setAttribute("ry", "1");
		svg.appendChild(shape);
		
		this.update(p0, pN);
    }
    
    this.update = function (p0, pN)
    {
    	var x0 = Math.min(p0.x, pN.x);
    	var x1 = Math.max(p0.x, pN.x);
    	var y0 = Math.min(p0.y, pN.y);
    	var y1 = Math.max(p0.y, pN.y);
      	var cx = (x0+x1)/2;
    	var cy = (y0+y1)/2;
    	var rx = (x1-x0)/2;
    	var ry = (y1-y0)/2;

    	shape.setAttribute("transform", "matrix(1 0 0 1 "+(cx)+" "+(cy)+")");
		shape.setAttribute("rx", Math.max(1,rx));
		shape.setAttribute("ry", Math.max(1,ry));
    }
    
    this.commit = function(root)
    {
    	root.appendChild(shape);
		editor.callback.createNode(shape);
    }
}


ShapeTool.TextShape = function(editor) 
{
	var svg = editor.svg;
	var shape = null;
	
    this.start = function (p0, pN)
    {
    	shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "text");
    	shape.setAttribute("class", editor.getClass("text"));
 		shape.setAttribute("transform", "matrix(1 0 0 1 "+p0.x+" "+p0.y+")");
    	shape.setAttribute("x", 0);
    	shape.setAttribute("y", 0);
    	shape.setAttribute("xml:space", "preserve");
    	
		svg.appendChild(shape);

		this.update(p0, pN);
    }
    
    this.update = function (p0, pN)
    {
    }
    
    this.commit = function (root)
    {
    	root.appendChild(shape);
		editor.callback.createNode(shape);
		
		//editor.callback.selectNode(shape);
		//editor.setTool(root, "edit");
      	//editor.attach(shape);

    }
}


function PathTool(editor, viewer) 
{
	var svg = editor.svg;
    var root = null;
    
    var path = [];
    var circle = null;
    var pathClosed = false;
 
    function buildPath()
    {
    	var string = "M 0 0 " + "C " + path[0].c0.x + " " + path[0].c0.y + " " + path[0].cN.x + " " + path[0].cN.y + " " + path[0].p.x + " " + path[0].p.y;
    	for (var i=1; i<path.length; i++)
		{
    		string = string + " S " + path[i].cN.x + " " + path[i].cN.y + " " + path[i].p.x + " " + path[i].p.y;
		}
    	return string;
    }

     
	var mousedown = function(evt) 
	{
		if (path.length == 0)
		{
			// setup start of the curve
		    var p0 = svg.createSVGPoint();
			p0.x = parseInt(evt.clientX);
			p0.y = parseInt(evt.clientY);
			p0 = p0.matrixTransform(svg.getScreenCTM().inverse());
			
		    var c0 = svg.createSVGPoint();
		    c0.x = 0;
		    c0.y = 0;
			c0 = c0.matrixTransform(svg.getScreenCTM().inverse());
			
		    path[0] = { c0 : svg.createSVGPoint(), cN : svg.createSVGPoint(), p : svg.createSVGPoint() };
		    path[0].c0.x = 0;
		    path[0].c0.y = 0;
		    path[0].cN.x = 0;
		    path[0].cN.y = 0;
		    path[0].p.x = 0;
		    path[0].p.y = 0;
 
		    shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "path");
	    	shape.setAttribute("class", editor.getClass("path"));
	 		shape.setAttribute("transform", "matrix(1 0 0 1 "+p0.x+" "+p0.y+")");
	 		shape.setAttribute("d", buildPath());
			root.appendChild(shape);	
			
		    circle = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
		    circle.setAttribute("cx", p0.x);
		    circle.setAttribute("cy", p0.y);
		    circle.setAttribute("r", 3*editor.scale);
		    circle.setAttribute("class", "translate-handle");
		    circle.setAttribute("style", "stroke-width:"+editor.scale);
		    root.appendChild(circle);	
		    
			pathClosed = false;
			
	      	$(svg).bind("mousemove", mousemove);
	      	$(document).bind("mouseup", mouseup);
	        $(document).bind("keyup", keyup);
		}
		else
		{
		    var p = svg.createSVGPoint();
			p.x = parseInt(evt.clientX);
			p.y = parseInt(evt.clientY);
			p = p.matrixTransform(shape.getScreenCTM().inverse());
			pathClosed = Math.sqrt(p.x*p.x+p.y*p.y) < 3*editor.scale;
			if (pathClosed)
			{
			    path[path.length-1].cN.x = 0;
			    path[path.length-1].cN.y = 0;
			    path[path.length-1].p.x = 0;
			    path[path.length-1].p.y = 0;
			}
			
		    path[path.length] = { cN : svg.createSVGPoint(), p : svg.createSVGPoint() };
		    path[path.length-1].cN.x = p.x;
		    path[path.length-1].cN.y = p.y;
		    path[path.length-1].p.x = p.x;
		    path[path.length-1].p.y = p.y;
		    
		}
		
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
		var pN = svg.createSVGPoint();    
	    pN.x = parseInt(evt.clientX);
	    pN.y = parseInt(evt.clientY);
	    pN = pN.matrixTransform(shape.getScreenCTM().inverse());
 		path[path.length-1].cN.x = pN.x;
 		path[path.length-1].cN.y = pN.y;
 		path[path.length-1].p.x = pN.x;
 		path[path.length-1].p.y = pN.y;
  		shape.setAttribute("d", buildPath());
    	
      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		if (pathClosed)
		{
			// path closed
			keyup({which: 27});
		}

		if (path.length != 0)
		{
     		evt.preventDefault();
	      	evt.stopPropagation();
		}
	};
	
 	var keyup = function(evt) 
	{
 		if(evt.which == 27)
 		{
	    	$(svg).unbind("mousemove", mousemove);
	      	$(document).unbind("mouseup", mouseup);
	        $(document).unbind("keyup", keyup); 
	        
	        path.length = path.length-1;
	        if (path.length > 0)
        	{
		 		shape.setAttribute("d", buildPath());
				editor.callback.createNode(shape);
        	}
	        else
        	{
				root.removeChild(shape);
        	}
	        path = [];
			root.removeChild(circle);
 		}
	}
	
	this.activate = function(layer) 
	{
		root = layer;
		viewer.disable();
     	$(svg).bind("mousedown", mousedown);
    }

	this.deactivate = function(layer)
	{
		root = layer;
      	$(svg).unbind("mousedown", mousedown);
		viewer.enable();
     	
		if (path.length != 0)
		{
	    	$(svg).unbind("mousemove", mousemove);
	      	$(svg).unbind("mouseup", mouseup);
	        $(document).unbind("keyup", keyup); 
	        
	        path.length = path.length-1;
	        if (path.length > 0)
        	{
		 		shape.setAttribute("d", buildPath());
				editor.callback.createNode(shape);
        	}
	        else
        	{
				root.removeChild(shape);
        	}
	        path = [];
			root.removeChild(circle);
		}
    }	
}


function SymbolTool(editor, viewer, shape) 
{
	var svg = editor.svg;
    var root = null;
    
	var mousedown = function(evt) 
	{
	    var p0 = svg.createSVGPoint();    
		p0.x = parseInt(evt.clientX);
		p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(svg.getScreenCTM().inverse());
		
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
	var dragover = function(evt) 
	{
		evt.preventDefault();
	    return false;
		
	}

	var dragdrop = function(evt) 
	{
		evt.preventDefault();
	    if (evt.stopPropagation) 
	    {
	    	evt.stopPropagation();
	    }

	    var p0 = svg.createSVGPoint();    
		p0.x = parseInt(evt.originalEvent.clientX);
		p0.y = parseInt(evt.originalEvent.clientY);
		p0 = p0.matrixTransform(svg.getScreenCTM().inverse());

		var styler = editor.getStyler();
		var shape = styler.getDragSource();
		shape = shape.cloneNode(true);   
		
		var container = editor.document.createElementNS("http://www.w3.org/2000/svg", "g");
		container.setAttribute("class", "symbol");
		container.setAttribute("transform", "matrix(1 0 0 1 "+p0.x+" "+p0.y+")");
		container.appendChild(shape);
		root.appendChild(container);
		
		editor.callback.createNode(container);
	    return false;
	}
	
	this.activate = function(layer) 
	{
		root = layer;
    	$(svg).bind('dragover', dragover);
    	$(svg).bind('drop', dragdrop);
     	$(svg).bind("mousedown", mousedown);
    }

	this.deactivate = function(layer)
	{
		root = layer;
    	$(svg).unbind('dragover', dragover);
    	$(svg).unbind('drop', dragdrop);
      	$(svg).unbind("mousedown", mousedown);
    }	
}


function DrawTool(editor, viewer) 
{
	var svg = editor.svg;
    var root = null;
    
    var path = "M 0 0";

    function appendPoint(point)
    {
    	path = path + " L " + point.x + " " + point.y;
    }
 	
	var mousedown = function(evt) 
	{
	    var p0 = svg.createSVGPoint();   
	    p0.x = parseInt(evt.clientX);
	    p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(svg.getScreenCTM().inverse());

		path = "M 0 0";
		
 		shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "path");
    	shape.setAttribute("class", editor.getClass("draw"));
 		shape.setAttribute("transform", "matrix(1 0 0 1 "+p0.x+" "+p0.y+")");
 		shape.setAttribute("d", path);
		root.appendChild(shape);	
		
      	$(svg).bind("mousemove", mousemove);
      	$(svg).bind("mouseup", mouseup);
		viewer.disable();

      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
	    var pN = svg.createSVGPoint();   
	    pN.x = parseInt(evt.clientX);
	    pN.y = parseInt(evt.clientY);
	    pN = pN.matrixTransform(shape.getScreenCTM().inverse());
	    appendPoint(pN)
 		shape.setAttribute("d", path);
 		
      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		viewer.enable();
    	$(svg).unbind("mousemove", mousemove);
      	$(svg).unbind("mouseup", mouseup);
		editor.callback.createNode(shape);
		path = null;
 		evt.preventDefault();
      	evt.stopPropagation();
	};
	
	this.activate = function(layer) 
	{
		root = layer;
     	$(svg).bind("mousedown", mousedown);
    }

	this.deactivate = function(layer)
	{
		root = layer;
      	$(svg).unbind("mousedown", mousedown);
  }	
}


function MeasureTool(editor, viewer) 
{
	var svg = editor.svg;
    var root = null;
	var p0;
	var shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "line");
	shape.setAttribute("class", "ruler-line");
	var text = editor.document.createElementNS("http://www.w3.org/2000/svg", "text");
	text.setAttribute("class", "ruler-text");
	
	var mousedown = function(evt) 
	{
	    p0 = svg.createSVGPoint();   
	    p0.x = parseInt(evt.clientX);
	    p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(svg.getScreenCTM().inverse());

 		shape.setAttribute("transform", "matrix(1 0 0 1 "+p0.x+" "+p0.y+")");
		shape.setAttribute("stroke-width", editor.scale);
 		shape.setAttribute("x1", "0");
 		shape.setAttribute("y1", "0");
 		shape.setAttribute("x2", "0");
 		shape.setAttribute("y2", "0");
		root.appendChild(shape);
		
		text.setAttribute("font-size", 12*editor.scale);
		root.appendChild(text);	
		
      	$(svg).bind("mousemove", mousemove);
      	$(svg).bind("mouseup", mouseup);
		viewer.disable();

      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
	    var pN = svg.createSVGPoint();   
	    pN.x = parseInt(evt.clientX);
	    pN.y = parseInt(evt.clientY);
	    pN = pN.matrixTransform(shape.getScreenCTM().inverse());
 		shape.setAttribute("x2", pN.x);
 		shape.setAttribute("y2", pN.y);
 		
	    pN.x = parseInt(evt.clientX);
	    pN.y = parseInt(evt.clientY);
	    pN = pN.matrixTransform(svg.getScreenCTM().inverse());
		text.setAttribute("transform", "matrix(1 0 0 1 "+pN.x+" "+pN.y+")");
		
	    var distance = Math.sqrt((pN.x-p0.x)*(pN.x-p0.x)+(pN.y-p0.y)*(pN.y-p0.y)).toFixed(2) ;
		text.textContent = distance+" m";
 		
      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		viewer.enable();
    	$(svg).unbind("mousemove", mousemove);
      	$(svg).unbind("mouseup", mouseup);
      	
	    var pN = svg.createSVGPoint();   
	    pN.x = parseInt(evt.clientX);
	    pN.y = parseInt(evt.clientY);
	    pN = pN.matrixTransform(svg.getScreenCTM().inverse());
		
	    var distance = Math.sqrt((pN.x-p0.x)*(pN.x-p0.x)+(pN.y-p0.y)*(pN.y-p0.y)).toFixed(2) ;
	    if (distance < 0.5)
    	{
			root.removeChild(shape);
			root.removeChild(text);	
    	}
      	
 		evt.preventDefault();
      	evt.stopPropagation();
	};
	
	this.activate = function(layer) 
	{
		root = layer;
     	$(svg).bind("mousedown", mousedown);
    }

	this.deactivate = function(layer)
	{
		root = layer;
      	$(svg).unbind("mousedown", mousedown);
	}	
}


ShapeTool.init = function(editor,viewer)
{
	editor.addTool("circle", new ShapeTool(editor,viewer, new ShapeTool.CircleShape(editor)));
	editor.addTool("rect", new ShapeTool(editor,viewer, new ShapeTool.RectangleShape(editor)));
	editor.addTool("ellipse", new ShapeTool(editor,viewer, new ShapeTool.EllipseShape(editor)));
	editor.addTool("text", new ShapeTool(editor,viewer, new ShapeTool.TextShape(editor)));
	editor.addTool("path", new PathTool(editor,viewer));
	editor.addTool("draw", new DrawTool(editor,viewer));
	editor.addTool("symbol", new SymbolTool(editor,viewer));
	editor.addTool("measure", new MeasureTool(editor,viewer));
};
