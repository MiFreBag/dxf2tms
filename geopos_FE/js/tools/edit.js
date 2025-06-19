
function TranslateWidget(editor, tool, container) 
{
	var svg = editor.svg;
	
	var transformer = 
	{
	    start : function ()
	    {
	    	this.matrix = editor.getMatrix(container);
	    	this.x = this.matrix.e;
	    	this.y = this.matrix.f;
	    },
	    update : function (p0, pN)
	    {
	    	this.matrix.e = this.x + (pN.x - p0.x);
	    	this.matrix.f = this.y + (pN.y - p0.y);
	    	editor.setMatrix(container, this.matrix);
	    }
	};
	
	var shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "rect");
	shape.setAttribute("class", "translate-handle");

	var p0 = svg.createSVGPoint();;
	var pN = svg.createSVGPoint();
	var ctm = null;
	
	var mousedown = function(evt) 
	{
		ctm = svg.getScreenCTM().inverse();
		p0.x = parseInt(evt.clientX);
		p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(ctm);

    	tool.start(evt.data);
		transformer.start();
      	
      	$(svg).bind("mousemove", mousemove);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
    	pN.x = parseInt(evt.clientX);
    	pN.y = parseInt(evt.clientY);
    	pN = pN.matrixTransform(ctm);
		transformer.update(p0, pN);
 
      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	 
    var mouseup = function(evt) 
	{
		if (ctm)
		{
	     	tool.end(evt.data);
	     	ctm = null;

	    	$(svg).unbind("mousemove", mousemove); 
	      	evt.preventDefault();
	      	evt.stopPropagation();
		}
	};
	
	var keydown = function(e) 
	{
	    switch (e.which) 
	    {
	    case 37:
			var matrix = editor.getTransform(container);
			matrix[4] -= 0.1;
			editor.setTransform(container, matrix);
	        break;
	    case 38:
			var matrix = editor.getTransform(container);
			matrix[5] -= 0.1;
			editor.setTransform(container, matrix);
	        break;
	    case 39:
			var matrix = editor.getTransform(container);
			matrix[4] += 0.1;
			editor.setTransform(container, matrix);
	        break;
	    case 40:
			var matrix = editor.getTransform(container);
			matrix[5] += 0.1;
			editor.setTransform(container, matrix);
	        break;
	    }
	};
	
	
    this.attach = function(element)  
	{
		$(document).bind('keydown', keydown);

		var bbox = element.getBBox();

		shape.setAttribute("stroke-width", editor.scale);
		shape.setAttribute("x", bbox.x);
		shape.setAttribute("y", bbox.y);
		shape.setAttribute("width", bbox.width);
		shape.setAttribute("height", bbox.height);
		container.appendChild(shape);
     	
		$(svg).bind("mouseup", this, mouseup);
		$(shape).bind("mousedown", this, mousedown);
	};
	
	this.detach = function(element) 
	{
		container.removeChild(shape);

		$(svg).unbind("mouseup", mouseup);
		$(shape).unbind("mousedown", mousedown);

		$(document).unbind('keydown', keydown);
	};
	
    this.scale = function(value)
    {
		shape.setAttribute("stroke-width", editor.scale);
    }
	
}

