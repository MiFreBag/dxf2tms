function SvgEditor(document, svg, callback) 
{
	SvgEditor.prototype.instance = this;
	
	this.svg = svg;
	this.document = document;
	this.callback = callback;
	this.scale = 0.4;
	
	this.$cloneOldEl = null;
	this.$cloneNewEl = null;

	// find unique id counter
	var nextId = 0;
	$(".shape",$(svg)).each(function ()
	{
		nextId = Math.max(nextId, parseInt($(this).attr("id"))+1);
	});
	
	this.nextId = function()
	{
		return nextId++;
	}

	//
	// Init all function button guis
	//
	
	$('.geopos-action-button').on( 'mouseup', function ( evt ) 
	{
		var $active = $(this);
		$active.removeClass('active');
	});
	$('.geopos-action-button').on( 'mousedown', function ( evt ) 
	{
		var $active = $(this);
		$active.addClass('active');
	});

	
	//
	// Tools
	//
	var toolset = 
	{ 
		"none" : {
					attach : function() {},
					detach : function() {},
					activate : function() {},
					deactivate : function() {}
				 },
	}
	
	this.addTool = function(name, tool)
	{
		toolset[name] = tool;
	}
	
	this.setScale = function(value)
	{
		this.scale = value;
		if (toolset[currentTool].udpateScale)
		{
			toolset[currentTool].udpateScale(value);
		}
	}
	
	var currentTool = "object";
	
	this.setTool = function(layer, tool)
	{
		var selected = this.detach()
		if (toolset[currentTool].deactivate != undefined)
		{
			toolset[currentTool].deactivate(layer);
		}
		currentTool = tool;
		if (toolset[currentTool].activate != undefined)
		{
			toolset[currentTool].activate(layer);
		}
		this.attach(selected);
		
		return toolset[currentTool];
	}
	
	this.getTool = function()
	{
		return currentTool;
	}
	
	//
	// attach current tool to given element
	//
	this.selection = null;
	this.attach = function(element)
	{
		if (element != null)
		{
			this.selection = element;
			if (toolset[currentTool].attach)
			{
				toolset[currentTool].attach(this.selection, this.scale);
			}
		}
    }

	this.detach = function()
	{
		var selected = this.selection;
		if (this.selection != null)
		{
			this.selection = null;
			if (toolset[currentTool].detach)
			{
				toolset[currentTool].detach(selected);
			}
		}
		return selected;
    }
	
	this.isAttached = function()
	{
		return this.selection != null;
	}


	//
	// Picking events will be delegated to layer
	//
	var multiSelect = false;
	var ctrlDn = false; 
	
	this.cancelMultiSelect = function()
	{
		if (multiSelect)
		{
			multiSelect = false;
			callback.multiSelect(multiSelect);
		}
	}

	$(document).on('keydown', this, function(e)
	{
		if (ctrlDn)
		{
			if (e.keyCode == 65)
			{
				callback.selectAll();
			} 
		}
	
		ctrlDn = (e.keyCode == 17); 
		if (!multiSelect)
		{
			if (ctrlDn)
			{
				var temp = e.data.detach();
				if (temp != null)
				{
					callback.deselectNode(temp, multiSelect);
				}
				multiSelect = true;
				callback.multiSelect(multiSelect);
				if (temp != null)
				{
					callback.selectNode(temp, multiSelect);
				}
			}
		}
	});
	
	$(document).on('keyup', this, function(e)
	{
		ctrlDn = false; 
	});
	
	var mousedown = function (e) 
	{
		//console.log('editor mousedown', e.delegateTarget);
		if (multiSelect & !ctrlDn)
		{
			multiSelect = false;
			callback.multiSelect(multiSelect);
			e.preventDefault();
		}
				
		//if (event.which != undefined)
		{
			callback.selectNode(e.delegateTarget, multiSelect);
		}
		//else
		//{
		//	callback.selectNode(e.delegateTarget, multiSelect);
		//}
		e.stopPropagation();
    }
	
	this.register = function(object)
	{
		$(object).bind("mousedown", mousedown);
	}
	
	this.unregister = function(object)
	{
		$(object).unbind("mousedown", mousedown);
	}

	$(svg).bind("mousedown", this, function(e)
	{
		if (e.data.selection != null)
		{
			callback.deselectNode(e.data.selection, multiSelect);
		}
		
		if (multiSelect)
		{
			multiSelect = false;
			callback.multiSelect(multiSelect);
		}
	});

	//
	//
	//
	this.editEvent = function (layer)
	{
		callback.editEvent(layer);
	},

	
	// create node from object
	this.addNode = function(parent, json) 
    {
    	var shape = document.createElementNS("http://www.w3.org/2000/svg", json.tagName);
    	
    	for (var i=0; i<json.attributes.length;i++)
   		{
    		shape.setAttributeNS(null, json.attributes[i].id, json.attributes[i].value);
   		}
    	
    	shape.textContent = json.textContent;
    	
    	for (var i=0; i<json.children.length;i++)
   		{
   			this.addNode(shape, json.children[i]);
   		}
    	parent.appendChild(shape);
     	
    	return shape;
    }


	// create object from node
	
	var getTextContent = function(node)
	{
		var text = '';
		for (var i = 0; i < node.childNodes.length; ++i)
		{
			if (node.childNodes[i].nodeType === Node.TEXT_NODE)
			{
				text += node.childNodes[i].textContent;		
			}
		}
		return amToUnicode(text);
	}
	
	this.getNode = function(node) 
    {
		var object = 
		{
			tagName : node.tagName,	
			attributes : [],	
			children : [],
			textContent: getTextContent(node) 
		};

		for (var i=0; i<node.attributes.length;i++)
   		{
			var name = node.attributes[i].name;
			object.attributes[i] = { 
									name : node.attributes[i].name,
									value : node.attributes[i].value 
									};
   		}

		var c = 0;
    	for (var i=0; i<node.childNodes.length;i++)
   		{
    	   	if (node.childNodes[i].nodeType == 1)
	   		{
        		object.children[c++] = this.getNode(node.childNodes[i]);
	   		}
   		}
    	
    	return object;
    }

	//
	// Transform
	//
	
	// parse Transfrom into array
	this.getTransform = function(element)
	{
		var matrix = element.getAttribute("transform").slice(7,-1).split(' ');
		if (matrix == undefined)
		{
			matrix = [ 1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
		}
		else
		{
			for (var i=0; i<matrix.length; i++) 
	      	{
	      		matrix[i] = parseFloat(matrix[i]);
	      	}
		}
      	return matrix;
	}
	
	// initialze transform from array
	this.setTransform = function(element, matrix)
	{
		element.setAttribute("transform", "matrix(" + matrix.join(' ') + ")");
	}

	//
	// Matrixl 
	//
	this.getMatrix = function(element)
	{
    	var transform = this.getTransform(element);

    	var matrix = svg.createSVGMatrix();
    	matrix.a = transform[0];
    	matrix.b = transform[1];
    	matrix.c = transform[2];
    	matrix.d = transform[3];
    	matrix.e = transform[4];
    	matrix.f = transform[5];
      	return matrix;
	}
	
	this.setMatrix = function(element, matrix)
	{
		this.setTransform(element, [ matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f ]);
	}
	
	this.cloneDelete = function()
	{
		if(this.$cloneNewEl != null){
			
			this.$cloneNewEl.remove();
			
			this.$cloneNewEl = null;
			
		}
		
		this.$cloneOldEl.show();
		
		this.selection = this.$cloneOldEl[0];
	}
	
	this.cloneSelect = function()
	{
		this.$cloneNewEl = $(this.selection).clone();
		
		this.$cloneOldEl = $(this.selection).hide();
		
		this.$cloneOldEl.after(this.$cloneNewEl);
		
		//this.$cloneNewEl.attr('origid', this.$cloneNewEl.attr('id'));
		
		//this.$cloneNewEl.attr('id', this.$cloneNewEl.attr('id')+'-clone');
		
		this.selection = this.$cloneNewEl[0];
		
	}
	
	this.cloneApply = function()
	{
		var styleObj = this.$cloneNewEl.data('newstyle');
		
		this.$cloneNewEl.remove();
		
		this.$cloneNewEl = null;
		
		//this.$cloneOldEl.show();
		
		var newClassAttr = this.$cloneOldEl.attr('class');
		
		if(newClassAttr.indexOf(' custom-shape')<0){
			newClassAttr = newClassAttr + ' custom-shape';
		}
		
		this.$cloneOldEl.attr('class', newClassAttr);
		
		this.selection = this.$cloneOldEl[0];
		
		this.setElementStyle(styleObj);
		
		var $select = $(this.selection);
		setTimeout(function(){
			$select.trigger('mousedown');
		},500);
		
	}
	
	//
	// Fill-Color, Stroke-Color 
	//
	this.setElementStyle = function(styleObj)
	{
		if(styleObj == null){
			return null;
		}
		
		if(this.$cloneNewEl != null){
			
			var lastStyleObj = this.$cloneNewEl.data('newstyle');
			
			if(lastStyleObj == null){
				lastStyleObj = {};
			}
			
			$.extend( lastStyleObj, styleObj );
			
			this.$cloneNewEl.data('newstyle', lastStyleObj);
			
		}
		
		var newpattern = styleObj['pattern'];
		
		delete styleObj['pattern'];
		
		for(var styleName in styleObj){
			
			var styleValue = styleObj[styleName];
			
			if(styleName == 'fill'){
				
				if(newpattern != null && newpattern != 'nopattern' && newpattern != 'transparent'){
					
					var $newPattern = $('defs#PROJECT #'+newpattern).clone();
					
					var colorIdVal = styleValue.replace('#','');
					var newPattId = newpattern+'-'+colorIdVal;
					
					$newPattern.attr('id', newPattId);
					
					$('> g',$newPattern).css('stroke', styleValue);
					
					if($('defs#PROJECT #'+newPattId).length == 0){
						$('defs#PROJECT').append($newPattern);
						
						callback.createPattern(newPattId);
					}
					
					styleValue = 'url(#'+newPattId+')';
					
				}else if(newpattern == 'transparent'){
					
					styleValue = newpattern;
					
				}
				
			}
			//console.log('setElementStyle', styleName, styleValue);
			
			//this.selection.style[styleName] = styleValue;
			this.selection.setAttribute(styleName, styleValue);
			
			if(this.$cloneNewEl == null){
				
				// check the fill when pattern
				//var fillValue = this.selection.style["fill"];
				var fillValue = this.selection.getAttribute('fill');
				
				if(fillValue!=null){
					this.selection.setAttribute('data-customshape', fillValue); 
					
					callback.updateAttribute(this.selection, 'data-customshape');
				}
				
				
				var newClassAttr = this.selection.getAttribute('class');
				
				if(newClassAttr.indexOf(' custom-shape')>=0){
					callback.updateAttribute(this.selection, 'class');
				}
				
				//callback.updateAttribute(this.selection, 'style');
				callback.updateAttribute(this.selection, styleName);
				
			}
			
		}
		
	}
		

	//
	// Default styles
	//
	this.styler = null;
	
	this.getStyler = function()
	{
		return this.styler;
	}
	this.setStyler = function(styler)
	{
		this.styler = styler;
	}
	
	this.style = {} 
		
	this.getClass = function(menu)
	{
		return this.styler.getClass(menu);
		//return this.style[menu];
	}
	
	
	//
	// Lisa update triggers
	//
	this.lisaFlag = false;
	
	this.generateLisa = function()
	{
		var temp = this.lisaFlag;
		this.lisaFlag = false;
		return temp;
	}

	this.updateLisa = function()
	{
		this.lisaFlag = true;
	}
}




	