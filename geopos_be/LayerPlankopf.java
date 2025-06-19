package ch.bergauer.am.vs.pages.geopos;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Element;

import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.util.Log;

public class LayerPlankopf extends Layer
{
	public static final String REMOTE_ID = "geopos-plankopf";
	
	public static String DEFAULT_POSITION = "oben-links";
	public static String DEFAULT_AUSLEGUNG = "quer";
	
	protected InfoFile mInfoFile;
	
	public LayerPlankopf(Knoten iPlan, InfoFile iInfoFile)
	{
		super(iPlan, "PLANKOPF");
		
		mInfoFile = iInfoFile;
		
		try
		{	
			XPath lPath = XPathFactory.newInstance().newXPath();
			Projection lLagePlan = new Projection(mInfoFile, (Element)lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mDocument, XPathConstants.NODE));

			createPlankopf("LAGEPLAN", lLagePlan);
			createPlankopf("AMPELPLAN", lLagePlan);
			createPlankopf("DETEKTORPLAN", lLagePlan);
			createPlankopf("SPURENPLAN", lLagePlan);
			createPlankopf("VVAPLAN", lLagePlan);
		}
		catch (Exception e)
		{
			Log.out.error("Creating object elements INFO", e);
		}
	}
	
	
	public Element createPlankopf(String iId, Projection iLageProjection) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		
		Element lPlankopf = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='"+iId+"')]", mElement, XPathConstants.NODE); 
		
		if (lPlankopf == null)
		{
			// create Layer element
			lPlankopf = mDocument.createElement("g");
			lPlankopf.setAttribute("id", iId);
			lPlankopf.setAttribute("class", "plankopf");
			lPlankopf.setAttribute("style", "display: none");
			mElement.appendChild(lPlankopf);

			Element lPlanKonfig = (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+iId+"']", mDocument, XPathConstants.NODE);
			Projection lPlanProjection = new Projection(mInfoFile, lPlanKonfig);
			
			SymbolStatic lSymbol = SymbolStatic.getPlankopf(lPlanProjection);
			lSymbol.insert(mDocument, lPlankopf);
			
			Element lPlankopfKonfig = (Element)lPath.evaluate(".//*[local-name()='plankopf']", lPlanKonfig, XPathConstants.NODE);
		// use MASSSTAB and FORMAT from FILE	
		//	lPlanInfo.put("MASSSTAB", lPlanKonfig.getAttribute("massstab"));
		//	lPlanInfo.put("FORMAT", lPlanKonfig.getAttribute("format"));
			computePosition(lPlankopf, lPlankopfKonfig.getAttribute("position"), lPlankopfKonfig.getAttribute("auslegung"), iLageProjection, lPlanProjection);
		}
		else
		{
			// check to see if Plankopf has already been upgraded. 
			Element lBearbeitung = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='BEARBEITUNG')]", lPlankopf, XPathConstants.NODE); 
			if (lBearbeitung == null)
			{
				while (lPlankopf.hasChildNodes())
				{
					lPlankopf.removeChild(lPlankopf.getFirstChild());
				}
				
				// upgrade this Knoten to contain the new PlanKopf info
				Element lPlanKonfig = (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+iId+"']", mDocument, XPathConstants.NODE);
				Projection lPlanProjection = new Projection(mInfoFile, lPlanKonfig);
				
				SymbolStatic lSymbol = SymbolStatic.getPlankopf(lPlanProjection);
				lSymbol.insert(mDocument, lPlankopf);
			}
		}
		


		mInfoFile.setupPlankopf(lPlankopf, iId, InfoFile.BEARBEITEN,  mInfoFile.getPlanInfo(iId));
		return lPlankopf;
	}
	
	protected void computePosition(Element iPlankopf, String iPosition, String iAusrichtung, Projection iLageProjection, Projection iPlanProjection)
	{
		SymbolStatic lSymbol = SymbolStatic.getPlankopf(iPlanProjection);
		
		double iLeft = iPlanProjection.mSvgLeft - iLageProjection.mSvgLeft;
		double iTop = iPlanProjection.mSvgTop - iLageProjection.mSvgTop;
		
		if (iPosition.equals("oben-links"))
		{
			if (iAusrichtung.equals("quer"))
			{
				Double lLeft = iLeft + lSymbol.mWidth/2;
				Double lTop = iTop + lSymbol.mHeight/2;
				iPlankopf.setAttribute("transform", "matrix(1 0 0 1 " + lLeft+" "+ lTop+")");
			}
			else
			{
				Double lLeft = iLeft + lSymbol.mHeight/2;
				Double lTop = iTop + lSymbol.mWidth/2;
				iPlankopf.setAttribute("transform", "matrix(0 -1 1 0 " + lLeft+" "+ lTop+")");
			}
		}
		else if (iPosition.equals("oben-rechts"))
		{
			if (iAusrichtung.equals("quer"))
			{
				Double lLeft = iLeft + iPlanProjection.mWidth - lSymbol.mWidth/2;
				Double lTop = iTop + lSymbol.mHeight/2;
				iPlankopf.setAttribute("transform", "matrix(1 0 0 1 " + lLeft+" "+ lTop+")");
			}
			else
			{
				Double lLeft = iLeft + iPlanProjection.mWidth - lSymbol.mHeight/2;
				Double lTop = iTop + lSymbol.mWidth/2;
				iPlankopf.setAttribute("transform", "matrix(0 -1 1 0 " + lLeft+" "+ lTop+")");
			}
		}
		else if (iPosition.equals("unten-links"))
		{
			if (iAusrichtung.equals("quer"))
			{
				Double lLeft = iLeft + lSymbol.mWidth/2;
				Double lTop = iTop + iPlanProjection.mHeight - lSymbol.mHeight/2;
				iPlankopf.setAttribute("transform", "matrix(1 0 0 1 " + lLeft+" "+ lTop+")");
			}
			else
			{
				Double lLeft = iLeft + lSymbol.mHeight/2;
				Double lTop = iTop + iPlanProjection.mHeight - lSymbol.mWidth/2;
				iPlankopf.setAttribute("transform", "matrix(0 -1 1 0 " + lLeft+" "+ lTop+")");
			}
		}
		else if (iPosition.equals("unten-rechts"))
		{
			if (iAusrichtung.equals("quer"))
			{
				Double lLeft = iLeft + iPlanProjection.mWidth - lSymbol.mWidth/2;
				Double lTop = iTop + iPlanProjection.mHeight - lSymbol.mHeight/2;
				iPlankopf.setAttribute("transform", "matrix(1 0 0 1 " + lLeft+" "+ lTop+")");
			}
			else
			{
				Double lLeft = iLeft + iPlanProjection.mWidth - lSymbol.mHeight/2;
				Double lTop = iTop + iPlanProjection.mHeight - lSymbol.mWidth/2;
				iPlankopf.setAttribute("transform", "matrix(0 -1 1 0 " + lLeft+" "+ lTop+")");
			}
		}
		
	}
	
	
	//
	// Remote Methods called by browser
	//
    @RemoteMethod
    public String changePlankopf(ServerCall iCall, String iId, String iPosition, String iAusrichtung)
    {
    	try
    	{
			XPath lPath = XPathFactory.newInstance().newXPath();
			Element lPlankopf = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='"+iId+"')]", mElement, XPathConstants.NODE);
			
			Projection lLageProjection = new Projection(mInfoFile, (Element)lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mDocument, XPathConstants.NODE));
			Projection lPlanProjection = new Projection(mInfoFile, (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+iId+"']", mDocument, XPathConstants.NODE));
			computePosition(lPlankopf, iPosition, iAusrichtung, lLageProjection, lPlanProjection);
			
			Element lPlanConfig = (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+iId+"']", mDocument, XPathConstants.NODE);
			Element lPlanKopfConfig = (Element)lPath.evaluate(".//*[local-name()='plankopf']", lPlanConfig, XPathConstants.NODE);
			
			lPlanKopfConfig.setAttribute("auslegung", iAusrichtung);
 			lPlanKopfConfig.setAttribute("position", iPosition);
			
			return lPlankopf.getAttribute("transform");
    	}
    	catch (Exception e)
    	{
			Log.out.error("adding changePlankopf ", e);
    	}
    	return "";
    }

    @RemoteMethod
    public String invertPlankopf(ServerCall iCall, String iId)
    {
    	try
    	{
			XPath lPath = XPathFactory.newInstance().newXPath();
			Element lPlankopf = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='"+iId+"')]", mElement, XPathConstants.NODE);
			
			String lValues = lPlankopf.getAttribute("transform");
			lValues = lValues.substring(lValues.indexOf('(')+1, lValues.indexOf(')')).trim();
			String[] lMatrix = lValues.split(" ");

			lMatrix[0] = String.valueOf(-Integer.parseInt(lMatrix[0]));
			lMatrix[1] = String.valueOf(-Integer.parseInt(lMatrix[1]));
			lMatrix[2] = String.valueOf(-Integer.parseInt(lMatrix[2]));
			lMatrix[3] = String.valueOf(-Integer.parseInt(lMatrix[3]));
			
			lPlankopf.setAttribute("transform", "matrix("+lMatrix[0]+" "+lMatrix[1]+" "+lMatrix[2]+" "+lMatrix[3]+" "+lMatrix[4]+" "+lMatrix[5]+")");
			
			return lPlankopf.getAttribute("transform");
    	}
    	catch (Exception e)
    	{
			Log.out.error("adding changePlankopf ", e);
    	}
    	return "";
    }

}
