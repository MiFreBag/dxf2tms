function Zorder($gui, editor, container)
{
	var zIndex = null;
	var $layer = null;
	
	this.setLayer = function($object)
	{
		$layer = $object;
	}
	
	function insertBefore(srce, dest)
	{
		// skip text nodes
		while (dest != null && dest.nodeType !== 1)
		{
			dest = dest.nextSibling;
		}
		
	    amGet("geopos-svg", "insertBefore", [$layer.attr("id"), srce.getAttribute("id"), (dest == null) ? "null" : dest.getAttribute("id")]);
		$layer[0].insertBefore(srce, dest);
	}
	
	
	$('.geopos-zorder-button', $gui).on( 'mousedown', function (evt) 
	{
		var $active = $(this);
		
		if (editor.isAttached())
		{
			zIndex = container.deselectNode();
		}
		
		if (zIndex != null)
		{
			if (zIndex.parentNode == null)
			{
	 			// been deleted
				zIndex = null; 
			}
		}
		
		if (zIndex)
		{
			var button = $active.attr("id");

			if (button == "front")
			{
				insertBefore(zIndex, null);
			}			
			else if (button == "forward")
			{
				var nextSibling = zIndex.nextSibling; 

				// skip text nodes
				while (nextSibling != null && nextSibling.nodeType !== 1)
				{
					nextSibling = nextSibling.previousSibling;
				}
				
				if (nextSibling != null)
				{
					insertBefore(zIndex, nextSibling.nextSibling);
				}
			}
			else if (button == "backward")
			{
				var previousSibling = zIndex.previousSibling; 
				while (previousSibling != null && previousSibling.nodeType !== 1)
				{
					previousSibling = previousSibling.previousSibling;
				}
				
				if (previousSibling != null)
				{
					if (previousSibling.tagName == "style")
					{
						insertBefore(zIndex, previousSibling.nextSibling);
					}
					else
					{
						insertBefore(zIndex, previousSibling);
					}
				}
			}
			else if (button == "back")
			{
				insertBefore(zIndex, $layer[0].firstChild);
			}
		}
	});

	
}