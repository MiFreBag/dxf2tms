

L.Handler.PolyDrag = L.Handler.extend(
{
    initialize: function (poly, $plan, RECTANGLE, layout) 
    {
     	this._poly = poly;
    	this.$plan = $plan;
    	this.RECTANGLE = RECTANGLE;
    	this.layout = layout;
    },

    addHooks: function () 
    {
        var container = this._poly._container;
        if (!this._draggable) 
        {
            this._draggable = new L.DraggablePoly(container, container)
            .on('dragstart', this._onDragStart, this)
            .on('drag', this._onDrag, this)
            .on('dragend', this._onDragEnd, this);
        }
        this._draggable.enable();
    },

    removeHooks: function () 
    {
        this._draggable.disable();
    },

    moved: function () 
    {
        return this._draggable && this._draggable._moved;
    },

    _onDragStart: function (e) 
    {
        var map = this._poly._map;
    	
        var start = L.latLngBounds(this._poly.getLatLngs());
        this._northEastStart = map.latLngToContainerPoint(start._northEast);
        this._southWestStart = map.latLngToContainerPoint(start._southWest);
        
       	if (this.$plan.attr("id") != "LAGEPLAN")
    	{
       		var limits = L.latLngBounds(this.RECTANGLE["LAGEPLAN"].getLatLngs());
            this._northEastBound = map.latLngToContainerPoint(limits._northEast);
            this._southWestBound = map.latLngToContainerPoint(limits._southWest);
    	}
    },

    _onDrag: function (e) 
    {
        var map = this._poly._map;
        
        var dXY = e.target._dXY;
       	if (this.$plan.attr("id") != "LAGEPLAN")
    	{
       		dXY.x = dXY.x + Math.min(0, this._northEastBound.x - (dXY.x + this._northEastStart.x)) 
       					  + Math.max(0, this._southWestBound.x - (dXY.x + this._southWestStart.x));
       		dXY.y = dXY.y + Math.min(0, this._southWestBound.y - (dXY.y + this._southWestStart.y)) 
       					  + Math.max(0, this._northEastBound.y - (dXY.y + this._northEastStart.y));
    	}

         this._poly.setBounds([map.containerPointToLatLng([ this._northEastStart.x + dXY.x, this._northEastStart.y + dXY.y ]),
                               map.containerPointToLatLng([ this._southWestStart.x + dXY.x, this._southWestStart.y + dXY.y ])]);
    },
    
    
    _onDragEnd: function (e) 
    {
    	this.layout.movePlan(this._poly.getLatLngs());
    }
});





//
// This one below may not necessary. should be able to use L.Draggable directly ... CLEAN THIS UP
// 


L.DraggablePoly = L.Draggable.extend({
    _onDown: function (e) {
    	
        if ((!L.Browser.touch && e.shiftKey) || ((e.which !== 1) && (e.button !== 1) && !e.touches)) 
        {
            return;
        }

        this._simulateClick = true;

        if (e.touches && e.touches.length > 1) {
            this._simulateClick = false;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);
        var el = first.target;

        L.DomEvent.stop(e);

        if (L.Browser.touch && el.tagName.toLowerCase() === 'a') {
            L.DomUtil.addClass(el, 'leaflet-active');
        }

        this._moved = false;
        if (this._moving) {
            return;
        }

        if (!L.Browser.touch) {
            L.DomUtil.disableTextSelection();
           // this._setMovingCursor();
        }

        this._startPoint = new L.Point(first.clientX, first.clientY);

       	//document.addListener
       	L.DomEvent.on(document, "mousemove", this._onMove, this);
       	L.DomEvent.on(document, "mouseup", this._onUp, this);
    },

    _onMove: function (e) {
    	
        if (e.touches && e.touches.length > 1) { return; }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);
        if (this._moved) {
            this._lastPoint = this._newPoint;
        } else {
            this._lastPoint = this._startPoint;
        }
        this._newPoint = new L.Point(first.clientX, first.clientY);
        this._diffVec = this._newPoint.subtract(this._lastPoint);
        this._dXY = new L.Point(e.clientX, e.clientY).subtract(
            this._startPoint
        );


        if (!this._diffVec.x && !this._diffVec.y) { return; }

        L.DomEvent.preventDefault(e);

        if (!this._moved) {
            this.fire('dragstart');
            this._moved = true;
        }

        this._moving = true;
        L.Util.cancelAnimFrame(this._animRequest);
        this._animRequest = L.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
    },

    _updatePosition: function () {
    	
        this.fire('predrag');
		//L.DomUtil.setPosition(this._element, this._newPos);
        this.fire('drag');
    },

    _onUp: function (e) {
    	
    	
        this._dXY = new L.Point(e.clientX, e.clientY).subtract(this._startPoint);

        if (this._simulateClick && e.changedTouches) 
        {
            var first = e.changedTouches[0];
            var el = first.target;
            var dist = (this._newPos && this._newPos.distanceTo(this._startPos)) || 0;

            if (el.tagName.toLowerCase() === 'a') {
                L.DomUtil.removeClass(el, 'leaflet-active');
            }
            if (dist < L.Draggable.TAP_TOLERANCE) {
                this._simulateEvent('click', first);
            }
        }

        if (!L.Browser.touch) {
            L.DomUtil.enableTextSelection();
           // this._restoreCursor();
        }

        L.DomEvent.off(document, "mousemove", this._onMove);
        L.DomEvent.off(document, "mouseup", this._onUp);

        if (this._moved) {
            // ensure drag is not fired after dragend
            L.Util.cancelAnimFrame(this._animRequest);

            this.fire('dragend');
        }
        this._moving = false;
    },
    
    closePopup: function (popup) {
		return this;
	}    
});
