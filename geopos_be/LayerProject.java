package ch.bergauer.am.vs.pages.geopos;

import java.io.StringWriter;
import java.util.LinkedList;
import java.util.Map.Entry;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.util.Log;


public class LayerProject
{
	protected Layer mLayer0;
	protected Layer mLayer1;
	
	public LayerProject(Knoten iPlan, InfoFile iInfoFile)
	{
		try
		{
			// convert to version
			if (InfoFile.getVersion(iPlan.mSvgDocument) == InfoFile.VERSION_1)
			{
				Element lRoot = iPlan.mSvgDocument.getDocumentElement();
				XPath lPath = XPathFactory.newInstance().newXPath();
				
				Element lProject0 = (Element) lPath.evaluate("//g[(@class='layer' and @id='PROJECT')]", lRoot, XPathConstants.NODE);
				// rename PROJECT to PROJECT0
				lProject0.setAttribute("id", "PROJECT0");
				lProject0.setAttribute("style","");
				
				// mark shapes all as LAGEPLAN
				NodeList lList = (NodeList) lPath.evaluate(".//*[contains(concat(' ', @class, ' '), 'shape')]", lProject0, XPathConstants.NODESET);
				for (int i=0; i<lList.getLength(); i++)
				{
					Element lObject = (Element)lList.item(i);
					String lClass = lObject.getAttribute("class");
					lClass = lClass.replace("shape ", "shape LAGEPLAN ");  // " " is important !!
					lObject.setAttribute("class", lClass);
				}
				
				// reposition PROJECT devs
				Element lDevs0 = (Element) lPath.evaluate(".//defs", lProject0, XPathConstants.NODE);
				Element lDevs = (Element) lPath.evaluate("//defs", lRoot, XPathConstants.NODE);
				lDevs0.setAttribute("id", "PROJECT");
				lRoot.insertBefore(lDevs0, lDevs);
	
				// reposition PROJECT style
				Element lStyle0 = (Element) lPath.evaluate(".//style", lProject0, XPathConstants.NODE);
				Element lStyle = (Element) lPath.evaluate("//style", lRoot, XPathConstants.NODE);
				lStyle0.setAttribute("id", "PROJECT");
				lRoot.insertBefore(lStyle0, lStyle);
					
				// reposition PROJECT
				Element lStatic = (Element) lPath.evaluate("//g[(@class='layer' and @id='STATIC')]", lRoot, XPathConstants.NODE);
				lRoot.insertBefore(lProject0, lStatic);
				
				// rename INFO to PROJECT1
				Element lProject1 = (Element) lPath.evaluate("//g[(@class='layer' and @id='INFO')]", lRoot, XPathConstants.NODE);
				lProject1.setAttribute("id", "PROJECT1");
				lProject1.setAttribute("style","");
				
				// move all objects to PROJECT0
				lList = (NodeList) lPath.evaluate(".//*[contains(concat(' ', @class, ' '), 'shape')]", lProject1, XPathConstants.NODESET);
				for (int i=0; i<lList.getLength(); i++)
				{
					Element lObject = (Element)lList.item(i);
					String lClass = lObject.getAttribute("class");
					lClass = lClass.replace("shape ", "shape LAGEPLAN locked ");  // " " is important !!
					lObject.setAttribute("class", lClass);
					lProject0.appendChild(lObject);
				}
				
				Xml.removeWhitespace(lProject0);
				Xml.removeWhitespace(lProject1);
			}
    	}
		catch (Exception e)
		{
			Log.out.error("Creating Porting to new Geopos file format" + iInfoFile.toString(), e);
		}		
		
		mLayer0 = new Layer(iPlan, "PROJECT0");
		mLayer1 = new Layer(iPlan, "PROJECT1");
	}
	
  	public String configure(String iIndexPage) 
 	{
  		StringBuffer lSymbolTable = new StringBuffer();
  		StringBuffer lSymbolCombo = new StringBuffer();
  		
		XPath lPath = XPathFactory.newInstance().newXPath();  
  		
  		for (Entry<String, LinkedList<SymbolProject>> lCategory : SymbolProject.sSymbol.entrySet())
  		{
  			lSymbolCombo.append("<option value='"+lCategory.getKey()+"'"+(lSymbolCombo.length() == 0 ? "selected" : "")+">"+lCategory.getKey()+"</option>\n");  			
  	  		lSymbolTable.append("<table id = '"+lCategory.getKey()+"' style='"+(lSymbolTable.length() != 0 ? "display:none" : "")+"'>\n");
  	  		lSymbolTable.append("<tr>\n");
  	  		
  	  		int lCount = 0;
  			for (SymbolProject lSymbol : lCategory.getValue())
  			{
	  			lSymbolTable.append("<td draggable='true' class='style-button inactive'>\n");
	
	  			try
	  			{
					Element lSvg = (Element) lPath.evaluate("//svg", lSymbol.mDocument, XPathConstants.NODE);
					lSvg.setAttribute("width", "56");
					lSvg.setAttribute("height", "56");
		        	lSvg.setAttribute("class", "style-item symbol");
		
		        	Xml.setTextFeld(lSvg, "??");
					
					StringWriter lWriter = new StringWriter();
		        	Xml.write(lSvg, lWriter);
		        	lSymbolTable.append(lWriter);
		    	
		        	lSvg.removeAttribute("class");
		        	lSvg.removeAttribute("width");
		        	lSvg.removeAttribute("height");
	  			}
	  			catch (Exception e)
	  			{
	  				Log.out.error(e);
	  			}
	  			
	        	lSymbolTable.append("</td>\n");
	  			if (++lCount % 3 == 0)
	  			{
	  				lSymbolTable.append("</tr>\n");
	  				lSymbolTable.append("<tr>\n");
	  			}
  			}
  	  		lSymbolTable.append("</tr>\n");
  	  		lSymbolTable.append("</table>\n");
  		}
		
	//	System.out.println(lSymbolTable.toString());
		iIndexPage = iIndexPage.replace("<PROJECT_SYMBOLS>",  lSymbolTable.toString());
		iIndexPage = iIndexPage.replace("<PROJECT_COMBO>",  lSymbolCombo.toString());
  		return iIndexPage;
 	}
  	
}