function RotateWidget(editor, tool, container)
{
	var svg = editor.svg;
	
	var transformer = 
	{
	    start : function ()
	    {
	    	this.matrix = editor.getMatrix(container);
	    	
	    },
	    update : function (pN)
	    {
	      	var left =  [ pN.x - this.matrix.e, this.matrix.f - pN.y];
			var length = Math.sqrt(left[0] * left[0] + left[1] * left[1]);
	        left[0] = left[0]/length;
	        left[1] = left[1]/length;
	        
			// assign left and up vectors
	        this.matrix.a = left[0];
	        this.matrix.c = left[1];
	        this.matrix.b = -left[1];
	        this.matrix.d = left[0];
	        
	    	editor.setMatrix(container, this.matrix);
	    }
	};
	
	var handle = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
	handle.setAttribute("class", "rotate-handle")
	//handle.setAttribute("vector-effect", "non-scaling-stroke");

	var pN = svg.createSVGPoint();    
	var ctm = null;
	
	var mousedown = function(evt) 
	{
		ctm = svg.getScreenCTM().inverse();
     	tool.start(evt.data);
		transformer.start();
		    	
      	$(svg).bind("mousemove", mousemove);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
		// convert event coordinates to svg global space
    	pN.x = parseInt(evt.clientX);
    	pN.y = parseInt(evt.clientY);
    	pN = pN.matrixTransform(svg.getScreenCTM().inverse());
    	
		transformer.update(pN);
  
		evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		if (ctm)
		{
	     	tool.end(evt.data);
	     	ctm = null;
	     	
	    	$(svg).unbind("mousemove", mousemove);
      		evt.preventDefault();
	      	evt.stopPropagation();
		}
	};

	var bbox = null;
	
	this.attach = function(element, container) 
	{
		bbox = element.getBBox();
  	
		handle.setAttribute("stroke-width", editor.scale);
		handle.setAttribute("r", editor.scale*3);
		handle.setAttribute("cx", bbox.x + bbox.width + editor.scale*14);
		if (element.getAttribute("data-tool") == "text")
		{
			handle.setAttribute("cy", bbox.y);
		}
		else
		{
			handle.setAttribute("cy", bbox.y + bbox.height/2);
		}
    	container.appendChild(handle);
			
    	$(svg).bind("mouseup", this, mouseup);
    	$(handle).bind("mousedown", this, mousedown);
	};
	
	this.detach = function(element) 
	{
		container.removeChild(handle);
	
    	$(svg).unbind("mouseup", mouseup);
    	$(handle).unbind("mousedown", mousedown);
	};	
	
    this.scale = function(value)
    {
		handle.setAttribute("stroke-width", editor.scale);
		handle.setAttribute("r", editor.scale*3);
		handle.setAttribute("cx", bbox.x + bbox.width + editor.scale*14);
    }
};

