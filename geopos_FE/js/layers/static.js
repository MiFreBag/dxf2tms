function StaticLayer($gui, $layer, $defs, editor, viewer, config)
{
	var $list = $("#list", $gui);
	var $symbollist = $(".static-symbollist", $gui);
	var $plan;
	

	//
	// Edit functions (single selection)
	//
    var $singlemode = $("#single-mode", $gui);

	$('.geopos-function-button', $singlemode).on('mousedown', function ( evt ) 
	{
		var $active = $('.geopos-function-button.active', $singlemode);
		$active.removeClass('active');
		$active = $(this); 
		$active.addClass('active');
	});
	
	$('#measure-button', $gui).on('click', { layer:this },  function(evt)
	{
	   	if (editor.isAttached())
	   	{
			$list.val([]);
			$list.trigger("change");
	   	}
		
		$(".object",$layer).each(function ()
		{
			editor.unregister(this);		
		});
		$list.attr("disabled", "disabled");
		$("#filter", $gui).attr("disabled", "");
		
    	editor.setTool($layer[0], "measure");
	});
	
	$('#select-button', $gui).on('click', function(evt)
	{
		$(".object",$layer).each(function ()
		{
			editor.register(this);		
		});
		$list.removeAttr('disabled');
		$("#filter", $gui).removeAttr('disabled');
		
    	editor.setTool($layer[0], "object");
	});
	
	var $attributes = $('#attributes').dialog({
		modal : false,
		width : 220,
		height : 165,
		closeOnEscape : false,
		title : "Attribute",
		position : {my:'left top', at:'left top', of:$('#map-container')}
	});

	$('#attributes-button', $gui).on('click', function(evt)
	{
		if ($attributes.dialog("isOpen"))
		{
			$attributes.dialog("close");
		}
		$attributes.dialog("open");
	});
	

	//
	// Layout functions
	//
	
    var $kopfauslegung = $("#kopfauslegung", $gui);
    var $kopfposition = $("#kopfposition", $gui);
    
    $('.geopos-function-button', $kopfposition).on('click', function(evt) 
    {
		var $active = $('.geopos-function-button.active', $kopfposition);
		$active.removeClass('active');
		$active = $(this); 
		$active.addClass('active');
    	
       	var $plankopf = $("#"+$plan.attr("id")+".plankopf");
        $plankopf.attr("transform", amGet("geopos-plankopf", "changePlankopf", [$plan.attr("id"), $active.attr("id"), $('.geopos-function-button.active', $kopfauslegung).attr("id")]));
        
        editor.editEvent("STATIC");

       	var $kopfconfig = $("geopos\\:plankopf", $plan);  
       	$kopfconfig.attr("position", $active.attr("id"));
    });
 
    $('.geopos-function-button', $kopfauslegung).on('click', function(evt) 
    {
		var $active = $('.geopos-function-button.active', $kopfauslegung);
		$active.removeClass('active');
		$active = $(this); 
		$active.addClass('active');
    	
       	var $plankopf = $("#"+$plan.attr("id")+".plankopf");
  		$plankopf.attr("transform", amGet("geopos-plankopf", "changePlankopf", [$plan.attr("id"), $('.geopos-function-button.active', $kopfposition).attr("id"), $active.attr("id")]));

		editor.editEvent("STATIC");
  		
       	var $kopfconfig = $("geopos\\:plankopf", $plan);  
       	$kopfconfig.attr("auslegung", $active.attr("id"));
    });
    

    $('#invertiert.geopos-action-button', $kopfauslegung).on('click', function(evt) 
    {
    	var $plankopf = $("#"+$plan.attr("id")+".plankopf");
		$plankopf.attr("transform", amGet("geopos-plankopf", "invertPlankopf", [$plan.attr("id")]));
        
        editor.editEvent("STATIC");
    });
    
    
    //
    // Object selection
    //
    $list.change(function ()
	{
    	// remove manipulators from selectecd object
		editor.detach();
    	$symbollist.html("");
    	
    	if (this.value != "")
		{
        	var selector = this.value.replace(new RegExp("\\.", 'g'), "\\.");
        	var object = $("#"+selector+".object", $layer)[0];	// $layer = $("g#STATIC.layer")
        	editor.attach(object);
        	
        	var $defsObj = $("#"+this.value, $defs);
        	
        	var id = $defsObj.attr("id");
        	var category = $defsObj.attr("category");
        	
        	//console.log('#########list change', object, $defsObj, $defsObj.attr("id"), $defsObj.attr("category"), $defsObj.attr("symbolid"));
        	
	    	$symbollist.html(amGet("geopos-static", "getSymbolSelection", [$defsObj.attr("id"), $defsObj.attr("category"), $defsObj.attr("symbolid")]));
	    	
	    	$(".geopos-object-panel", $attributes).attr("style", "display:none");
 	    	var $panel = $("#"+category, $attributes);
	    	if ($panel.length == 1)
    		{
	    		var attribute = JSON.parse(amGet("geopos-static", "getAttribute", [category, id]));
	    		
	    		$panel.attr("style", "display:visible");
		    	$(".geopos-object-attrib", $panel).each(function ()
    	    	{
		    		var text = attribute[$(this).attr("id")];
		    		if (text == null)
	    			{
		    			text = "";
	    			}
		    		$(this).text(text);
    	    	});
    		}
           	var entry = $("option[value='"+this.value+"']", $list);
    		$attributes.dialog('option', 'title', entry.text());
	    	
	        $('td', $symbollist).click(function () 
	        {
	    		var $button = $('td.active', $symbollist);
	    		$button.removeClass("active");
	    		$button.addClass("inactive");
	    		
	    		$button = $(this);
	    		$button.removeClass("inactive");
	    		$button.addClass("active");
	        	
	            var $svg = $('svg', $(this));
	        	var object = editor.detach();
	        	var json = amGet("geopos-static", "changeSymbol", [$(object).attr("id"), $svg.attr("id")]);
	        	object.removeChild(object.getElementsByTagName("g")[0]);
	        	editor.addNode(object, JSON.parse(json));
	        	editor.attach(object);
	        	editor.editEvent("STATIC");
	        	
	        	// change meta data. This is automatically done on the server.
	        	$("#"+$(object).attr("id"), $defs).attr("symbolid", $svg.attr("id"));
	        });
	        
		}
	});
    
    $list.on('dblclick', function ()
	{
    	var object = editor.detach(); 
    	if (object != null)
		{
        	var matrix = editor.getMatrix(object)
        	var viewBox = viewer.getViewbox();
      
        	// remove unpositioned class
           	var entry = $("option[value='"+$(object).attr("id")+"']", $list);
           	if (entry.hasClass("unpositioned"))
       		{
            	matrix.e = viewBox.x + viewBox.width/2;
            	matrix.f = viewBox.y + viewBox.height/2;
            	$(object).attr("class", "object");
            	entry.removeClass("unpositioned");
       		}
           	else
           	{
            	matrix.e = viewBox.x - 1000;
            	matrix.f = viewBox.y - 1000;
            	$(object).attr("class", "object unpositioned");
            	entry.addClass("unpositioned");
       		}
      
           	matrix.a = 1;
           	matrix.b = 0;
           	matrix.c = 0;
           	matrix.d = 1;

        	editor.setMatrix(object, matrix);
           	editor.callback.updateAttribute(object, "transform");
           	editor.callback.updateAttribute(object, "class");
      		
        	editor.attach(object);
        	
           	if (entry.hasClass("unpositioned") == false)
       		{
           		// THIS IS A BIG HACK for a special requirement
	        	if ($plan.attr("id") == "AMPELPLAN")
	        	{
	        		// see if symbol id == 331 Vibra...
	    	    	var symbolid = $("geopos\\:object#"+$(object).attr("id"), $defs).attr("symbolid");
	    	    	if (symbolid === "331")
	        		{
	    	    		var $symbol = $("svg#358", $symbollist);
	    	    		if ($symbol.length > 0)
	        			{
	    	    			$symbol.parent().trigger("click");
	        			}
	        		}
	        	}
       		}
		}
 	});
    

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

    //
    // Overlays
    //
    var $projectoverlay = $("#project-overlay", $gui);
    
    var showProjectOverlay = function(plan, state)
    {
    	var $button = $(".geopos-tab-button[name='"+plan+"']", $projectoverlay);
    	
		var $layer;
		if (plan == "LAGEPLAN")
		{
			$layer = $("#PROJECT0.layer", $(editor.svg));
		}
		else
		{
			$layer = $("#PROJECT1.layer", $(editor.svg));
		}
		
		if (state)
		{
			$(".shape"+"."+plan,$layer).each(function ()
			{
				$(this).show();
			});
			
			$button.addClass('active');
		}
		else
		{
    		$(".shape"+"."+plan,$layer).each(function ()
			{
				$(this).hide();
			});
    		
			$button.removeClass('active');
		}
    }
    
	$('.geopos-tab-button', $projectoverlay).on( 'click', function ( evt ) 
	{
		var $button = $(this);
		showProjectOverlay($button.attr("name"), !$button.hasClass('active'));
	});
    
	
	
	var $objectoverlay = $("#object-overlay", $gui);
	
    var showObjectOverlay = function(plan, state)
    {
    	var $button = $(".geopos-tab-button[name='"+plan+"']", $objectoverlay);

		if (state)
		{
			var list = $button.data("category").split(' ');
			list.forEach(function(element, index)
			{
	    		var $category = $("#"+element+".category", $layer);
		    	$category.show();
			});
			$button.addClass('active');
		}
		else
		{
			var list = $button.data("category").split(' ');
			list.forEach(function(element, index)
			{
	    		var $category = $("#"+element+".category", $layer);
		    	$category.hide();
			});
			$button.removeClass('active');
		}
    }

	$('.geopos-tab-button', $objectoverlay).on( 'click', function ( evt ) 
	{
		var $button = $(this);
		showObjectOverlay($button.attr("name"), !$button.hasClass('active'));
	});	
	
	
    //
    // Activation
    //
    
    this.setPlan = function($selected)
    {
    	$plan = $selected;
    	
      	viewer.setPlan($plan);
    	if ($plan.attr("id") != "LAGEPLAN")
		{
        	viewer.showBoundary()
		}
    	
       	// plankopf
       	var $plankopf = $("#"+$plan.attr("id")+".plankopf");  //,$("#PLANKOPF.layer", $(svg)))
        $plankopf.show();
        
       	var $kopfconfig = $("geopos\\:plankopf", $plan);  
       	
       	$('.geopos-function-button.active', $kopfauslegung).removeClass('active');
       	$("#"+$kopfconfig.attr("auslegung")+".geopos-function-button", $kopfauslegung).addClass('active');
       	
       	$('.geopos-function-button.active', $kopfposition).removeClass('active');
       	$("#"+$kopfconfig.attr("position")+".geopos-function-button", $kopfposition).addClass('active');
    	
    	// project overlays
    	var id = $plan.attr("id");
    	showProjectOverlay("LAGEPLAN", true);
    	showProjectOverlay("AMPELPLAN", id == "AMPELPLAN");
    	showProjectOverlay("SPURENPLAN", id == "SPURENPLAN");
    	showProjectOverlay("DETEKTORPLAN", id == "DETEKTORPLAN");
    	showProjectOverlay("VVAPLAN", id == "VVAPLAN");

       	showObjectOverlay("LAGEPLAN", true);
       	showObjectOverlay("AMPELPLAN", id == "AMPELPLAN");
       	showObjectOverlay("SPURENPLAN", id == "SPURENPLAN");
       	showObjectOverlay("DETEKTORPLAN", id == "DETEKTORPLAN");
       	showObjectOverlay("VVAPLAN", id == "VVAPLAN");
    }
    
    this.clrPlan = function($selected)
    {
		if (editor.getTool() == "multi")
		{
			editor.cancelMultiSelect();		
		}
    
    	// listbox and categories
    	$("option:selected", $list).attr("selected", false);
    	$list.trigger("change");
        	
       	// plankopf
       	var $plankopf = $("#"+$plan.attr("id")+".plankopf");  //,$("#PLANKOPF.layer", $(svg)))
        $plankopf.hide();
        
      	// project overlays
        showProjectOverlay("AMPELPLAN", false);
        showProjectOverlay("SPURENPLAN", false);
        showProjectOverlay("DETEKTORPLAN", false);
        showProjectOverlay("VVAPLAN", false);

       	$plan = null;
    	viewer.hideBoundary()
    }
    
    
    this.activate = function($plan)
    {
    	$('#measure-button', $gui).removeClass("active");    	
    	$('#select-button', $gui).addClass("active");    	

		$(".object",$layer).each(function ()
		{
			editor.register(this);		
		});
    	
		$layer.show();
    	viewer.enable();
    	editor.setTool($layer[0], "object");
    	
     	// fill listbox  ... this is a fix
    	var allPlans =  ["AMPELMAST", "AMPEL", "DETEKTOR", "STEUERGERAET", "SPUR", "VVA", "META", "KNOTEN"];
    	for (var i in allPlans)
		{
    		var id = allPlans[i];
    		var $category = $("#"+id+".category", $layer);
	    	$category.show();
	    	
		    $(".object", $category).each(function(evt) 
		    {
		    	var name = $("geopos\\:object#"+$(this).attr("id"), $defs).attr("name");

		    	if ($(this).attr("class").indexOf("unpositioned") >  -1)
	    		{
		            $list.append("<option value='" + $(this).attr("id") + "' class='unpositioned' >" + name + "</option>");
	    		}
		    	else
	    		{
		            $list.append("<option value='" + $(this).attr("id") + "'>" + name + "</option>");
	    		}
		    });
		};    	
    	// 
    	
 	    this.setPlan($plan);
	    
		$list.removeAttr('disabled');
		$("#filter", $gui).removeAttr('disabled');
		
		$attributes.dialog("open");
    }
    
    
    
    this.deactivate = function($plan)
    {
	    this.clrPlan($plan);
    	editor.setTool($layer[0], "none");
    	viewer.disable();
		$layer.hide();
		
    	$list.html("");
    	
     	//   ... this is a fix
       	var allPlans =  ["AMPELMAST", "AMPEL", "DETEKTOR", "STEUERGERAET", "SPUR", "META", "KNOTEN"];
    	for (var i in allPlans)
		{
    		var id = allPlans[i];
    		var $category = $("#"+id+".category", $layer);
    		$category.hide();
		};
    	//

		$(".object",$layer).each(function ()
		{
			editor.unregister(this);		
		});
		
		$attributes.dialog("close");
    }

	//
	// Editor callbacks
	//
    this.selectNode = function(object, multiselect)
    {
    	var id = $(object).attr("id");
    	
    	if (!multiselect)
    	{
    		$("option[value='"+id+"']", $list).attr("selected", true);
    		$list.trigger("change");
       	}
    	else
   		{
        	editor.attach(object);
   		}
    }
    
    this.deselectNode = function(object, multiselect)
    {
    	if (!multiselect)
    	{
	    	$("option[value='"+$(object).attr("id")+"']", $list).attr("selected", false);
	    	$list.trigger("change");
       	}
    	else
   		{
        	editor.detach(object);
   		}
   }    
    
    
	this.multiSelect = function(state)
	{
    	if (state)
		{
        	editor.setTool($layer[0], "multi");
        	$("#filter", $gui).attr("disabled", "disabled");
        	$list.prop('disabled', true);
        	$("#single-mode", $gui).hide();
        	$("#multi-mode", $gui).show();
		}
    	else
		{
        	editor.setTool($layer[0], "object");
        	$("#filter", $gui).removeAttr("disabled");
        	$list.prop('disabled', false);
        	$("#single-mode", $gui).show();
        	$("#multi-mode", $gui).hide();
 		}
    }
    
	this.selectAll = function(state)
	{
		var _this = this;
		$("option", $list).each(function(evt) 
		{
           	if ($(this).hasClass("unpositioned") == false)
       		{
    			var object = $("#"+$(this).attr("value")+".object", $layer)[0];
    			_this.selectNode(object, true);
       		}
		});
	}    
    
    this.updateAttribute = function(object, name)
    {
    	var id = $(object).attr("id");
    	
    	if (id == "MASSSTAB")
		{
    		editor.updateLisa();
		}
		
    	amCall("geopos-svg", "updateAttribute", [id, 'object', name, $(object).attr(name)]);
    }
    
	this.deleteObject = function(object)
	{
    	//amCall("geopos-svg", "deleteObject", [$(object).attr('id')]);
	}
	
	
	editor.addTool("object", new SingleSelectTool(editor, $gui, $layer[0]))
	editor.addTool("multi", new MultiSelectTool(editor, $gui, $layer[0]))
}
