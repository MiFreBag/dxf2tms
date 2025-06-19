function LayoutLayer($gui, $layer, $defs, editor, viewer, config)
{
    var $buttonbar = $("#buttonbar", $gui);
    var $plan = null;
    var layout = this;
    var limits = JSON.parse(amGet("geopos-plan", "getPlanLimits", []));
    
	var lageChanged = false;
	
	this.lageUpdated = function()
	{
		var temp = lageChanged;
		lageChanged = false;
		return temp;
	}
    
    
    //
    // Leaflet Layers
    //
	
	function createCrs(data)
	{
		var resolution = [ ];
		
		resolution[data.maxzoom] = data.resolution;
		for (i=data.maxzoom-1;i>=0;i--)
		{
			resolution[i] = 2*resolution[i+1];
		}

		if (data.srs === "LV03")
		{
		 	return new L.Proj.CRS.TMS('EPSG:21781', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs',
			data.bounds,
			{
				resolutions: resolution,
			});	
		}
		else if (data.srs === "LV95")
		{
			  // See http://epsg.io/2056
		    return new L.Proj.CRS.TMS('EPSG:2056', "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs",
			data.bounds,
			{
				resolutions: resolution,
			});
		}
	}
	
	function createLayer(path, data)
	{
		return L.tileLayer(path+"/{z}/{x}/{y}.png", 
		{ 
			minZoom: data.minzoom + 1, 
			maxZoom: data.maxzoom, 
			noWrap: true,
			attribution: "BAG Tile Server"
	 	});		
	}
	
	//
	// Leaflet Layers
	//

	$.ajaxSetup({
		async: false
	});
	
	var localComments;
	var localLayer;
	var localCrs;
	var localZoom = 3;
	var localCenter;
	
	if (config.localTilePath != null)
	{
		$.getJSON(config.localTilePath+'/config.json', function(data) 
		{
			data.srs = (data.srs == null) ? "LV03" : data.srs;
			
			localComments = data.comments == null ? "Lokaler Kartenkommentar" : data.comments;
		 	localCrs = createCrs(data);	
		 	localCenter = localCrs.projection.unproject({ x: config.cx, y: config.cy});
			localLayer = createLayer(config.localTilePath, data);
					
		}).fail(function(jqXHR, textStatus, errorThrown) 
		{ 
			amErrorDialog(textStatus, config.localTilePath+'/config.json');
		});
	}
	
	
	var globalComments;
	var globalLayer;
	var globalCrs;
	var globalZoom = 2;
	var globalCenter;
	$.getJSON(config.globalTilePath+'/config.json', function(data) 
	{
		data.srs = (data.srs == null) ? "LV03" : data.srs;
		
		globalComments = data.comments == null ? "Globaler Kartenkommentar" : data.comments;;
		globalCrs = createCrs(data);	
		globalCenter = globalCrs.projection.unproject({ x: config.cx, y: config.cy});
		globalLayer = createLayer(config.globalTilePath, data);
	
	}).fail(function(jqXHR, textStatus, errorThrown) 
	{ 
		amErrorDialog(textStatus, config.globalTilePath+'/config.json');
	});
	
	$.ajaxSetup({
		async: true
	});

    //
    // Leaflet Maps
    //
	
	var currentLayer;
	var currentCrs;
	var currentZoom;
	var currentCenter;

	if (config.localTilePath != null)
	{
		$("#map-legend").text(localComments);
		$("#map-local").css("color","#00ff00");
		currentLayer = localLayer;
		currentCrs = localCrs;
		currentZoom = localZoom;
		currentCenter = localCenter;
	}
	else
	{
		$("#map-legend").text(globalComments);
		$("#map-global").css("color","#00ff00");
		currentLayer = globalLayer;
		currentCrs = globalCrs;
		currentZoom = globalZoom;
		currentCenter = globalCenter;

		$("#map-local").hide();
		$("#map-select").hide();
	}
	
	var map = new L.Map('mapcity',    
	{
		crs: currentCrs 		
	});
	currentLayer.addTo(map);
	map.setView(currentCenter, currentZoom);
	
    map.on('mousemove', function(e) 
    {
        var projected = currentCrs.projection.project(e.latlng);
        $("#xco").text(projected.x.toFixed(2));
        $("#yco").text(projected.y.toFixed(2));
    });
    
	
    //
    // Plan Retcangles
    //
	var RECTANGLE = {};
    
    function createWidget($plan, options)
    {
    	var rect = new L.Rectangle(SvgToLatLng($plan.attr("region")) , options);
    	rect.dragging = new L.Handler.PolyDrag(rect, $plan, RECTANGLE, layout);
        return rect;
    }

    RECTANGLE["LAGEPLAN_BORDER"] = createWidget($("#LAGEPLAN", $defs), {color: "#007800", weight: 1});
    RECTANGLE["LAGEPLAN"] = createWidget($("#LAGEPLAN", $defs), {color: "#ff7800", weight: 4});
    RECTANGLE["AMPELPLAN"] = createWidget($("#AMPELPLAN", $defs), {color: "#ff7800", weight: 4});
    RECTANGLE["SPURENPLAN"] = createWidget($("#SPURENPLAN", $defs), {color: "#ff7800", weight: 4});
    RECTANGLE["DETEKTORPLAN"] = createWidget($("#DETEKTORPLAN", $defs), {color: "#ff7800", weight: 4});
    RECTANGLE["VVAPLAN"] = createWidget($("#VVAPLAN", $defs), {color: "#ff7800", weight: 4});

    
    //
    // Map Selection
    //

	$("#map-select").click(function(e)
    {
		
	    var $listParent = $("<div id='FixedHeightContainer' class='FixedHeightContainer'>");
	    var $list = $("<div class='radio-btn'>");
	    var entries = JSON.parse(amGet("geopos-plan", "getTileList", [config.knoten]));
		for (var i=0; i<entries.length; i++)
		{
			var $item = $("<input id='"+entries[i].timestamp+"' data-path='"+entries[i].tilepath+"' type='radio' name='sss'></input><label id='"+entries[i].timestamp+"' data-path='"+entries[i].tilepath+"' for='"+entries[i].timestamp+"'>"+amFormatDate(new Date(entries[i].timestamp))+ " - " + entries[i].comments+"</label>");
			$item.css('cursor','pointer');
			$list.append($item);
			$item.on("click", function()
			{
				config.localTilePath = $(this).data("path");
				$.getJSON(config.localTilePath+'/config.json', function(data) 
				{
					data.srs = data.srs == null ? "LV03" : data.srs;
					
					map.removeLayer(RECTANGLE["LAGEPLAN_BORDER"]);
					map.removeLayer(RECTANGLE[$plan.attr("id")]);
					
					localComments = data.comments == null ? "Lokaler Kartenkommentar" : data.comments;
					localZoom = Math.min(data.maxzoom, map.getZoom());
					localCenter = map.getCenter();
					
					map.removeLayer(localLayer);
				 	localCrs = createCrs(data);	
					localLayer = createLayer(config.localTilePath, data); 
					map.options.crs = localCrs;
					map.setView(localCenter, localZoom, true);
					map.addLayer(localLayer);
					
					currentLayer = localLayer;
					currentCrs = localCrs;
					
					map.addLayer(RECTANGLE[$plan.attr("id")]);
					map.addLayer(RECTANGLE["LAGEPLAN_BORDER"]);
					$("#map-lege	nd").text(localComments);
							
				}).fail(function(jqXHR, textStatus, errorThrown) 
				{ 
					amErrorDialog(textStatus, config.localTilePath+'/config.json');
				});
				$list.remove();
			});
		}
	
	    $listParent.appendTo($("#map-select").parent());
	  
	    $listParent.css(
	    { 
            bottom: 0, 
            width: 200, 
            "max-height":"300px",
            overflow:"auto",
            left: $(this).position().left + $(this).width() + 3, 
            position: "absolute",
            visibility: "visible",
            zIndex: "1002"
        });
	    
	    $list.appendTo($("#FixedHeightContainer"));
	    $list.css(
	    { 
	    	  height:"auto",
	    	  overflow:"auto"
        });
	    
	    
	    
	    
	    
	    var closeFn = function(event)
	    {
	    	var offset = $listParent.offset();
	    	if (event.pageX < offset.left || event.pageX > offset.left + $listParent.width() || event.pageY < offset.top || event.pageY > offset.top + $listParent.height())
	    	{
	    		$listParent.remove();
	    	}
	    	document.removeEventListener("mousedown", closeFn, true);
	    };
	    
	    document.addEventListener("mousedown", closeFn, true);
    });
	
	$("#map-global").click(function()
    {
		if (currentLayer == globalLayer)
		{
			return;
		}
		$("#map-legend").text(globalComments);
		$("#map-global").css("color","#00ff00");
		$("#map-local").css("color","white");
		$("#map-select").hide();
		map.removeLayer(RECTANGLE[$plan.attr("id")]);
		map.removeLayer(RECTANGLE["LAGEPLAN_BORDER"]);
		 
		localCenter = map.getCenter();
		localZoom = map.getZoom();
		map.removeLayer(localLayer);
		map.options.crs = globalCrs;
 		map.setView(globalCenter, globalZoom, true); 
		map.addLayer(globalLayer);
		currentLayer = globalLayer;
		currentCrs = globalCrs;

		map.addLayer(RECTANGLE[$plan.attr("id")]);
		map.addLayer(RECTANGLE["LAGEPLAN_BORDER"]);
    });
	$("#map-local").click(function()
    {
		if (currentLayer == localLayer)
		{
			return;
		}
		$("#map-legend").text(localComments);
		$("#map-local").css("color","#00ff00");
		$("#map-global").css("color","white");
		$("#map-select").show();
		map.removeLayer(RECTANGLE[$plan.attr("id")]);
		map.removeLayer(RECTANGLE["LAGEPLAN_BORDER"]);
		
		globalCenter = map.getCenter();
		globalZoom = map.getZoom();
		map.removeLayer(globalLayer);
		map.options.crs = localCrs;
		map.setView(localCenter, localZoom, true); 
		map.addLayer(localLayer);
		currentLayer = localLayer;
		currentCrs = localCrs;

		map.addLayer(RECTANGLE[$plan.attr("id")]);
		map.addLayer(RECTANGLE["LAGEPLAN_BORDER"]);
    });

 
 	// add Lageplan rectangle
	map.addLayer(RECTANGLE["LAGEPLAN_BORDER"]);
	RECTANGLE["LAGEPLAN_BORDER"].dragging.disable();

    //
	// Event handlers for auslegung, format and massstab
    //
	function setLimits()
	{
		var plan = limits[$plan.attr("id")];
		
		for (val in plan)
		{
			var $checkbox = $("#"+val, $buttonbar);
			if (plan[val])
			{
				$checkbox.removeClass("ui-state-disabled");
			}
			else
			{
				$checkbox.removeClass("ui-state-disabled");
			}
			$checkbox.attr("disabled", !plan[val]);
		}
	}
	
	$("input:radio", $buttonbar).click(function(evt)
	{
     	$plan.attr($(this).attr("name"), $(this).attr("id"));
   		var $plankopflayer = $("#PLANKOPF.layer");
     	
     	var object = JSON.parse(amGet("geopos-plan", "changePlanLayout", [$plan.attr("id"), $(this).attr("name"), $(this).attr("id")]));
   		
   		// update planrect
    	$plan.attr("region", object["region"]);
     	var latlng = SvgToLatLng($plan.attr("region"));
   		RECTANGLE[$plan.attr("id")].setBounds(latlng);

   		// recreate plankopf
       //	$plankopflayer.remove("#"+$plan.attr("id")+".plankopf");
      	$("#"+$plan.attr("id")+".plankopf").remove();
        editor.addNode($plankopflayer[0], object[$plan.attr("id")]);
    	editor.editEvent("LAYOUT");

       	if ($plan.attr("id") == "LAGEPLAN")
		{
       		lageChanged = true;
       		
       		// update all inner plans as well
       		RECTANGLE["LAGEPLAN_BORDER"].setBounds(latlng);

       		var plan = [ "AMPELPLAN", "SPURENPLAN", "DETEKTORPLAN", "VVAPLAN" ];
       		for (var i in plan)
   			{
       	   		// update planrect
       			$innerplan = $("#"+plan[i], $defs);
       			$innerplan.attr("auslegung",  $plan.attr("auslegung"));
       			$innerplan.attr("format",  $plan.attr("format"));
       			$innerplan.attr("massstab",  $plan.attr("massstab"));
       			$innerplan.attr("region",  $plan.attr("region"));
       			$innerplan.attr("viewbox",  $plan.attr("viewbox"));
       	   		RECTANGLE[plan[i]].setBounds(latlng);
       	   		
       	   		// recreate plankopf
       	       	//$plankopflayer.remove("#"+plan[i]+".plankopf");
       	       	$("#"+plan[i]+".plankopf").remove();
       	        editor.addNode($plankopflayer[0], object[plan[i]]);
   			}
       		
			//$("#generate-button", $gui).trigger("click");
       	}
  		limits = JSON.parse(amGet("geopos-plan", "getPlanLimits", []));
   		setLimits();
 	});
	
	//
	// Svg CH conversion
	//
	
	function SVGtoCHx(val)
	{
		return val;
	}
	function SVGtoCHy(val)
	{
		if (config.srs === "LV03")
		{
			return 256070.0 - val;
		}
		else if (config.srs === "LV95")
		{
			return 1256069.0 - val;
		}
	}

	function CHtoSVGx(val)
	{
		return val;
	}
	function CHtoSVGy(val)
	{
		if (config.srs === "LV03")
		{
			return 256070.0 - val;
		}
		else if (config.srs === "LV95")
		{
			return 1256069.0 - val;
		}
	}

	function SvgToLatLng(viewbox)
	{
	   	var coords = viewbox.split(' ');
		var x0 = SVGtoCHx(parseFloat(coords[0]));
		var y0 = SVGtoCHy(parseFloat(coords[1]));
		var x1 = SVGtoCHx(parseFloat(coords[0]) + parseFloat(coords[2]));
		var y1 = SVGtoCHy(parseFloat(coords[1]) + parseFloat(coords[3]));

		var southWest = currentCrs.projection.unproject({ x:x0, y:y1 });
		var northEast = currentCrs.projection.unproject({ x:x1, y:y0 });
		return [ southWest , northEast ];
 		
		//var northWest = currentCrs.projection.unproject({ x:x1, y:y1 });
		//var southEast = currentCrs.projection.unproject({ x:x0, y:y0 });
		//var southWest = new L.LatLng (southEast.lat, northWest.lng);
		//var northEast = new L.LatLng (northWest.lat, southEast.lng);
		//return [ southWest , northEast ];
	}

	function SvgToChxy(viewbox)
	{
	   	var coords = viewbox.split(' ');
		var x0 = SVGtoCHx(parseFloat(coords[0]));
		var y0 = SVGtoCHy(parseFloat(coords[1]));
		var x1 = SVGtoCHx(parseFloat(coords[0]) + parseFloat(coords[2]));
		var y1 = SVGtoCHy(parseFloat(coords[1]) + parseFloat(coords[3]));
		return [ x0 , y1, x1, y0 ];
	}	
	
	
	
    //
	// generate Hintergrundbild
    //
    
    var zoom;
    function generateBackground(event)
    {
		currentLayer.off("load", generateBackground);
		
		var imageConfig = { 
				tileSize : 0,
				tileUrls : [],
				tileStride : 0,
				sectionMin : null,
				sectionMax : null,
				svgX : 0,
				svgY : 0,
				svgWidth : 0,
				svgHeight : 0
			  };
    	
    	//
    	// Compute tile and bounding rectangle for new background image
    	//
		
		// rectangle min/max in container points
    	var bounds = SvgToLatLng($("#LAGEPLAN", $defs).attr("region"));
    	
		//var b0 = currentCrs.projection.project(bounds[0]);
    	//var b1 = currentCrs.projection.project(bounds[1]);
		//console.log(b0 + "," + b1);
    	
	    var p0 = map.latLngToContainerPoint(bounds[1]);
	    var p1 = map.latLngToContainerPoint(bounds[0]);
	    var containerMin = new L.Point(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y));
	    var containerMax = new L.Point(Math.max(p0.x, p1.x), Math.max(p0.y, p1.y));
	    
		// rectangle min/max in map pixel coordinates
	    var mapMin = containerMin.add(map._getTopLeftPoint());
	    var mapMax = containerMax.add(map._getTopLeftPoint());
		
		// tile subset covering the rectangle
		var tileSize = currentLayer._getTileSize();
		var tileBounds = L.bounds(mapMin.divideBy(tileSize)._floor(), mapMax.divideBy(tileSize)._floor());
		
		// rectangle min/max within the tile subset
		var index = 0;
		for (j = tileBounds.min.y; j <= tileBounds.max.y; j++) 
		{
			for (i = tileBounds.min.x; i <= tileBounds.max.x; i++) 
			{
				imageConfig.tileUrls[index++] = currentLayer.getTileUrl({ x:i, y:j, z:map.getZoom()});
			}
		}
		imageConfig.sectionMin = mapMin.subtract(tileBounds.min.multiplyBy(tileSize));
		imageConfig.sectionMax = mapMax.subtract(tileBounds.min.multiplyBy(tileSize));
		imageConfig.tileSize = tileSize;
		imageConfig.tileStride = tileBounds.max.x - tileBounds.min.x + 1;

		var imageDim = imageConfig.sectionMax.subtract(imageConfig.sectionMin);
		var imageSize = imageDim.x*imageDim.y/(1000*1000); // MB
		
		if (imageSize < 120) // Mega pixel limit
		{
		   	//
		   	// Call server to create image
		   	// 
			amRegister("geopos-planlayout",
			{
				staticCreated: function()
				{
					var region = $("#LAGEPLAN", $defs).attr("region").split(' ');

				   	// Update local Image
				   	var image = $("image", editor.svg);
				   	image.attr("x", 0);
				   	image.attr("y", 0);
				   	image.attr("width", region[2]);
				   	image.attr("height", region[3]);//  "http://localhost/image.jpg?" + new Date().getTime();
				   	image.attr("xlink:href", image.attr("xlink:href")+"?"+ new Date().getTime());
					
					map.setZoom(zoom);
					
					$("span", $("#blockMessage")).text("Dynamisches Hintergrundbild wird erstellt");
				   	amCall("geopos-plan", "createPlanImage", ["dynamic", JSON.stringify(imageConfig), config.autogen], "geopos-planlayout", "dymamicCreated");    		
				},
				dymamicCreated: function()
				{
					$.unblockUI();
					config.autogen = false;
					amUnregister("geopos-planlayout");
					
					// make sure to trigger LISA image recreation on save
					editor.updateLisa();
				}
				
				/*
				dymamicCreated: function()
				{
					$("span", $("#blockMessage")).text("LISA Versorgung wird generiert ... ");
					amCall("geopos-plan", "createLisaImage", [config.autogen], "geopos-planlayout", "lisaCreated");
				},
				lisaCreated: function()
				{
					$.unblockUI();
					config.autogen = false;
					amUnregister("geopos-planlayout");
				}
				*/
			});
	 		
			$("span", $("#blockMessage")).text("Statisches Hintergrundbild wird erstellt");
			amCall("geopos-plan", "createPlanImage", ["static", JSON.stringify(imageConfig), config.autogen], "geopos-planlayout", "staticCreated");
			
			lageChanged = false;
		}
		else
		{
			var zoom = map.getZoom();
			currentLayer.on("load", generateBackground);
			map.setZoom(zoom-1);
			
			//$.unblockUI();
			//amErrorDialog("Bild nicht erstellt!", "Hintergrundbild ist mit " + imageSize.toFixed(2) + " mega pixel zu gross");
		}
    }
    
	$("#generate-button", $gui).button().click(function(evt)
	{
		zoom = map.getZoom();

	    $.blockUI({ css: { 
            border: 'none', 
            padding: '15px', 
            backgroundColor: '#000', 
            '-webkit-border-radius': '10px', 
            '-moz-border-radius': '10px', 
            opacity: .5, 
            color: '#fff' 
        	},
        	message: $("#blockMessage")
        	
        });
	    
		if (zoom == map.getMaxZoom())
		{
			generateBackground();
		}
		else
		{
		    var r1 = currentCrs.projectedBounds;
		    var r2 = SvgToChxy($("#LAGEPLAN", $defs).attr("region"));
		    
		    var intersect = !(r2[0] > r1[2] ||
		    	              r2[2] < r1[0] ||
		    				  r2[1] > r1[3] ||
		    				  r2[3] < r1[1]);
		    
			if (intersect)
			{
				currentLayer.on("load", generateBackground);
				map.setZoom(map.getMaxZoom());
			}
			else
			{
				generateBackground();
			}
		}		
	});
	
    if (config.readonly)
	{
	    $("#generate-button").hide();
	}

	
	if (config.autogen == true)
	{
		setTimeout(function()
		{ 
			$("#generate-button", $gui).trigger( "click" );
		}, 1000);
	}
	
	//
	
    //this.movePlan = function(svgBounds)
	this.movePlan = function(wgsLatLng)
    {
        var chLatLngs = [];
        for (var i=0; i<4; i++)
    	{
        	//console.log("wgs - " + wgsLatLng[i].lng + " - " + wgsLatLng[i].lat);
        	chLatLngs[i] = currentCrs.project(wgsLatLng[i]);
        	//console.log("ch  - " + chLatLngs[i].x + " - " + chLatLngs[i].y);
     	}
        var svgBounds = new L.Point(CHtoSVGx(chLatLngs[0].x),CHtoSVGy(chLatLngs[2].y)) 
    	
	    var plan = $plan.attr("id");
	    
	    var object = JSON.parse(amGet("geopos-plan", "changePlanPosition", [plan, svgBounds.x, svgBounds.y]));
	 	$plan.attr("region", object[plan]);
	 	RECTANGLE[plan].setBounds(SvgToLatLng(object[plan]));
	 	
		var dx = object["dx"];
		var dy = object["dy"];

	   	if ($plan.attr("id") == "LAGEPLAN")
		{
	   		lageChanged = true;
	   		
	        RECTANGLE["LAGEPLAN_BORDER"].setBounds(RECTANGLE[plan].getBounds());
			for (rect in RECTANGLE)
			{
				if (rect != "LAGEPLAN" && rect != "LAGEPLAN_BORDER")
				{
	         	   	$("#"+rect, $defs).attr("region", object[rect]);
	             	RECTANGLE[rect].setBounds(SvgToLatLng(object[rect]));
				}
			}
			
			// move all objects in static layer
			$(".object", $("#STATIC")).each(function ()
			{
				var matrix = editor.getTransform(this);
				matrix[4] -= dx;
				matrix[5] -= dy;
				matrix = editor.setTransform(this, matrix);
			});

			$(".shape", $("#PROJECT0")).each(function ()
			{
				var matrix = editor.getTransform(this);
				matrix[4] -= dx;
				matrix[5] -= dy;
				matrix = editor.setTransform(this, matrix);
			});
			
			$(".shape", $("#PROJECT1")).each(function ()
			{
				var matrix = editor.getTransform(this);
				matrix[4] -= dx;
				matrix[5] -= dy;
				matrix = editor.setTransform(this, matrix);
			});
			
			// update Knotenmitte differently 
			$("#KNOTENMITTE.object").each(function ()
			{
				var matrix = editor.getTransform(this);
				matrix[4] = object["cx"];
				matrix[5] = object["cy"];
				matrix = editor.setTransform(this, matrix);
			});

		}
	   	else
   		{
			$("#"+$plan.attr("id")+".plankopf", $("#PLANKOPF")).each(function ()
			{
				var matrix = editor.getTransform(this);
				matrix[4] += dx;
				matrix[5] += dy;
				matrix = editor.setTransform(this, matrix);
			});
   		}
	   	
   	   	editor.editEvent("LAYOUT");

    }

    //
	// layer methods
    //
    this.clrPlan = function($selected)
    {
    	if ($plan != null)
		{
	        var rect = RECTANGLE[$plan.attr("id")];
	        map.removeLayer(rect);
	        rect.dragging.disable();
	       	if ($plan.attr("id") == "LAGEPLAN")
	       	{
	            map.addLayer(RECTANGLE["LAGEPLAN_BORDER"]);
	       	}
	    	$plan = null;
		}
    }
    
    this.setPlan = function($selected)
    {
    	$plan = $selected;
    	$("input:radio[id="+$plan.attr("auslegung")+"]", $gui).attr('checked',true);
    	$("input:radio[id="+$plan.attr("format")+"]", $gui).attr('checked',true);
    	$("input:radio[id="+$plan.attr("massstab")+"]", $gui).attr('checked',true);

       	if ($plan.attr("id") == "LAGEPLAN")
       	{
       		 map.removeLayer(RECTANGLE["LAGEPLAN_BORDER"]);
       	}
   		setLimits();

        var rect = RECTANGLE[$plan.attr("id")];
        map.addLayer(rect);
        rect.dragging.enable();
    } 		    
	    
    this.activate = function($plan)
    {
	    this.setPlan($plan);

        $("#mapcity").show();
        $("#mapknoten").hide();
        map.invalidateSize();
    }
    this.deactivate = function($plan)
    {
	    this.clrPlan($plan);
	    
        $("#mapcity").hide();
        $("#mapknoten").show();
    }
    
    
}

//LayoutLayer.prjLV95 = new L.Proj.Projection('EPSG:2056', "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
//LayoutLayer.prjLV03 = new L.Proj.Projection('EPSG:21781', "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");