function ScaleWidget(editor, tool, container)
{
	var svg = editor.svg;
	
	var handlers = { 
			
		"rect" : function(shape)
		{
	    	var DX = [1,0,0,0,0,0,1,1];
	    	var DY = [0,0,0,0,1,1,1,0];	  
	    	var DW = [-1,0,1,1,1,0,-1,-1];
	    	var DH = [1,1,1,0,-1,-1,-1,0];	  

	    	var transformer = 
	    	{
	   			shape : shape,
	   			
			    start : function (handle)
			    {
			    	this.handle = handle;
			    	
			    	this.width = parseFloat(shape.getAttribute("width"));
			    	this.height = parseFloat(shape.getAttribute("height"));
			    	this.x = parseFloat(shape.getAttribute("x"));
			    	this.y = parseFloat(shape.getAttribute("y"));
			    	this.matrix = editor.getMatrix(container);
			    },
			    update : function (p0, pN)
			    {
			    	var dx = (pN.x - p0.x);
			    	var dy = (pN.y - p0.y);

			    	var x = this.x + DX[this.handle]*dx;
			    	var y = this.y + DY[this.handle]*dy;
			    	var width = this.width + DW[this.handle]*dx;
			    	var height = this.height + DH[this.handle]*dy;
			    	if (height < 0)
		    		{
			    		y = y+height;
			    		height = -height;
		    		}
			    	if (width < 0)
		    		{
			    		x = x+width;
			    		width = -width;
		    		}
			    	shape.setAttribute("x",x);
			    	shape.setAttribute("y",y);
			    	shape.setAttribute("width",Math.max(1,width));
			    	shape.setAttribute("height",Math.max(1,height));
			    },
			    commit : function (p0, pN)
			    {
			    	// center rectangle
			    	var x = -parseFloat(shape.getAttribute("width"))/2;
			    	var y = -parseFloat(shape.getAttribute("height"))/2;
			    	shape.setAttribute("x",x);
			    	shape.setAttribute("y",y);
			    	
			    	// adjust transform to center
			    	var dx = 0.5*Math.abs(DW[this.handle])*(pN.x - p0.x);
			    	var dy = 0.5*Math.abs(DH[this.handle])*(pN.y - p0.y);
			    	
			    	// rotate
			    	var nx =   dx*this.matrix.a - dy*this.matrix.b;
			    	var ny = - dx*this.matrix.c + dy*this.matrix.d;
			    	// translate
			    	this.matrix.e += nx;
			    	this.matrix.f += ny;

			    	// update matrix
			    	editor.callback.updateAttribute(shape, "x");
			    	editor.callback.updateAttribute(shape, "y");
			    	editor.callback.updateAttribute(shape, "width");
			    	editor.callback.updateAttribute(shape, "height");
			    	editor.setMatrix(container, this.matrix);
			    }
	    	};
	    	return transformer;
		},

		"circle" : function(shape)
	    {
	    	var DR = [Math.sqrt(2),1,Math.sqrt(2),1,Math.sqrt(2),1,Math.sqrt(2),1];
	  	  
	    	var transformer = 
	    	{
	   			shape : shape,
	   			
			    start : function (handle)
			    {
			    	this.handle = handle;
			    },
			    update : function (p0, pN)
			    {
			    	var r = Math.sqrt(pN.x*pN.x+pN.y*pN.y);
			    	shape.setAttribute("r",Math.max(1.0, r/DR[this.handle]));
			    },
			    commit : function ()
			    {
			    	editor.callback.updateAttribute(shape, "r");
			    }
	    	};
	    	return transformer;
	    },
		"ellipse" : function(shape)
	    {
	    	var DX = [1,0,1,1,1,0,1,1];
	    	var DY = [1,1,1,0,1,1,1,0];
	    	var DR = [Math.sqrt(2),1,Math.sqrt(2),1,Math.sqrt(2),1,Math.sqrt(2),1];
	  	  
	    	var transformer = 
	    	{
	   			shape : shape,
	   			
			    start : function (handle)
			    {
			    	this.handle = handle;
			    	this.rx = parseFloat(shape.getAttribute("rx"));
			    	this.ry = parseFloat(shape.getAttribute("ry"));
			    },
			    update : function (p0, pN)
			    {
			    	var dx = Math.abs(pN.x) - this.rx;
			    	var dy = Math.abs(pN.y) - this.ry;
			    	var r = Math.sqrt(dx*dx+dy*dy);
			    	shape.setAttribute("rx",Math.max(1.0, this.rx + DX[this.handle]*dx));
			    	shape.setAttribute("ry",Math.max(1.0, this.ry + DY[this.handle]*dy));
			    },
			    commit : function ()
			    {
			    	editor.callback.updateAttribute(shape, "rx");
			    	editor.callback.updateAttribute(shape, "ry");
			    }
	    	};
	    	return transformer;
	    }
	};	
	
	
	var handle = [];
	for (var i=0; i<8; i++)
	{
		var object = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
		object.setAttribute("id", i);
		object.setAttribute("class", "scale-handle")
		handle[i] = object;
	}
	
	var updateHandles = function()
	{
		var bbox = transformer.shape.getBBox();
    	var X = [0, 0.5, 1, 1, 1, 0.5, 0, 0];
    	var Y = [1, 1, 1, 0.5, 0, 0, 0, 0.5];
    	for (var i=0; i<8; i++)
		{
    		handle[i].setAttribute("cx", bbox.x+bbox.width*X[i]);
    		handle[i].setAttribute("cy", bbox.y+bbox.height*Y[i]);
    		handle[i].setAttribute("r", editor.scale);
		}
	}		
	
	var transformer = null;
	var p0 = null;
	var pN = svg.createSVGPoint();
	
	var mousedown = function(evt) 
	{
    	var index = parseInt(evt.currentTarget.getAttribute("id"));
    	
		// convert event coordinates to object local space
    	p0 = svg.createSVGPoint();
     	p0.x = parseInt(evt.clientX);
     	p0.y = parseInt(evt.clientY);
     	p0 = p0.matrixTransform(transformer.shape.getScreenCTM().inverse());
     	
     	pN.x = p0.x;
     	pN.y = p0.y;
 
     	tool.start(evt.data);
    	transformer.start(index);
    	
      	$(svg).bind("mousemove", mousemove);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
		// convert event coordinates to object local space
        pN.x = parseInt(evt.clientX);
        pN.y = parseInt(evt.clientY);
        pN = pN.matrixTransform(transformer.shape.getScreenCTM().inverse());
    	
    	transformer.update(p0, pN);
    	updateHandles();

      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		if (p0 != null)
		{
			transformer.commit(p0, pN);
	    	updateHandles();
	     	tool.end(evt.data);
	    	p0 = null;
			
	    	$(svg).unbind("mousemove", mousemove);
      		evt.preventDefault();
	      	evt.stopPropagation();
		}
	};
	
	this.attach = function(element, container) 
	{
		var shape = element.getAttribute("data-tool");
     	if (handlers[shape] != null)
 		{
         	transformer = handlers[shape](element);
         	for (var i=0; i<8; i++)
    		{
        		container.appendChild(handle[i]);
        	   	$(handle[i]).bind("mousedown", this, mousedown);
    		}
           	updateHandles();
        	$(svg).bind("mouseup", this, mouseup);
 		}
 	};
	
	this.detach = function(element, container) 
	{
		var shape = element.getAttribute("data-tool");
     	if (handlers[shape] != null)
 		{
	    	for (var i=0; i<8; i++)
			{
	    		container.removeChild(handle[i]);
	        	$(handle[i]).unbind("mousedown", mousedown);
			}
	    	$(svg).unbind("mouseup", mouseup);
	    	transformer == null;
		}
 	};	
 	
    this.scale = function(value)
    {
    	// implement me
    }
};


