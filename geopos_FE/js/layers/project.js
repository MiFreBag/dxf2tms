function ProjectLayer($gui, $layer0, $layer1, editor, viewer)
{
	var styler = new StyleSelector($gui, editor, $layer0);
	var $plan = null;
	
	var $layer;
	
	//
	// Functions
	//
	$('.geopos-function-button', $gui).on('click', function ( evt ) 
	{
		// update active button
		var $active = $('.geopos-function-button.active', $gui);
		$active.removeClass('active');
		$active = $(this);
		$active.addClass('active');
     	styler.deselectElement();
     	styler.setTool($layer, this.id);
	});
	
	$(".shape",$layer0).each(function ()
	{
		$(this).hide();
	});
	$(".shape",$layer1).each(function ()
	{
		$(this).hide();
	});
	

	//
	// Actions
	//
	var zOrder = new Zorder($gui, editor, this);
	
	$('#clear', $gui).on('click', this, function (evt) 
	{
		evt.data.deselectNode();
		
		$(".shape"+"."+$plan.attr("id"),$layer).each(function ()
		{
			if ($(this).attr("class").indexOf("locked") == -1)
			{
				editor.unregister(this);
				evt.data.deleteNode(this);
			}
		});
		
		$(".ruler-line",$layer).each(function ()
		{
			$(this).remove();
		});
	});
		
	$('#highlight', $gui).on('mousedown', this, function (evt) 
	{
		evt.data.deselectNode();
		
		$(".shape"+"."+$plan.attr("id"),$layer).each(function ()
		{
			var newClassAttr = $(this).attr('class') + ' highlight';
			$(this).attr('class', newClassAttr);
		});
	});
	
	$('#highlight', $gui).on('mouseup', this, function (evt) 
	{
		$(".shape"+"."+$plan.attr("id"),$layer).each(function ()
		{
			var newClassAttr = $(this).attr('class').replace(' highlight', '');
			$(this).attr('class', newClassAttr);
		});
	});	

	var $custombutton = $('#btnCustom', $gui).on('click', this, function (evt) 
	{
		function rgbToHex(color) {
		    color = String(color);

			if (color.indexOf("rgb") == 0) {
		        var nums = /(.*?)rgb\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(color),
		        r = parseInt(nums[2], 10).toString(16),
		        g = parseInt(nums[3], 10).toString(16),
		        b = parseInt(nums[4], 10).toString(16);

				return "#"+ (
					(r.length == 1 ? "0"+ r : r) +
					(g.length == 1 ? "0"+ g : g) +
					(b.length == 1 ? "0"+ b : b)
				);
		    }else if(color.indexOf("#") == 0) {
		        return color;
		    }else{
				return;
			}
		    
		}
		
		function getDashCss(dashType, strokeWidth){
			
			var dashCss = '0px';
			strokeWidth *= 1;
			
			if(dashType == 'point'){
				dashCss = strokeWidth+'px';
			}else if(dashType == 'line'){
				dashCss = (strokeWidth*2)+'px';
			}else if(dashType == 'pointline'){
				dashCss = (strokeWidth*4)+'px '+(strokeWidth*2)+'px '+(strokeWidth*1)+'px '+(strokeWidth*1)+'px '+(strokeWidth*1)+'px '+(strokeWidth*2)+'px ';
			}
			
			return dashCss;
		}
		
		function getDashType(dashCss, strokeWidth){
			
			var dashType = 'none';
			strokeWidth *= 1;
			
			if(dashCss == strokeWidth+'px'){
				dashType = 'point';
			}else if(dashCss == (strokeWidth*2)+'px'){
				dashType = 'line';
			}else if(dashCss.indexOf((strokeWidth*4)+'px')==0){
				dashType = 'pointline';
			}
			
			return dashType;
		}
			
		var buttons = {};
		buttons[amText("dialog.button.yes")] = function() 
		{
			editor.cloneApply();
	        dialog.close();
	    }
		buttons[amText("dialog.button.no")] = function() 
		{
	        dialog.close();
	    }
	 	
		var dialog = amDialog(
		{ 
			autoOpen:true, 
			modal:true, 
			resizable:true, 
			width:420, 
			minHeight:360, 
			title:"Bearbeiten",
			open: function(){
				
				editor.cloneSelect();
				
				$('.translate-handle').hide();
				
				dialog.$('input#stroke').val();
				
				var patternValueType = {
					"#schraffiert1":{"pattern":"schraffiert1","defaultColor":"#2E79D6"},
					"#schraffiert2":{"pattern":"schraffiert1","defaultColor":"#000000"},
					"#schraffiert3":{"pattern":"schraffiert1","defaultColor":"#D6792E"},
					"#schraffiert13":{"pattern":"schraffiert13","defaultColor":"#FFFFFF"},
					"#schraffiert14":{"pattern":"schraffiert13","defaultColor":"#2A4B9B"},
					"#schraffiert15":{"pattern":"schraffiert13","defaultColor":"#E52420"}
				}
				
				var $diagInput = dialog.$('input');
				
				// set the value
				$diagInput.each(function(){
					
					var $inp = $(this);
					var currCss = $(editor.selection).attr(this.name);
					//currCss = (currCss == null)?$inp.attr('data-default'):currCss;
					
					if(currCss == null){
						return;
					}
					
					if($inp.hasClass('asColorPicker')){
						
						// when a pattern on fill
						if($inp.attr('name')=='fill' && currCss.indexOf('url(')>=0){
							
							// example:
							//currCss = 'url("#schraffiert15")';
							
							//var pattId = currCss.substring(5);
							//pattId = pattId.slice(0,-2);
							
							// example:
							//currCss = 'url(#schraffiert15)';
							
							var pattId = currCss.substring(4);
							pattId = pattId.slice(0,-1);
							
							var $patternObj = $('defs#PROJECT '+pattId);
							
							var pattDELIM = '-';
							
							if($patternObj.length > 0){
								
								var pattStrokeColor = '#000000';
								
								// read from css only work on modern browser
								//var pattStrokeColor = $('> g', $patternObj).css('stroke');
								
								if(pattId.indexOf(pattDELIM)>0){
									
									pattStrokeColor = '#' + pattId.substr(pattId.indexOf(pattDELIM) + 1);	// read the color after id
									pattId = pattId.substr(0,pattId.indexOf(pattDELIM));
									
								}else{
									
									if(patternValueType.hasOwnProperty(pattId)){
										pattStrokeColor = patternValueType[pattId]["defaultColor"];	// read the color from patternValueType
									}
									
								}
								
								currCss = rgbToHex(pattStrokeColor);
								
								dialog.$('#pattern').val(patternValueType[pattId]["pattern"]);
								
								//console.log('pattern id', pattId, $patternObj );
							}
							
						}else if($inp.attr('name')=='fill' && (currCss.indexOf('transparent')>=0 || currCss.indexOf('rgba')>=0)){
							
							dialog.$('#pattern').val('transparent');
							
							return; //this is equivalent of 'continue' for jQuery loop
							
						}else{
							currCss = rgbToHex(currCss);
						}
						
					}else if($inp.attr('type')=='numberForOldBrowser'){
						
						currCss = currCss.replace('px', '');
						
					}
					
					$inp.attr('value', currCss);
					
					//console.log('-----CSS:'+currCss+', ATTR:'+$(editor.selection).attr(this.name)+', NAME:'+this.name);
					
				});
				
				$diagInput.on('change, blur', function(e){
					
					var $inp = $(e.currentTarget);
					var styleName = e.currentTarget.name;
					var styleObj = {};
					
					var setCss = e.currentTarget.value;
					
					if($inp.attr('type')=='numberForOldBrowser'){
						setCss = setCss+'px';
					}else if(styleName=='fill'){
						var patternVal = dialog.$('#pattern').val();
						if(patternVal != 'nopattern' && patternVal != 'transparent' ){
							styleObj['pattern'] = patternVal;
						}
					}
					
					if(styleName=='stroke-width'){
						var dashType = dialog.$('#stroke-dasharray').val();
						if(dashType != 'none'){
							styleObj['stroke-dasharray'] = getDashCss(dashType, dialog.$('#stroke-width').val());
						}
					}
					
					styleObj[styleName] = setCss;

					//console.log('styleObj',styleName, styleObj);
					editor.setElementStyle(styleObj);
					
				}).trigger('change');
				
				var currDashCss = $(editor.selection).css('stroke-dasharray');
				currDashCss = (currDashCss==null)?'0px':currDashCss;
				
				dialog.$('#stroke-dasharray').change(function(e){
					
					var styleName = e.currentTarget.name;
					
					var styleObj = {};
					
					var setCss = e.currentTarget.value;
					
					var strokeWidth = dialog.$('#stroke-width').val()*1;
					
					styleObj[styleName] = getDashCss(setCss, strokeWidth);
					
					editor.setElementStyle(styleObj);
					
				});
				
				dialog.$('#stroke-dasharray').val(getDashType(currDashCss, dialog.$('#stroke-width').val()));
				
				dialog.$('#pattern').change(function(e){
					
					var styleName = e.currentTarget.name;
					
					var styleObj = {};
					
					var setCss = e.currentTarget.value;
					
					styleObj[styleName] = setCss;
					
					styleObj['fill'] = dialog.$('#fill').val();
					
					editor.setElementStyle(styleObj);
					
				});
				
				var $inpNumber = dialog.$('input[type="numberForOldBrowser"]');
							      // Restrict input to accept only numeric characters
				$inpNumber.on('keydown', function(event) {
				      var input = event.currentTarget;
				      var value = parseFloat(input.value) || 0; // Use 0 if input value is empty
				      var step = parseFloat(input.getAttribute('step')) || 1; // Default step is 1 if not specified
				      var keyCode = event.keyCode;
				      keyCode = (keyCode>=96&&keyCode<=105)?keyCode-48:keyCode;
				      var mainKeyboardDotKey = 190; // Dot key on the main keyboard
				      var numPadDotKey = 110; // Dot key on the number pad

				      // Allow only digits, decimal point, and navigation keys
				      var allowedKeys = /^[0-9\.]+$/;

				      // Allow Backspace, Tab, Escape, Delete, Arrow keys, and the dot key (.)
				      if (keyCode === 8 || keyCode === 9 || keyCode === 27 || keyCode === 46 || 
				          keyCode === 37 || keyCode === 39 || keyCode === mainKeyboardDotKey || keyCode === numPadDotKey) {
				        return;
				      }

				      // Prevent characters that are not digits or a decimal point
				      if (!allowedKeys.test(String.fromCharCode(keyCode))) {
				        event.preventDefault();
				      }

				      // Handle incrementing/decrementing with step
				      if (keyCode === 38 || keyCode === 40) { // Arrow keys
				        event.preventDefault(); // Prevent the default arrow key behavior

				        if (keyCode === 38) {
				          value += step;
				        } else if (keyCode === 40) {
				          value -= step;
				        }

				        input.value = value.toFixed(1); // Round to one decimal place
				        
				        // Trigger change event for IE10
				        $(input).trigger('blur').trigger('focus');
				        
				      }

				      // Trigger change event on Enter key
				      if (keyCode === 13) { // Enter key
					       $(input).trigger('blur').trigger('focus');
				      }
			      });
			
				
				// minicolor library on root index.html, because the amDialog is on the root
				dialog.$('input.asColorPicker').minicolors({
					keywords: 'transparent',
					swatches:[
						"#ef9a9a",
						"#90caf9",
						"#a5d6a7",
						"#fff59d",
						"#ffcc80",
						"#bcaaa4",
						"#eeeeee",
						"#f44336",
						"#2196f3",
						"#4caf50",
						"#ffeb3b",
						"#ff9800",
						"#795548",
						"#9e9e9e"
					]
				});
					
			},
			close: function(){
				
				///////////////////////////
				// send req to remove unused pattern
				///////////////////////////
				var $allCustomPattern = $('defs#PROJECT > [id^="schraffiert1-"], defs#PROJECT > [id^="schraffiert13-"]');
				
				var toRemovePatternId = $.map( $allCustomPattern, function( pattEl ) {
					var $pattEl = $(pattEl);
					var $shapeEl = $('#PROJECT1 [data-customshape="url(#'+pattEl.id+')"]');
					if($shapeEl.length > 0){
						return null
					}else{
						$pattEl.remove();		// remove also current unused pattern
						return pattEl.id;
					}
				});
				
				if(toRemovePatternId.length > 0){
					amCall("geopos-svg", "deletePattern", [JSON.stringify(toRemovePatternId)]);
				}
				
				editor.cloneDelete();
				$('.translate-handle').show();
			},
		    buttons: buttons
		});
		dialog.openHtml(''+
			'<div id="customShapeDialog">'+
				'<style>'+
					'#customShapeDialog{padding: 0px 0px; overflow: visible;}'+
					'#customShapeDialog > div {background-color:#fff;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.1);padding:10px;width:100%;height:250px;text-align:left;}'+
					'#customShapeDialog > div > span {width: 100%;display:flex;margin-bottom:5px;}'+
					'#customShapeDialog > div > span > label{display:block;margin-top:3px;font-weight:bold;min-width:100px;}'+
					'#customShapeDialog > div > span > input{width:200px;height: 18px;}'+
					'#customShapeDialog > div > span > select{width:200px;height: 24px;}'+
//					'#customShapeDialog > div > span > input[type="color"]{height: revert;}'+
				'</style>'+
			    '<div>'+
				    '<span>'+
						'<label for="pattern">Muster:</label>'+
						'<select id="pattern" name="pattern">'+
							'<option value="nopattern" >Ausgefüllt</option>'+
							'<option value="transparent" >Transparent</option>'+
							'<option value="schraffiert1" >Kariert</option>'+
							'<option value="schraffiert13" >Schraffiert</option>'+
						'</select>'+
					'</span>'+
			    	'<span>'+
						'<label for="fill">Füllfarbe:</label>'+
						'<input type="text" id="fill" name="fill" class="asColorPicker" >'+
					'</span>'+
				    '<span>'+
						'<label for="stroke-dasharray">Rahmenlinie:</label>'+
						'<select id="stroke-dasharray" name="stroke-dasharray">'+
							'<option value="none" >Durchgezogen</option>'+
							'<option value="point" >Gepunktet</option>'+
							'<option value="line" >Gestrichelt</option>'+
							'<option value="pointline" >Strichgepunktet</option>'+
						'</select>'+
					'</span>'+
					'<span>'+
						'<label for="stroke">Rahmenfarbe:</label>'+
						'<input type="text" id="stroke" name="stroke" class="asColorPicker" >'+
					'</span>'+
					'<span>'+
						'<label for="stroke-width">Rahmenbreite:</label>'+
						'<input type="numberForOldBrowser" id="stroke-width" name="stroke-width" step="0.1" >'+
					'</span>'+
			    '</div>'+
			'</div>');
	});
	
    //
    // Overlays
    //
    var $staticoverlay = $("#static-overlay", $gui);

    var showOverlay = function(plan, state)
    {
    	var $button = $(".geopos-tab-button[name='"+plan+"']", $staticoverlay);
    	var $staticlayer = $("#STATIC.layer", $(editor.svg));
    	
    	var category = $button.data("category").split(" ");
    	if (state)
		{
        	for (var i=0; i<category.length; i++)
    		{
            	$("#"+category[i]+".category", $staticlayer).show();
    		}
			$button.addClass('active');
		}
		else
		{
        	for (var i=0; i<category.length; i++)
    		{
            	$("#"+category[i]+".category", $staticlayer).hide();
    		}
			$button.removeClass('active');
		}
    }
    
	$('.geopos-tab-button', $staticoverlay).on( 'click', function ( evt ) 
	{
		var $button = $(this);
		showOverlay($button.attr("name"), !$button.hasClass('active'));
	});
	

	//
	// Lock/Unlock
	//
	
	var $lockbutton = $('#lock.geopos-action-button', $gui);
	
	$lockbutton.on('click', function (evt) 
	{
		var selected = editor.detach();
		var clazz = $(selected).attr("class").split(" ");
		
		if (clazz[2] == "locked")
		{
			$(selected).attr("class", clazz[0] + " " + clazz[1]+ " " + clazz[3]);
			$('.geopos-action-button-icon', $lockbutton).removeClass("locked");
			$('.geopos-action-button-icon', $lockbutton).addClass("unlocked");
		}
		else
		{
			$(selected).attr("class", clazz[0] + " " + clazz[1]+ " locked " + clazz[2]);
			$('.geopos-action-button-icon', $lockbutton).addClass("locked");
			$('.geopos-action-button-icon', $lockbutton).removeClass("unlocked");
		}
		
		editor.attach(selected);
	});
	
	
 	//
	// Activation
	//
	
	this.activate = function($plan)
	{
		editor.setStyler(styler);
		viewer.showBoundary();
    	viewer.enable();
		this.setPlan($plan);
		
    	$("#STATIC.layer", $(editor.svg)).show();
    	
    	showOverlay("LAGEPLAN", true);

	    $('#edit.geopos-function-button', $gui).trigger("click");
	}
		
	this.deactivate = function($plan)
	{
		styler.deselectElement();
		
		editor.setStyler(null);
		viewer.hideBoundary();
    	viewer.disable();
		this.clrPlan($plan);

    	showOverlay("LAGEPLAN", false);
		
    	$("#STATIC.layer", $(editor.svg)).hide();
	}
		
	this.setPlan = function($selected)
	{
		$plan = $selected;
		var id = $plan.attr("id");
		
		viewer.setPlan($plan);
		styler.setPlan($plan);
		
		if (id == "LAGEPLAN")
		{
			$layer = $layer0;
		}
		else
		{
			$layer = $layer1;
			$(".shape"+"."+id,$layer).each(function ()
			{
				$(this).show();
			});
		}
		
		$(".shape"+"."+id,$layer).each(function ()
		{
			editor.register(this);		
		});

	    showOverlay("AMPELPLAN", id == "AMPELPLAN");
	    showOverlay("SPURENPLAN", id == "SPURENPLAN");
	    showOverlay("DETEKTORPLAN", id == "DETEKTORPLAN");
	    showOverlay("VVAPLAN", id == "VVAPLAN");
	    
   		editor.setTool($layer[0], editor.getTool()); // reattach tool 
		
		zOrder.setLayer($layer);
	}

	this.clrPlan = function($selected)
	{
		this.deselectNode();
		var id = $plan.attr("id");

		styler.clrPlan($plan);
		
		$(".shape"+"."+id,$layer).each(function ()
		{
			editor.unregister(this);		
		});
		
		if (id == "LAGEPLAN")
		{
			$layer = null;
		}
		else
		{
			$(".shape"+"."+$selected.attr("id"),$layer).each(function ()
			{
				$(this).hide();
			});
			$layer = null;
		}
		
		$plan = null;
	}
		
	
	//
	// Editor callbacks
	//
	this.selectNode = function(object, multiselection, enableOtherStyleButton)
	{
		var selected = editor.detach();
		styler.deselectElement(selected);
		
		// tool
		var $edit = $("#edit", $gui);
		if (!$edit.hasClass("active"))
		{
			var $active = $('.geopos-function-button.active', $gui);
			$active.removeClass('active');
			$edit.addClass("active");
	  		styler.setTool($layer, "edit");
		}

		// locking
		$lockbutton.css("visibility", "visible");
		if ($(object).attr("class").indexOf("locked") > -1)  // == hasClass for SVg 
		{
			$('.geopos-action-button-icon', $lockbutton).addClass("locked");
			$('.geopos-action-button-icon', $lockbutton).removeClass("unlocked");
		}
		else
		{
			$('.geopos-action-button-icon', $lockbutton).removeClass("locked");
			$('.geopos-action-button-icon', $lockbutton).addClass("unlocked");
		};
		
		$custombutton.css("visibility", "hidden");
		$(".style-button",$gui).removeClass('ui-state-disabled');
		
		if ($(object).attr("class").indexOf("custom-shape") > -1){  // == hasClass for SVg 
			var dataTool = object.getAttribute("data-tool");
			
			$('.style-category#'+dataTool+' .style-button',$gui).not(".style-button.custom-style").addClass('ui-state-disabled');
			
			$custombutton.css("visibility", "visible");
		}
		
   		styler.selectElement(object);
		editor.attach(object);
	}
	
    this.deselectNode = function(object, multiselection)
    {
		styler.deselectElement();
		$lockbutton.css('visibility', 'hidden');
		$custombutton.css("visibility", "hidden");
		return editor.detach();
    }    
    	
	this.createNode = function(object)
	{
    	if ($plan.attr("id") === "LAGEPLAN")
		{
    		editor.updateLisa();
		}

    	object.setAttribute("class", "shape " + $plan.attr("id") + " " + object.getAttribute("class"));
		object.setAttribute("id", editor.nextId());
		object.setAttribute("data-tool", editor.getTool());
		styler.elementCreated(object);
		
		amCall("geopos-svg", "createNode", [$layer.attr("id"), 'layer', JSON.stringify(editor.getNode(object))]);
		
		if ($(object).attr("class").indexOf("custom-shape") > -1){  // == hasClass for SVg 
			
			var self = this;
			setTimeout(function(){
				self.selectNode(object);
				$custombutton.trigger('click');
			},500);
			
		}
		
	}

	this.deleteNode = function(object)
	{
    	if ($plan.attr("id") === "LAGEPLAN")
		{
    		editor.updateLisa();
		}
		
		editor.detach();
		styler.elementDeleted(object);
 		
		$layer[0].removeChild(object);
		amCall("geopos-svg", "deleteNode", [JSON.stringify(editor.getNode(object))]);
   	   	editor.editEvent("PROJECT");
	}
	
	this.createPattern = function(name){
		
		amCall("geopos-svg", "createPattern", [name]);
		
	}
	
	this.deletePattern = function(nameArr){
		
		amCall("geopos-svg", "deletePattern", [nameArr]);
		
	}
	
	this.updateAttribute = function(object, name)
	{
    	if ($plan.attr("id") === "LAGEPLAN")
		{
    		editor.updateLisa();
		}
		//console.log("####### updateAttribute", [$(object).attr('id'), "shape " + $plan.attr("id"), name, $(object).attr(name)]);
		amCall("geopos-svg", "updateAttribute", [$(object).attr('id'), "shape " + $plan.attr("id"), name, $(object).attr(name)]);
	}
	
	this.updateNode = function(object, name)
	{
    	if ($plan.attr("id") === "LAGEPLAN")
		{
    		editor.updateLisa();
		}
		
		amCall("geopos-svg", "updateNode", [JSON.stringify(editor.getNode(object))]);
	}
	
}






