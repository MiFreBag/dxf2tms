function StyleSelector($gui, editor)
{
	var selectedNode = null;
	var $plan = null;
	var selfClass = this;

	$("#stylearea", $gui).append($('#styler1').children("*").clone());
	
	$(".style-button",$gui).mousedown(function ()
	{
		// changes style
		if (selectedNode != null)
		{
			
			if($(this).hasClass('ui-state-disabled')){
				return null;
			}
			
			var clazz = $(".style-item", $(this)).attr("class");
			clazz = clazz.substring(11); // parse out .style-item
			
			var shape = selectedNode.getAttribute("data-tool");
			if (shape == "text")
			{
				editor.detach();
				$(selectedNode).attr('class', 'shape ' + $plan.attr("id") + " " + clazz);  
				editor.attach(selectedNode);
			}
			else if (shape == "symbol")
			{
				//$(selectedNode).attr('class', 'shape ' + clazz);  
			}
			else
			{
				$(selectedNode).attr('class', 'shape ' + $plan.attr("id") + " " + clazz); 
				
				$('#btnCustom', $gui).css("visibility", "hidden");
				if ($(selectedNode).attr("class").indexOf("custom-shape") > -1){  // == hasClass for SVg 		
					$('#btnCustom', $gui).css("visibility", "visible");
				}
				
				selfClass.customElementSetDefault();
				
			}
			editor.callback.updateAttribute(selectedNode, "class");
		};
		
		// activate button
		var $category = $(this).closest(".style-category");
		var $button = $(".style-button.active", $category);
		$button.removeClass("active");
		$button.addClass("inactive");
		
		$button = $(this);
		$button.removeClass("inactive");
		$button.addClass("active");
	});

	
	var $symbolList = $("#symbol", $gui);
	
    $("#symbol-category", $symbolList).change(function(evt) 
	{
    	$("table", $symbolList).css("display","none");
    	$("#"+$(this).val(), $symbolList).show();
	});
	
	
	var mDragSource;
	
	$('td', $gui).bind('dragstart', function (e) 
	{
	    e.originalEvent.dataTransfer.effectAllowed = 'move';
	    var $svg = $('svg', this);
	    mDragSource = $('g', $svg)[0];
	});
	
	
	this.getDragSource = function()
	{
		return mDragSource;
	}
	
	this.setPlan = function($selected)
	{
		$plan = $selected;
		
	}
	
	this.clrPlan = function($selected)
	{
		$plan = null;
	}
	
	// set the type of selected drawing element... i.e circle, rect, etc
	this.setTool = function($layer, tool)
	{
		var category = $(".style-category.active", $gui);
		category.removeClass("active");
		category.addClass("inactive");
		
   		editor.setTool($layer[0], tool);
		if (tool != "edit")
		{
			$(".shape " + $plan.attr("id"),$layer).each(function ()
			{
				editor.unregister(this);
			});
			
			category = $("#"+tool+".style-category", $gui);
			category.removeClass("inactive");
			category.addClass("active");
			
			$('.style-button', category).removeClass('ui-state-disabled');
			$('.style-button.active', category).removeClass('active').addClass("inactive");
			$('.style-button:first', category).addClass("active").removeClass('inactive');
			$('#btnCustom', $gui).css("visibility", "hidden");
			
		}
		else
		{
			$(".shape " + $plan.attr("id"),$layer).each(function ()
			{
				editor.register(this);
			});
		}
	}
	
	// this is called when an element in the canvas is selected.
	this.selectElement = function(node)
	{	
		selectedNode = node;
		
		var shape = node.getAttribute("data-tool");
		if (shape == "text")
		{
			this.$textArea.show();
			this.getText(node);
		}

		if (shape != "symbol")
		{
			// show category
			var $category = $(".style-category.active", $gui);
			$category.removeClass("active");
			$category.addClass("inactive");
			$category = $("#"+shape+".style-category", $gui);
			$category.removeClass("inactive");
			$category.addClass("active");

			// select button
			var $button = $(".style-button.active", $category);
			$button.removeClass("active");
			$button.addClass("inactive");
			var clazz = $(node).attr("class").split(" ");
			$button = $("."+clazz[clazz.length-1], $category).closest(".style-button");
			$button.removeClass("inactive");
			$button.addClass("active");
		}
		
		selfClass.customElementSetDefault();
	}
	
	this.deselectElement = function()
	{	
		if (editor.getTool() == "edit")
		{
			var $category = $(".style-category.active", $gui);
			if ($category != null)
			{
				$category.removeClass("active");
				$category.addClass("inactive");
			}
		}	
		
		selectedNode = null;
	}
	
	this.elementCreated = function(object)
	{
		if (object.tagName == "text")
		{
			this.setText(object);
		}
		
		editor.register(object);
	}

	this.elementDeleted = function(object)
	{
		editor.unregister(object);
	}
	
	this.customElementSetDefault = function(){
		
		if ($(selectedNode).attr("class").indexOf("custom-shape") > -1){  // == hasClass for SVg 
			
			var attrDefault = {
				"fill": "#000000",
				"stroke": "#000000",
				"stroke-width": "0"
			}
			
			for(var attrName in attrDefault){
				if($(selectedNode).attr(attrName) == null){
					$(selectedNode).attr(attrName, attrDefault[attrName]);
				}
			}
			
		}
		
	}
	
	// the shape objects call this function to obtain the current style for the given svg elements i.e. "rect", "oval", "text" etc... 
	this.getClass = function(type)
	{
		// activate button
		var $category = $("#"+type+".style-category", $gui);
		var $button = $(".style-button.active", $category);
		var $item = $(".style-item", $button);
		var clazz = $item.attr("class");
		return clazz.substring(11);  // parse out .style-item
	}
	
	
	///////////////////////////////////////////////////////////////////////////////////
	// styler specific methods and members
	///////////////////////////////////////////////////////////////////////////////////
	

	this.$textArea = $("#textarea",  $gui);
	
	this.$textArea.keyup(this, function(e)
	{
		var code = (e.keyCode ? e.keyCode : e.which);

		if(code == 13) 
		{ 
			var selected = editor.detach();
			if (selected != null)
			{
				var shape = selected.getAttribute("data-tool");
				if (shape == "text")
				{
					e.data.setText(selected);
					editor.callback.updateNode(selected);
				}
			}
			editor.attach(selected);
		}
	});
	
	this.$textArea.focusout(this, function(e)
	{
		var selected = editor.detach();
		if (selected != null)
		{
			var shape = selected.getAttribute("data-tool");
			if (shape == "text")
			{
				e.data.setText(selected)
				editor.callback.updateNode(selected);
			}
		}
		editor.attach(selected);
	});

	
	this.setText = function(node)
	{
		var $text = $(node);
		$text.empty();
		
		var lines = this.$textArea.val().split(/\n/);

		var fontSize = 1.2*parseFloat($text.css('font-size'));
		for(var i in lines) 
		{
			var line = editor.document.createElementNS("http://www.w3.org/2000/svg", "tspan");
			line.setAttribute("x", 0);
			line.setAttribute("y", (i*fontSize)+"px");
			line.textContent = lines[i];
			
			node.appendChild(line);
		}
	}
	
	this.getText = function(node)
	{
		var text = "";
		for(var i=0; i<node.childNodes.length; i++) 
		{
			if (node.childNodes[i].tagName == "tspan")
			{
				text += $(node.childNodes[i]).text()+"\n";
			}
		}
		this.$textArea.val(text);
	}

}