function PathWidget(editor, tool, container)
{
	var svg = editor.svg;
    var handle = [];
    var path = [];
 	var instance = this;

    function buildPath()
    {
    	var string = "M 0 0 " + "C " + path[0].c0.x + " " + path[0].c0.y + " " + path[0].cN.x + " " + path[0].cN.y + " " + path[0].p.x + " " + path[0].p.y;
    	for (var i=1; i<path.length; i++)
		{
    		string = string + " S " + path[i].cN.x + " " + path[i].cN.y + " " + path[i].p.x + " " + path[i].p.y;
		}
    	return string;
    }

    
    function addHandle(p, c, index, container)
    {
	    var controlPoint = editor.document.createElementNS("http://www.w3.org/2000/svg", "g");
	    
	    var line = editor.document.createElementNS("http://www.w3.org/2000/svg", "line");
	    line.setAttribute("x1", p.x);
	    line.setAttribute("y1", p.y);
	    line.setAttribute("x2", c.x);
	    line.setAttribute("y2", c.y);
	    line.setAttribute("class", "spline-handle");
	    line.setAttribute("style", "stroke-width:"+editor.scale);
	    controlPoint.appendChild(line);	
		
	    var circle = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
	    circle.setAttribute("cx", c.x);
	    circle.setAttribute("cy", c.y);
	    circle.setAttribute("r", 3*editor.scale);
	    circle.setAttribute("class", "translate-handle");
	    circle.setAttribute("style", "stroke-width:"+editor.scale);
	    controlPoint.appendChild(circle);	
	    
	    container.appendChild(controlPoint);	

	   	$(circle).bind("mousedown", index, mousedown);
		handle.push(controlPoint);
    }

    function removeHandle(index, container)
    {
	    var circle = handle[index].childNodes[1];
    	$(circle).unbind("mousedown", mousedown);
    	
    	container.removeChild(handle[index]);
    }
    
	var mousedown = function(evt) 
	{
      	$(svg).bind("mousemove", evt.data, mousemove);
      	$(svg).bind("mouseup", mouseup);
		tool.start(instance);

      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
	var mousemove = function(evt) 
    {
		// convert event coordinates to object local space
		var p0 = svg.createSVGPoint();
		p0.x = parseInt(evt.clientX);
		p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(shape.getScreenCTM().inverse());
		
		var controlPoint = handle[evt.data+1];
		
	    var line = controlPoint.childNodes[0];
	    line.setAttribute("x2", p0.x);
	    line.setAttribute("y2", p0.y);
	    var circle = controlPoint.childNodes[1];
	    circle.setAttribute("cx", p0.x);
	    circle.setAttribute("cy", p0.y);
	    
	    if (evt.data == -1)
    	{
	    	path[0].c0.x = p0.x;
	    	path[0].c0.y = p0.y;
    	}
	    else
    	{
	    	path[evt.data].cN.x = p0.x;
	    	path[evt.data].cN.y = p0.y;
    	}
		
		shape.setAttribute("d", buildPath());

      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
    	$(svg).unbind("mousemove", mousemove);
      	$(svg).unbind("mouseup", mouseup);
		tool.end(instance);
    
  		evt.preventDefault();
      	evt.stopPropagation();
	};
	
	
	this.attach = function(element, container) 
	{
     	// create path points
		var attr = element.getAttribute("d");
		var tokens = attr.split(" ");
		var index = 0;
	    path[index] = { c0 : svg.createSVGPoint(), cN : svg.createSVGPoint(), p : svg.createSVGPoint() };
	    path[index].c0.x = parseFloat(tokens[4]);
	    path[index].c0.y = parseFloat(tokens[5]);
	    path[index].cN.x = parseFloat(tokens[6]);
	    path[index].cN.y = parseFloat(tokens[7]);
	    path[index].p.x = parseFloat(tokens[8]);
	    path[index].p.y = parseFloat(tokens[9]);
		index++;
     	for (var i=0; i<(tokens.length-10)/5; i++)
		{
    	    path[index] = { cN : svg.createSVGPoint(), p : svg.createSVGPoint() };
    	    path[index].cN.x = parseFloat(tokens[i*5+10+1]);
    	    path[index].cN.y = parseFloat(tokens[i*5+10+2]);
    	    path[index].p.x = parseFloat(tokens[i*5+10+3]);
    	    path[index].p.y = parseFloat(tokens[i*5+10+4]);
    		index++;
		}

     	// create handles
     	addHandle({ x:0, y: 0 }, path[0].c0, -1, container)
      	for (i=0; i<path.length; i++)
 		{
        	addHandle(path[i].p, path[i].cN, i, container)
 		}
     	
    	//$(svg).bind("mouseup", mouseup);
    	shape = element;
 	};
	
	this.detach = function(element, container) 
	{
    	for (var i=0; i<handle.length; i++)
		{
    		removeHandle(i, container);
		}
     	
		handle = [];
		path = [];
		
		editor.callback.updateAttribute(shape, "d");
		
		//$(svg).unbind("mouseup", mouseup);
    	shape = null;
 	};
 	
 	
    this.scale = function(value)
    {
    	// implement me
    }
}



function EditTool(editor, layer) 
{
	var svg = editor.svg;
	
	container = editor.document.createElementNS("http://www.w3.org/2000/svg", "g");
	container.setAttribute("id", "selectorGroup");
    container.setAttribute("class", "selector");
    
	 // manipulators
    var translManip = new TranslateWidget(editor, this, container);
    var rotateManip = new RotateWidget(editor, this, container);
    var scalerManip = new ScaleWidget(editor, this, container);
    var pathManip = new PathWidget(editor, this, container);
    
    var context = {
		"rect" : 
		{ 
			manip: [ translManip, rotateManip, scalerManip ]
		},
		"circle" : 
		{ 
			manip: [ translManip, rotateManip, scalerManip ]
		},    			
		"ellipse" : 
		{ 
			manip: [ translManip, rotateManip, scalerManip ]
		},    			
		"text" : 
		{ 
			manip: [ translManip, rotateManip ]
		},    			
		"path" : 
		{ 
			manip: [ translManip, pathManip ]
		},    			
	    "draw" : 
		{ 
			manip: [ translManip ]
		},
		"symbol" : 
		{ 
			manip: [ translManip, rotateManip ]
		},
    };
    
    
    var shape = null;
	var nextSibling = null;
   	var parent = null;
   	
    var keyup = function(evt) 
	{
 		if(evt.which == 46 && $(':focus').prop("tagName") == "svg")
 		{
 			editor.callback.deleteNode(shape);
 			evt.preventDefault();
 		}
	}; 
	
	this.attach = function(element) 
	{
	   	parent = $(element).parent()[0];
		shape = element;
		nextSibling = shape.nextSibling;
		
		layer.appendChild(container);
	   	
	   	container.setAttribute("transform", shape.getAttribute("transform"));
	   	shape.setAttribute("transform","matrix(1 0 0 1 0 0)");
    	container.appendChild(shape);
    	
    	var manip = context[shape.getAttribute("data-tool")].manip;
    	for (var i=0; i<manip.length; i++)
		{
    		manip[i].attach(shape, container);
		}
        $(document).bind("keyup",  keyup); 
 	}

	this.detach = function(element)
	{
		$(document).unbind("keyup",  keyup); 
    	var manip = context[shape.getAttribute("data-tool")].manip;
    	for (var i=0; i<manip.length; i++)
		{
    		manip[i].detach(shape, container);
		}

		element.setAttribute("transform", container.getAttribute("transform"));
		container.setAttribute("transform","matrix(1 0 0 1 0 0)");
    	parent.insertBefore(shape,nextSibling);
 		
    	layer.removeChild(container);
		
     	editor.callback.updateAttribute(element, "transform");
    	
		shape = null;
		parent = null;
		nextSibling = null;
	}
	
	this.udpateScale = function(value)
	{
		if (editor.isAttached())
		{
			translManip.scale(value);
			rotateManip.scale(value);
			scalerManip.scale(value);
			pathManip.scale(value);
		}
	}
	
	
	this.activate = function(root)
	{
		layer = root;		
    }
	
	this.dectivate = function(root)
	{
		layer = null;		
	}
	
	this.start = function(widget)
	{
	  	var manip = context[shape.getAttribute("data-tool")].manip;
    	for (var i=0; i<manip.length; i++)
		{
    		if (manip[i] != widget)
   			{
        		manip[i].detach(shape, container);
   			}
		}
    }
	
	this.end = function(widget)
	{
    	// bring widget to front
    	widget.detach(shape,container);
		
	  	var manip = context[shape.getAttribute("data-tool")].manip;
    	for (var i=0; i<manip.length; i++)
		{
    		manip[i].attach(shape, container);
		}
	}
}

EditTool.init = function(editor, layer)
{
	editor.addTool("edit", new EditTool(editor, layer))
};



