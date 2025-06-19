
//
// Translate widget
//

ObjectTool.CricleShape = function (editor)
{
	var shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
	shape.setAttribute("id", "translator-cup");
	shape.setAttribute("class", "translate-handle")
	shape.setAttribute("cx", 0);
	shape.setAttribute("cy", 0);
	
	this.attach = function(container, bbox)
	{
		shape.setAttribute("stroke-width", editor.scale);
		shape.setAttribute("r", Math.max(bbox.x + bbox.width,bbox.y + bbox.height)*1.41);
		container.appendChild(shape);
	}
	
	this.detach = function(container) 
	{
		container.removeChild(shape);
	}	
	
	this.scale = function()
	{
		shape.setAttribute("stroke-width", editor.scale);
	}
}

ObjectTool.RectShape = function (editor)
{
	var shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "rect");
	shape.setAttribute("id", "translator-cup");
	shape.setAttribute("class", "translate-handle")
	shape.setAttribute("cx", 0);
	shape.setAttribute("cy", 0);
	
	this.attach = function(container, box)
	{
		shape.setAttribute("stroke-width", editor.scale);
		shape.setAttribute("x", box.x);
		shape.setAttribute("y", box.y);
		shape.setAttribute("width", box.width);
		shape.setAttribute("height", box.height);
		
		container.appendChild(shape);
	}
	
	this.detach = function(container) 
	{
		container.removeChild(shape);
	}	
	
	this.scale = function()
	{
		shape.setAttribute("stroke-width", editor.scale);
	}	
	
	this.setClass = function(clazz)
	{
		shape.setAttribute("class", clazz)
	}
	
	this.getBBox = function()
	{
		return shape.getBBox();
	}
}

