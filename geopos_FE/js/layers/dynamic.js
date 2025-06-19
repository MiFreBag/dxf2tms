function ViewboxTool(editor, $layer) 
{
	var svg = editor.svg;
	var p0;
	var pN;
	
	var shape = editor.document.createElementNS("http://www.w3.org/2000/svg", "rect");
	shape.setAttribute("class", "select-outline");
	
	var mousedown = function(evt) 
	{
	    p0 = svg.createSVGPoint();   
	    p0.x = parseInt(evt.clientX);
	    p0.y = parseInt(evt.clientY);
		p0 = p0.matrixTransform(svg.getScreenCTM().inverse());
  		shape.setAttribute("width", "1");
 		shape.setAttribute("height", "1");
    	shape.setAttribute("x", p0.x);
    	shape.setAttribute("y", p0.y);
 
     	$(svg).bind("mousemove", mousemove);
      	$(svg).bind("mouseup", mouseup);
      	evt.preventDefault();
      	evt.stopPropagation();
	};
	
    var mousemove = function(evt) 
    {
	    pN = svg.createSVGPoint();   
	    pN.x = parseInt(evt.clientX);
	    pN.y = parseInt(evt.clientY);
	    pN = pN.matrixTransform(svg.getScreenCTM().inverse());
	    
    	var x0 = Math.min(p0.x, pN.x);
    	var x1 = Math.max(p0.x, pN.x);
    	var y0 = Math.min(p0.y, pN.y);
    	var y1 = Math.max(p0.y, pN.y);

    	var dx = x1-x0;
    	var dy = y1-y0;
    	
    	shape.setAttribute("x", x0);
    	shape.setAttribute("y", y0);
    	shape.setAttribute("width", Math.max(1.0,dx));
    	shape.setAttribute("height",Math.max(1.0,dy));
	    
      	evt.preventDefault();
      	evt.stopPropagation();
	};	
	
	var mouseup = function(evt) 
	{
		var viewbox = shape.getAttribute("x") + " " + shape.getAttribute("y") + " " + shape.getAttribute("width") + " " + shape.getAttribute("height");
    	amCall("geopos-svg", "updateAttribute", [$layer.attr('id'), 'layer', 'data-viewbox', viewbox]);
   	   	editor.editEvent("DYNAMIC");

    	$(svg).unbind("mousemove", mousemove);
      	$(svg).unbind("mouseup", mouseup);
 		evt.preventDefault();
      	evt.stopPropagation();
	};
	
	this.activate = function(root)
	{
    	$(svg).bind("mousedown", mousedown);
     	
		shape.setAttribute("stroke-width", editor.scale);
    }
	
	this.deactivate = function(root)
	{
      	$(svg).unbind("mousedown", mousedown);
	}
	
	
	this.attach = function(root)
	{
		root.appendChild(shape);

		var viewbox = $layer.attr("data-viewbox").split(' ');
	   	shape.setAttribute("x", viewbox[0]);
    	shape.setAttribute("y", viewbox[1]);
    	shape.setAttribute("width", viewbox[2]);
    	shape.setAttribute("height", viewbox[3]);
		shape.setAttribute("stroke-width", editor.scale);
	}
	
	this.detach = function(root)
	{
		root.removeChild(shape);
	}
	
}
	

