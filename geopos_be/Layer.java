package ch.bergauer.am.vs.pages.geopos;

import java.text.DecimalFormat;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.util.Log;

public class Layer 
{
	public static DecimalFormat sNumberFormat = new DecimalFormat("#.###");

	protected Document mDocument;
	protected Element mElement;
	protected Knoten mPlan;
	
	public Layer(Knoten iPlan, String iId)
	{
		mPlan = iPlan;
		mDocument = iPlan.mSvgDocument;
		
		try
		{
			XPath lPath = XPathFactory.newInstance().newXPath();  
			mElement = (Element) lPath.evaluate("//g[(@class='layer' and @id='"+iId+"')]", mDocument, XPathConstants.NODE);
    		//mElement.setAttribute("style", "display: none");
    	}
		catch (Exception e)
		{
			Log.out.error("Creating Layer element " + iId, e);
		}		
	}
	
	
	// remove the layer from the svg file entirely
	public void delete()
	{
		NodeList lList = mElement.getChildNodes();
		
		for (int i=lList.getLength()-1; i>=0; i--)
		{
			mElement.removeChild(lList.item(i));
		}
	}

}