// manipulators
ObjectTool.TranslateWidget = function (editor, shape, tool)
{
	var target = null;

	var p0 = null;
	var pS = editor.svg.createSVGPoint();
	var pN = editor.svg.createSVGPoint();
	
	var mousedown = function(evt) 
	{
		p0 = editor.svg.createSVGPoint();
		p0.x = parseInt(evt.clientX);
		p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(editor.svg.getScreenCTM().inverse());

		pS = tool.startTranslate(target);

      	$(editor.svg).bind("mousemove", mousemove);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
    	pN.x = parseInt(evt.clientX);
    	pN.y = parseInt(evt.clientY);
    	pN = pN.matrixTransform(editor.svg.getScreenCTM().inverse());

		tool.translate(target, pS, pN.x - p0.x, pN.y - p0.y);
		
		editor.svg.forceRedraw();

      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	 
    var mouseup = function(evt) 
	{
		if (p0 != null)
		{
			tool.stopTranslate(target);
			
			p0 = null;
	    	$(editor.svg).unbind("mousemove", mousemove); 
	      	evt.preventDefault();
	      	evt.stopPropagation();
		}
	};
	
	
	var keydown = function(e) 
	{
	    switch (e.which) 
	    {
	    case 37:
	    	var pS = tool.startTranslate(target);	    	
			tool.translate(target, pS, -0.1, 0);
			tool.stopTranslate(target);
	        break;
	    case 38:
	    	var pS = tool.startTranslate(target);	    	
			tool.translate(target, pS, 0, -0.1);
			tool.stopTranslate(target);
	        break;
	    case 39:
	    	var pS = tool.startTranslate(target);	    	
			tool.translate(target, pS, 0.1, 0);
			tool.stopTranslate(target);
	        break;
	    case 40:
	    	var pS = tool.startTranslate(target);	    	
			tool.translate(target, pS, 0, 0.1);
			tool.stopTranslate(target);
	        break;
	    }
	};
	
    this.attach = function(element, container, box)  
	{
		$(editor.svg).bind('keydown', keydown);
		
    	shape.attach(container, box);
		target = element;
	
    	$(editor.svg).bind("mouseup", mouseup);
		$("#translator-cup", $(container)).bind("mousedown", mousedown);
	};
	
	this.detach = function(container) 
	{
    	shape.detach(container);
		target = null;

		$(editor.svg).unbind("mouseup", mouseup);
		$("#translator-cup", $(container)).unbind("mousedown", mousedown);
		
		$(editor.svg).unbind('keydown', keydown);
	};
	
	
	this.scale = function(value)
	{
		shape.scale();
	}	
}

//
// Rotation widget
//

ObjectTool.RotateWidget = function(editor, tool)
{
	var connector = editor.document.createElementNS("http://www.w3.org/2000/svg", "line");
	connector.setAttribute("class", "rotate-handle")
	//connector.setAttribute("vector-effect", "non-scaling-stroke");
		
	var handle = editor.document.createElementNS("http://www.w3.org/2000/svg", "circle");
	handle.setAttribute("id", "rotator-cup");
	handle.setAttribute("class", "rotate-handle")
	//handle.setAttribute("vector-effect", "non-scaling-stroke");

	var target = null;
	var currentMatrix = null;
	var p0 = null;
	
	var mousedown = function(evt) 
	{
		// find center of target in svg global space
    	var bbox = target.getBBox();
    	p0 = editor.svg.createSVGPoint();    
    	p0.x = 0; 
    	p0.y = 0; 
		p0 = p0.matrixTransform(target.getCTM());
		    	
		currentMatrix = tool.startRotate(target);
 
      	$(editor.svg).bind("mousemove", mousemove);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
		// convert event coordinates to svg global space
        var p1 = editor.svg.createSVGPoint();    
        p1.x = parseInt(evt.clientX);
        p1.y = parseInt(evt.clientY);
        p1 = p1.matrixTransform(target.getScreenCTM().inverse());
        p1 = p1.matrixTransform(target.getCTM());

		// compute left vector
      	var left =  [ p1.x - p0.x, p0.y - p1.y];
		var length = Math.sqrt(left[0] * left[0] + left[1] * left[1]);
        left[0] = left[0]/length;
        left[1] = left[1]/length;
        
		// assign left and up vectors
		currentMatrix.a = left[0];
		currentMatrix.b = -left[1];
		currentMatrix.c = left[1];
		currentMatrix.d = left[0];
		
		tool.rotate(target, currentMatrix);
		
     	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		if (p0 != null)
		{
			p0 = null;
			tool.stopRotate(target);
	    	$(editor.svg).unbind("mousemove", mousemove);
      		evt.preventDefault();
	      	evt.stopPropagation();
		}
	};
	
	
	var left = 1;
	
	this.attach = function(element, container, box, shape) 
	{
		if (shape == "circle")
		{
	    	left = Math.max(box.x + box.width,box.y + box.height)*1.41;
		}
		else
		{
			left = box.x + box.width
		}
		
    	container.appendChild(connector);
    	container.appendChild(handle);
    	this.scale(editor.scale);

		target = element;
			
    	$(editor.svg).bind("mouseup", mouseup);
    	$("#rotator-cup", $(element)).bind("mousedown", mousedown);
	};
	
	this.detach = function(container) 
	{
		container.removeChild(connector);
		container.removeChild(handle);
		
		target = null;
	
    	$(editor.svg).unbind("mouseup", mouseup);
    	$("#rotator-cup", $(container)).unbind("mousedown", mousedown);
	};	
	
	// TODO IMPLEMENT THIS PROPERLY
	this.scale = function(value)
	{
		connector.setAttribute("stroke-width", editor.scale);
    	connector.setAttribute("x1", left);
    	connector.setAttribute("y1", 0);
    	connector.setAttribute("x2", left+editor.scale*12);
    	connector.setAttribute("y2", 0);
    	
		handle.setAttribute("stroke-width", editor.scale);
		handle.setAttribute("r", editor.scale*4);
		handle.setAttribute("cx", left+editor.scale*16);
		handle.setAttribute("cy", 0);
	}
};


//
// Transform Tools
//

function SingleSelectTool(editor, layer) 
{
	var svg = editor.svg;
	
	var container = editor.document.createElementNS("http://www.w3.org/2000/svg", "g");
	container.setAttribute("id", "selectorGroup");
	container.setAttribute("class", "selector");
 
	var translManip = new ObjectTool.TranslateWidget(editor, new ObjectTool.CricleShape(editor), this);
	var rotateManip = new ObjectTool.RotateWidget(editor, this);

	var parent = null;
	var object = null;

	this.attach = function(element) 
	{
		element.appendChild(container);
		// move element to the top
		parent = $(element).parent()[0];
		editor.svg.appendChild(element);
 	
		var bbox = element.getBBox();
		if ($(element).attr("id") != "NORDPFEIL")
		{
			rotateManip.attach(element, container, bbox, "circle");
		}
		translManip.attach(element, container, bbox);    

		//$(document).bind("keyup",  keyup); 
	}

	this.detach = function(element)
	{
		if ($(element).attr("id") != "NORDPFEIL")
		{
			rotateManip.detach(container);
		}
		translManip.detach(container);
	
		element.removeChild(container);
		parent.appendChild(element);
 	
		//$(document).unbind("keyup",  keyup); 
	}

	this.udpateScale = function(value)
	{
		translManip.scale(value);
		rotateManip.scale(value);
	}

	//
	// translation callbacks
	//
	var matrix;
	
	this.startTranslate = function(target)
	{
		matrix = editor.getTransform(target);
      	return { x : matrix[4],  y : matrix[5] };
	}
	
	this.translate = function(target, pS, dx, dy)
	{
		matrix[4] = pS.x + dx;
		matrix[5] = pS.y + dy;
		editor.setTransform(target, matrix);
	}
	
	this.stopTranslate = function(target)
	{
		editor.callback.updateAttribute(target, "transform");
	}
	
	
	//
	// rotation callbacks
	//
	this.startRotate = function(target)
	{
		return editor.getMatrix(target);
	}
	
	this.rotate = function(target, matrix)
	{
		editor.setMatrix(target, matrix);
	}
	
	this.stopRotate = function(target)
	{
    	editor.callback.updateAttribute(target, "transform");
	}
	
	
}


function MultiSelectTool(editor, $gui, layer) 
{
	var svg = editor.svg;
	
	var container = editor.document.createElementNS("http://www.w3.org/2000/svg", "g");
	container.setAttribute("id", "selectorGroup");
	container.setAttribute("class", "selector");
 	
	var translateShape = new ObjectTool.RectShape(editor);
	var translManip = new ObjectTool.TranslateWidget(editor, translateShape, this);
	var rotateManip = new ObjectTool.RotateWidget(editor, this);

	var parent = null;
	
	var ctrlDn = false;
	
	var keyup = function(e)
	{
		if (e.keyCode == 17)
		{
			if (ctrlDn)
			{
				ctrlDn = false;
				translateShape.setClass("translate-handle");		
			}
		}
	};
	
	var keydown =  function(e)
	{
		if (e.keyCode == 17);
		{
			if (!ctrlDn)
			{
				ctrlDn = true;
				translateShape.setClass("select-outline");
			}		
		}
	};
	
	var selection = [];
	
	function detachBox(box) { return {x: box.x, y: box.y, width: box.width, height: box.height}; };

	
	$('.geopos-action-button', $("#multi-mode",$gui)).on('click', this, function (evt) 
	{
		// compute bounding box
		var bbox = translateShape.getBBox();
		
		var operation = $(this).attr("NAME");
		
		if (operation == "ALIGNVERT")
		{
			var cx = bbox.x + bbox.width/2 + editor.getTransform(container)[4];
			for (i=0;i<selection.length;i++)
			{
	      		var matrix = editor.getTransform(selection[i]);
	      		matrix[4] = cx;
	      		editor.setTransform(selection[i], matrix)
			}
		}
		else if (operation == "ALIGNHORZ")
		{
			var cy = bbox.y + bbox.height/2 + editor.getTransform(container)[5];
			for (i=0;i<selection.length;i++)
			{
	      		var matrix = editor.getTransform(selection[i]);
	      		matrix[5] = cy;
	      		editor.setTransform(selection[i], matrix)
			}		
		}
		else if (operation == "ALIGNLEFT")
		{
			var left = editor.getTransform(container)[4] - bbox.width/2;
			for (i=0;i<selection.length;i++)
			{
	      		var matrix = editor.getTransform(selection[i]);
				var objectbbox = detachBox(selection[i].getBBox());
	    		var w = Math.abs(matrix[0]*objectbbox.width)+Math.abs(matrix[1]*objectbbox.height);
	      		matrix[4] = left + w/2;
	      		editor.setTransform(selection[i], matrix)
			}		
		}
		else if (operation == "ALIGNRIGHT")
		{
			var right = editor.getTransform(container)[4] + bbox.width/2;
			for (i=0;i<selection.length;i++)
			{
	      		var matrix = editor.getTransform(selection[i]);
				var objectbbox = detachBox(selection[i].getBBox());
	    		var w = Math.abs(matrix[0]*objectbbox.width)+Math.abs(matrix[1]*objectbbox.height);
	      		matrix[4] = right - w/2;
	      		editor.setTransform(selection[i], matrix)
			}		
		}
		else if (operation == "ALIGNTOP")
		{
			var top = editor.getTransform(container)[5] - bbox.height/2;
			for (i=0;i<selection.length;i++)
			{
	      		var matrix = editor.getTransform(selection[i]);
				var objectbbox = detachBox(selection[i].getBBox());
				var h = Math.abs(matrix[2]*objectbbox.width)+Math.abs(matrix[3]*objectbbox.height);
	      		matrix[5] = top + h/2;
	      		editor.setTransform(selection[i], matrix)
			}		
		}
		else if (operation == "ALIGNBOTTOM")
		{
			var bottom = editor.getTransform(container)[5] + bbox.height/2;
			for (i=0;i<selection.length;i++)
			{
	      		var matrix = editor.getTransform(selection[i]);
				var objectbbox = detachBox(selection[i].getBBox());
				var h = Math.abs(matrix[2]*objectbbox.width)+Math.abs(matrix[3]*objectbbox.height);
	      		matrix[5] = bottom - h/2;
	      		editor.setTransform(selection[i], matrix)
			}		
		}
	})

	this.attach = function(element) 
	{
		svg.appendChild(container);
		
		$(document).bind('keydown',this, keydown);
		$(document).bind('keyup',this, keyup);
		
		selection.push(element);

		// compute bounding box
		var matrix = editor.getTransform(selection[0]);
		
		var bbox = detachBox(selection[0].getBBox());
   		var w = Math.abs(matrix[0]*bbox.width)+Math.abs(matrix[1]*bbox.height);
		var h = Math.abs(matrix[2]*bbox.width)+Math.abs(matrix[3]*bbox.height);
		var minX = matrix[4] - w/2;
		var minY = matrix[5] - h/2;
		var maxX = matrix[4] + w/2;
		var maxY = matrix[5] + h/2;
		for (i=1;i<selection.length;i++)
		{
       		matrix = editor.getTransform(selection[i]);
       		
    		var objectbbox = detachBox(selection[i].getBBox());
    		w = Math.abs(matrix[0]*objectbbox.width)+Math.abs(matrix[1]*objectbbox.height);
    		h = Math.abs(matrix[2]*objectbbox.width)+Math.abs(matrix[3]*objectbbox.height);
    		
    		minX = Math.min(minX, matrix[4] - w/2);
    		minY = Math.min(minY, matrix[5] - h/2);
    		maxX = Math.max(maxX, matrix[4] + w/2);
    		maxY = Math.max(maxY, matrix[5] + h/2);
 		}
		
		bbox.x = minX;
		bbox.y = minY;
		bbox.width = maxX - minX;
		bbox.height = maxY - minY;
		
		container.setAttribute("transform", "matrix(1 0 0 1 " + (bbox.x + bbox.width/2) + " " + (bbox.y + bbox.height/2)+")");
		bbox.x = -bbox.width/2;
		bbox.y = -bbox.height/2;
		
		translManip.attach(container, container, bbox);
		rotateManip.attach(container, container, bbox, "box");
		
		ctrlDn = true;
		translateShape.setClass("select-outline");
	}

	this.detach = function(element)
	{
		$(document).unbind('keydown', keydown);
		$(document).unbind('keyup', keyup);
		
		var matrix = editor.getTransform(container);
		var cx = matrix[4];
		var cy = matrix[5];

		selection = [];
		
		translManip.detach(container);
		rotateManip.detach(container);
		
		svg.removeChild(container);
		//parent.appendChild(element);
	}
	
	this.udpateScale = function(value)
	{
		if (editor.isAttached())
		{
			translManip.scale(value);
			rotateManip.scale(value);
		}
	}

	//
	// translation callbacks
	//
	
	this.startTranslate = function(target)
	{
		var matrix;

		for (i=0;i<selection.length;i++)
		{
    		matrix = editor.getTransform(selection[i]);
    		selection[i].sX = matrix[4];
    		selection[i].sY = matrix[5];
		}
		
		matrix = editor.getTransform(target);
     	return { x : matrix[4],  y : matrix[5] };
	}
	
	this.translate = function(target, pS, dx, dy)
	{
		var matrix = editor.getTransform(target);
		matrix[4] = pS.x + dx;
		matrix[5] = pS.y + dy;
		editor.setTransform(target, matrix);
		
		// remove selection
		for (i=0;i<selection.length;i++)
		{
    		matrix = editor.getTransform(selection[i]);
    		matrix[4] = selection[i].sX + dx;
    		matrix[5] = selection[i].sY + dy;
    		editor.setTransform(selection[i], matrix);
		}
		
	}
	
	this.stopTranslate = function(target)
	{
		for (i=0;i<selection.length;i++)
		{
	    	editor.callback.updateAttribute(selection[i], "transform");
		}
	}

	
	//
	// rotation callbacks
	//
	
	this.startRotate = function(target)
	{
		var matrixC = editor.getMatrix(target);

		matrixC = matrixC.inverse();
		for (i=0;i<selection.length;i++)
		{
			var matrixO = editor.getMatrix(selection[i]);
    		selection[i].m0 = matrixC.multiply(matrixO);
		}
		
		return editor.getMatrix(target);
	}
	
	this.rotate = function(target, matrixC)
	{
		editor.setMatrix(target, matrixC);
		
		// remove selection
		for (i=0;i<selection.length;i++)
		{
			var matrixO = selection[i].m0;
     		editor.setMatrix(selection[i], matrixC.multiply(matrixO));
		}
	}
	
	this.stopRotate = function(target)
	{
		for (i=0;i<selection.length;i++)
		{
	    	editor.callback.updateAttribute(selection[i], "transform");
		}
	}
	
	
}

function ObjectTool ()
{
}
/*
ObjectTool.init = function(editor, gui, layer)
{
	editor.addTool("object", new SingleSelectTool(editor, layer))
	editor.addTool("multi", new MultiSelectTool(editor, layer))
};
*/