function DynamicLayer($gui, $layer, $defs, editor, viewer)
{
	var $list = $("#list", $gui);
	var $symbolList = $("#symbol", $gui);

	var viewBox = new ViewboxTool(editor,$layer);
	editor.addTool("viewbox", viewBox);
	
    //
    // Object selection
    //
    $list.change(function ()
	{
    	// remove manipulators from selectecd object
		editor.detach();
    	
    	if (this.value != "")
		{
    		$symbolList.show();

        	var selector = this.value.replace(new RegExp("\\.", 'g'), "\\.");
        	var object = $("#"+selector+".object", $layer)[0];
        	editor.attach(object);
        	
        	var objId = $(object).attr("id");
        	var $optDetektor = $('option[value="Detektoren"]', $symbolList);
        	var $optOeV = $('option[value="OeV"]', $symbolList);
        	var $optVVa = $('option[value="VVa"]', $symbolList);
        	var $symCat = $("#symbol-category", $symbolList);
        	
        	if (objId.indexOf("R\.B\.d") > -1)
			{
        		//detektor
           		$optDetektor.prop("disabled", false);
           		$optDetektor.prop("selected", true);
           		$symCat.trigger("change");
           		$symCat.prop("disabled", true);
 			}
        	else if(objId.indexOf('VRSZ.VVA.') == 0)
    		{
        		// vva
        		$optVVa.prop("disabled", false);
           		$optVVa.prop("selected", true);
           		$symCat.trigger("change");
           		$symCat.prop("disabled", true);
    		}
        	else
    		{
        		// spur
        		$optDetektor.prop("disabled", true);
        		$optVVa.prop("disabled", true);
        		$optOeV.prop("selected", true);
        		$symCat.trigger("change");
        		$symCat.prop("disabled", false);
    		}
  		}
    	else
		{
    		$symbolList.hide();
		}
	});
    
	$symbolList.hide();

	$("#filter", $gui).keyup(function()
	{
		if (editor.isAttached())
		{
			$list.val([]);
			$list.trigger("change");
		}
		
		var filter = $(this).val();
		$('option', $list).each(function()
		{
			var text = $(this).text();
			if (text.indexOf(filter) == -1)
			{
				if ($(this).parent().prop("tagName").toLowerCase() !== "span")
				{
					$(this).wrap('<span/>');
				}
			}
			else
			{
				if ($(this).parent().prop("tagName").toLowerCase() === "span")
				{
					$(this).unwrap()
				}
			}
		});
	});
    
	function escape(id) 
	{
	    return id.replace( /(:|\.|\[|\]|,)/g, "\\$1" );
	}

	
    $("#symbol-category", $symbolList).change(function(evt) 
	{
     	$("table", $symbolList).css("display","none");
    	$("#"+$(this).val(), $symbolList).show();
	});
    
    $('td', $symbolList).click(function () 
    {
		var $button = $('td.active', $symbolList);
		$button.removeClass("active");
		$button.addClass("inactive");
		
		$button = $(this);
		$button.removeClass("inactive");
		$button.addClass("active");

        var $svg = $('svg', $(this));
    	var object = editor.detach();
    	var json = amGet("geopos-dynamic", "changeSymbol", [$(object).attr("id"), $svg.attr("id")]);
    	object.removeChild(object.getElementsByTagName("g")[0]);
    	editor.addNode(object, JSON.parse(json));
    	editor.attach(object);
    	editor.editEvent("DYNAMIC");

    	// change meta data. This is automatically done on the server.
    	$(object).data("symbol", $svg.attr("id"));
    });
    
    
    
	//
	// Actions
	//
	
	$('#refresh-position', $gui).on('click', function(evt)
	{
		var object = editor.detach();
		var positions = JSON.parse(amGet("geopos-dynamic", "resetPositions", []));
   		for (var i=0; i<positions.length; i++)
		{
   			//console.log(positions[i].transform);
   			//$("#"+escape(positions[i].id), $layer).attr("transform", "matrix(-1.8369701987210297E-16 1.0 -1.0 -1.8369701987210297E-16 56.177000000025146 95.31299999999464)");
   			$("#"+escape(positions[i].id), $layer).attr("transform", positions[i].transform);
		}
   		if (object != null)
		{
   			editor.attach(object);
		}
   	   	editor.editEvent("DYNAMIC");
	});
	

	$('#refresh-symbol', $gui).on('click', function(evt)
	{
    	var object = editor.detach();
		$(".object",$layer).each(function ()
		{
			var $meta = $("#"+$(this).data("static"),$defs);
	    	var json = amGet("geopos-dynamic", "resetSymbol", [$(this).attr("id")]);
	    	this.removeChild(this.getElementsByTagName("g")[0]);
	    	editor.addNode(this, JSON.parse(json));
		});
		if (object != null)
		{
			editor.attach(object);
		}
   	   	editor.editEvent("DYNAMIC");
	});	
	
	$('#deploy-button', $gui).on('click', function(evt)
	{
		var object = editor.detach();
		$("span", $("#blockMessage")).text("Visualisierung wird erstellt... ");
		amRegister("geopos-plansvis",
		{
			completed: function(message)
			{
				if (message != "")
				{
					$("span", $("#blockMessage")).text(message);
					amErrorDialog("Speicherfehler", message);
				}
				$.unblockUI();
				if (object != null)
				{
					editor.attach(object);
				}
				amUnregister("geopos-plansvis");
			},
			
		});
		
		$.blockUI({ css: { 
			border: 'none', 
			padding: '15px', 
			backgroundColor: '#000', 
			'-webkit-border-radius': '10px', 
			'-moz-border-radius': '10px', 
			opacity: .5, 
			color: '#fff'            
			},
			message : $("#blockMessage")	
		}); 
		
		amCall("geopos-dynamic", "deploy", [], "geopos-plansvis", "completed");
	});
	
	
	$('.geopos-function-button', $gui).on( 'mousedown', function ( evt ) 
	{
		var $active = $('.geopos-function-button.active', $gui);
		$active.removeClass('active');
		$active = $(this); 
		$active.addClass('active');
		if ($active.attr("name") == "SELECT")
		{
			$list.removeAttr('disabled');
			$("#filter", $gui).removeAttr('disabled');
		   	viewer.enable();
	  		editor.setTool($layer[0], "object");
	  	
			$(".object",$layer).each(function ()
			{
				editor.register(this);		
			});
		}
		else if ($active.attr("name") == "VIEWBOX")
		{
			$list.val([]);
			$list.trigger("change");
			
		   	viewer.disable();
	  		editor.setTool($layer[0], "viewbox");
			$list.attr("disabled", "disabled");
			$("#filter", $gui).attr("disabled", "");
			
			$(".object",$layer).each(function ()
			{
				editor.unregister(this);		
			});
		}
	});

	//
	// 
	//

    this.selectNode = function(object)
    {
    	$("option[value='"+$(object).attr("id")+"']", $list).attr("selected", true);
    	$list.trigger("change");
		$list.prop('disabled', false);
    }
    
    this.deselectNode = function(object)
    {
		$("option[value='"+$(object).attr("id")+"']", $list).attr("selected", false);
		$list.trigger("change");
    }    


	this.activate = function($plan)
	{
		$(".object",$layer).each(function ()
		{
			editor.register(this);		
		});
		
		$layer.show();
		editor.attach(null);
    	editor.setTool($layer[0], "object");
    	viewer.enable();
	    $(".object", $layer).each(function(evt) 
	    {
	    	var name = $("geopos\\:object#"+$(this).data("static"), $defs).attr("name");
	    	$list.append("<option value='" + $(this).attr("id") + "'>" + name + "</option>");
	    });

	    // show Projecktierungs layer
		$(".shape",$("#PROJECT1.layer", $(editor.svg))).each(function ()
		{
			$(this).show();
		});
		
		viewBox.attach($layer[0]);
    }
	    
    this.deactivate = function($plan)
    {
		$list.val([]);
		$list.trigger("change");
    	
    	$list.html("");
		editor.setTool($layer[0], "none");
		editor.detach();
    	viewer.disable();
    	$layer.hide();
    	
		$(".object",$layer).each(function ()
		{
			editor.unregister(this);		
		});

	    // hide Projecktierungs layer
		$(".shape",$("#PROJECT1.layer", $(editor.svg))).each(function ()
		{
			$(this).hide();
		});
				
	    viewBox.detach($layer[0]);
    }
	    
    this.setPlan = function($plan)
    {
    }

    this.clrPlan = function($plan)
	{
	}
    
    
    this.updateAttribute = function(object, name)
    {
    	amCall("geopos-svg", "updateAttribute", [$(object).attr('id'), 'object', 'transform', $(object).attr('transform')]);
    }
    
    
    
}
