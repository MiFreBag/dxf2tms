package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Map.Entry;

import javax.imageio.ImageIO;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.w3c.dom.ProcessingInstruction;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.config.ClassData;
import ch.bergauer.am.vs.config.UrlConfig;
import ch.bergauer.am.vs.config.UrlConfigEntry;
import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;


public class LayerDynamic extends Layer
{
	public static final String REMOTE_ID = "geopos-dynamic";
	
	protected InfoFile mInfoFile;
	protected VisualServer mServer;
	
	protected static HashMap<String, String[]> sConfigLookup = new HashMap<String, String[]> ();
	

	private interface NumberToDatapoint
	{
		public String convert(int iId);
	};
	
	public LayerDynamic(Knoten iPlan, InfoFile iInfoFile, VisualServer iServer)
	{
		super(iPlan, "DYNAMIC");
		
		sConfigLookup = new HashMap<String, String[]> ();
		
		try
		{
			if (InfoFile.getVersion(mDocument) < InfoFile.VERSION_1_4)
			{
				// move the DYNAMIC layer next to the STATIC layer
				XPath lPath = XPathFactory.newInstance().newXPath();  
				Element lStatic = (Element) lPath.evaluate("//g[(@class='layer' and @id='STATIC')]", mDocument, XPathConstants.NODE);
				mDocument.getDocumentElement().insertBefore(mElement, lStatic);
			}
		}
		catch (Exception e)
		{
			Log.out.error("Moving Dynamic Layer", e);
		}
		
		mInfoFile = iInfoFile;
		mServer = iServer;
		  
		//
		// Get Datapoint from simulator for testing
		// 
		/*		
		DatapointManager lManager = iServer.getDatapointManager();
		try
		{
			HashSet<String> lList = new HashSet<String>();
			for (Datapoint lDp : lManager.registerDatapointEx("K"+iInfoFile.getAttribute(InfoFile.KNOTENNR) + "\\.R\\.B\\.d(\\d+).*", new String[] { Datapoint.ID, Datapoint.VALUE }, "system"))
			{
				lList.add(lDp.getId());
			}
			addCategory(lList, SymbolDynamic.DETEKTOR_REGEX, "DETEKTOR");
			
			lList = new HashSet<String>();
			for (Datapoint lDp : lManager.registerDatapointEx("K"+iInfoFile.getAttribute(InfoFile.KNOTENNR) + "\\.R\\.B\\.sg(\\d+).*", new String[] { Datapoint.ID, Datapoint.VALUE }, "system"))
			{
				lList.add(lDp.getId());
			}
			addCategory(lList, SymbolDynamic.SPUR_REGEX, "SPUR");
		}
		catch (Exception e)
		{
			Log.out.error("creating svg for dynamisierung", e);
		}
		 */
		
		
		/* Remove some time
		ClassData lClass = iServer.getModuleClassData("idcServer");
		if (lClass != null)
		{
			ch.bergauer.am.vs.modules.idc.Installer lIdcModule = (ch.bergauer.am.vs.modules.idc.Installer)lClass.getInstance();
			if (lIdcModule != null)
			{
				try
				{
					addCategory(lIdcModule.getDatapoints("AMGATEDBUS", "Knoten.Detektoren", iInfoFile.getAttribute(InfoFile.KNOTENNR), ""), SymbolDynamic.DETEKTOR_REGEX, "DETEKTOR");
					addCategory(lIdcModule.getDatapoints("AMGATEDBUS", "Knoten.SpurenOcit", iInfoFile.getAttribute(InfoFile.KNOTENNR), ""), SymbolDynamic.SPUR_REGEX, "SPUR");  
				}
				catch (Exception e)
				{
					Log.out.error("creating svg for dynamisierung", e);
				}
			}
		}
		*/
		
		
		// This is a method for deriving datapoints rather than requestig them from the datapoint manager. 
		try
		{
			final String lKnotenNr = mInfoFile.getAttribute(InfoFile.KNOTENNR);
			
			
	   		HashSet<String> lVamId = new HashSet<String> ();
			
			addCategory(LayerStatic.SPUR, new NumberToDatapoint()
			{
				public String convert(int iNumber)
				{
					if (iNumber <= 40)
					{
						return new String("K"+lKnotenNr+".R.B.sg"+iNumber);
					}
					else
					{
						return new String("K"+lKnotenNr+".R.B.do"+(iNumber-40));
					}
				}
			}, lVamId);
			
			addCategory(LayerStatic.DETEKTOR, new NumberToDatapoint()
			{
				public String convert(int iNumber)
				{
					if (iNumber <= 50)
					{
						return new String("K"+lKnotenNr+".R.B.d"+iNumber);
					}
					else
					{
						return new String("K"+lKnotenNr+".R.B.di"+(iNumber-50));
					}			
				}			
			}, lVamId);
			
			
			addCategory(LayerStatic.VVA, new NumberToDatapoint()
			{
				public String convert(int iNumber)
				{
					return new String("VRSZ.VVA.K"+lKnotenNr+".VVA"+iNumber+".REQ");
				}			
			}, lVamId);
			
			
	   		// remove all that refer to missing static objects. Assume they do not exist anymore.
			XPath lPath = XPathFactory.newInstance().newXPath();  
			NodeList lList = (NodeList) lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", mElement, XPathConstants.NODESET); 
			for (int i=0; i<lList.getLength(); i++)
			{
				Element lObject = (Element)lList.item(i);
				if (!lVamId.contains(lObject.getAttribute("data-static")))
				{
					lObject.getParentNode().removeChild(lObject);
				}
			}
			
		}
		catch (Exception e)
		{
			Log.out.error("creating svg for dynamisierung", e);
		}

		
		
		
		if (!mElement.hasAttribute("data-viewbox"))
		{
			try
			{
				XPath lPath = XPathFactory.newInstance().newXPath();  
				Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mDocument, XPathConstants.NODE);
				Projection lProjection = new Projection(mInfoFile, lPlan);
				mElement.setAttribute("data-viewbox", lProjection.getViewbox(lProjection));
			}
			catch (Exception e)
			{
				Log.out.error("creating svg for dynamisierung", e);
			}
		}
	}
	
	
	
	protected void addCategory(String iName, NumberToDatapoint iDatapointMapper, HashSet<String> iObjectFound) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lCategory = (Element) lPath.evaluate("//g[(@class='category' and @id='"+iName+"')]", mElement, XPathConstants.NODE);		
		
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(iName)));
		String lLine = lReader.readLine();
		while ((lLine = lReader.readLine()) != null) 
		{
			String[] lColumn = lLine.split(",",-1);
			
			String lDatapontId = iDatapointMapper.convert(Integer.parseInt(lColumn[5]));
			
			iObjectFound.add(lColumn[0]);
			
			Element lSymbol = (Element) lPath.evaluate(".//g[(@id='"+lDatapontId+"' and contains(concat(' ', @class, ' '), 'object'))]", mElement, XPathConstants.NODE);
			if (lSymbol == null || !lSymbol.getAttribute("data-static").equals(lColumn[0])) // weird hack because id all of a sudden changed
			{
				// static object
				Element lStaticObject = (Element) lPath.evaluate(".//g[(@id='"+lColumn[0]+"' and contains(concat(' ', @class, ' '), 'object'))]", lCategory, XPathConstants.NODE);
				
				// dynamic object
				String lId = lCategory.getAttribute("id");
				SymbolDynamic lDynamicSymbol =  SymbolDynamic.getDefault(lId, lColumn);
				
  		   		String lText = lColumn[5];
	   			if (iName.equals(LayerStatic.DETEKTOR))
				{
   	   		   		try
   	   		   		{
   	   		   			Integer lDistance = Integer.parseInt(lColumn[6]);
   	   		   			if (lDistance > 10.0)
   	   		   			{
   	   		   				lText +=  " (" + lDistance + " m)";
   	   		   			} 
   	   		   		}
   	   		   		catch (Exception e)
   	   		   		{
   	   	   				lText +=  " (.. m)";
   	   		   		}
				}				
				
				Xml.setTextFeld(lDynamicSymbol.mSvgDocument.getDocumentElement(), lText);
				
				Element lGroup = mDocument.createElement("g");
				lGroup.setAttribute("class", "object");
		        lGroup.setAttribute("transform", lStaticObject.getAttribute("transform"));
				lGroup.setAttribute("id", lDatapontId);
				lGroup.setAttribute("data-symbol", lDynamicSymbol.mId);
				lGroup.setAttribute("data-static", lStaticObject.getAttribute("id"));
				lDynamicSymbol.insertSvg(mDocument, lGroup, lDatapontId);
				
				mElement.appendChild(lGroup);
			}
			
			sConfigLookup.put(lDatapontId, lColumn);
		}

		lReader.close();
	}	


  	public String configure(String iIndexPage) 
 	{
  		StringBuffer lSymbolTable = new StringBuffer();
  		StringBuffer lSymbolCombo = new StringBuffer();
  		
		XPath lPath = XPathFactory.newInstance().newXPath();  
  		
  		for (Entry<String, LinkedList<SymbolDynamic>> lCategory : SymbolDynamic.sSymbolCategory.entrySet())
  		{
  			lSymbolCombo.append("<option value='"+lCategory.getKey()+"'"+(lSymbolCombo.length() == 0 ? "selected" : "")+">"+lCategory.getKey()+"</option>\n");
 	   		
  	  		lSymbolTable.append("<table id = '"+lCategory.getKey()+"' style='"+(lSymbolTable.length() != 0 ? "display:none" : "")+"'>\n");
  	  		lSymbolTable.append("<tr>\n");
  	  		
  	  		int lCount = 0;
  			for (SymbolDynamic lSymbol : lCategory.getValue())
  			{
  	  			lSymbolTable.append("<td class='style-button inactive'>\n");

  	  			try
  	  			{
  					Element lSvg = (Element) lPath.evaluate("//svg", lSymbol.mSvgDocument, XPathConstants.NODE);
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
  	  			if (++lCount % 2 == 0)
  	  			{
  	  				lSymbolTable.append("</tr>\n");
  	  				lSymbolTable.append("<tr>\n");
  	  			}
  			}
  	  		lSymbolTable.append("</tr>\n");
  	  		lSymbolTable.append("</table>\n");

  		}

		iIndexPage = iIndexPage.replace("<DYNAMIC_SYMBOLS>",  lSymbolTable.toString());
		iIndexPage = iIndexPage.replace("<DYNAMIC_COMBO>",  lSymbolCombo.toString());
  		return iIndexPage;
 	}

	
	
	//
	// Remote Methods called by browser
	//
	
    @RemoteMethod
    public String changeSymbol(ServerCall iCall, String iObjectId, String iSymbolId)
    {
    	SymbolDynamic lSymbol = SymbolDynamic.get(iSymbolId);
    	try
		{
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lElement = (Element) lPath.evaluate("//g[@id='"+iObjectId+"']", mDocument, XPathConstants.NODE); 
        	if (lElement != null)
        	{
        		Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+lElement.getAttribute("data-static")+"']", mDocument, XPathConstants.NODE);
    			String[] lName = lMeta.getAttribute("name").split(" ");
    	    	String lText = lName[1];
        		
    	    	String lCategory = lMeta.getAttribute("category");
    			if (lCategory.equals(LayerStatic.DETEKTOR))
    			{
    				String[] lColumn = sConfigLookup.get(lElement.getAttribute("id"));
    				if (lColumn != null)  // should never be null
    				{
    	   		   		try
    	   		   		{
    	   		   			Integer lDistance = Integer.parseInt(lColumn[6]);
    	   		   			if (lDistance > 10.0)
    	   		   			{
    	   		   				lText +=  " (" + lDistance + " m)";
    	   		   			} 
    	   		   		}
    	   		   		catch (Exception e)
    	   		   		{
    	   	   				lText +=  " (.. m)";
    	   		   		}
    				}
    			}
    			Xml.setTextFeld(lSymbol.mSvgDocument.getDocumentElement(), lText);
				
        		lElement.removeChild((Element)lElement.getElementsByTagName("g").item(0));
        		lSymbol.insertSvg(mDocument, lElement, lElement.getAttribute("id"));
        		
        		lElement.setAttribute("data-symbol", lSymbol.mId);
        		
            	JsonObject lObject = Xml.toJson((Element)lElement.getElementsByTagName("g").item(0));
            	return lObject.toString();        		
        	}
        	else
        	{
        		Log.out.error("Element not found " + "g[@id='"+iObjectId+"']");
        	}
		}
		catch (Exception e)
		{
			Log.out.error("changing Symbol ", e);
		}
    	
    	return null;
    }
    
       
    @RemoteMethod
    public String resetSymbol(ServerCall iCall, String iObjectId)
    {
    	try
		{
    		XPath lPath = XPathFactory.newInstance().newXPath();
    		Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mDocument, XPathConstants.NODE); 
    		
    		Element lDynamicObject = (Element) lPath.evaluate("//g[@id='"+iObjectId+"']", mDocument, XPathConstants.NODE);
        	if (lDynamicObject != null)
        	{
        		resetSymbol(mDocument, lDynamicObject, lDefs);
            	JsonObject lObject = Xml.toJson((Element)lDynamicObject.getElementsByTagName("g").item(0));
            	return lObject.toString();        		
        	}
        	else
        	{
        		Log.out.error("Element not found " + "g[@id='"+iObjectId+"']");
        	}
		}
		catch (Exception e)
		{
			Log.out.error("changing Symbol ", e);
		}
    	
    	return null;
    }
   
    @RemoteMethod
    public String resetPositions(ServerCall iCall)
    {
    	resetPositions(mElement);
		
		XPath lPath = XPathFactory.newInstance().newXPath();
		JsonArray lArray = new JsonArray();
		try
		{
			NodeList lList = (NodeList) lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", mElement, XPathConstants.NODESET);
			for (int i=0; i<lList.getLength(); i++)
			{
				Element lElement = (Element)lList.item(i);
				JsonObject lObject = new JsonObject();
				lObject.addProperty("id", lElement.getAttribute("id"));
				lObject.addProperty("transform", lElement.getAttribute("transform"));
				lArray.add(lObject);
			}
		}
		catch (Exception e)
		{
			Log.out.error("creating svg for dynamisierung", e);
		}
		
		return lArray.toString();
    }
	
 
     
    @RemoteMethod
    public void deploy(ServerCall iCall)
    {
		ClassData lClass = mServer.getModuleClassData("nodeRegistry");
		ch.bergauer.am.vs.modules.nodes.Installer lNodeRegistry = (ch.bergauer.am.vs.modules.nodes.Installer)lClass.getInstance();
		deploy(mPlan.mInfoFile, mDocument, lNodeRegistry);
        iCall.reply("");
    }
    
    
    public static void deploy(InfoFile iInfoFile, Document iDocument, ch.bergauer.am.vs.modules.nodes.Installer iNodeRegistry)
    {
    	UrlConfigEntry lEntry = UrlConfig.getLink("geopos");
		String lKontenNr = iInfoFile.getAttribute(InfoFile.KNOTENNR);
		String lDeployPath = (String)lEntry.getAttribute("deploypath")+"/"+lKontenNr;
		
		// create deployment directory
		File lDirectory = new File(VisualServer.WEBROOT+"/"+lDeployPath);
		if (!lDirectory.exists())
		{
			lDirectory.mkdir();
		}

		try
		{
			//
			// get root of dynamic section
			//
			XPath lPath = XPathFactory.newInstance().newXPath();
			Element lDynamicRoot = (Element) lPath.evaluate("//g[(@class='layer' and @id='DYNAMIC')]", iDocument, XPathConstants.NODE);
			
			//
			// Create View svg, xml & png
			//
	        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
	        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
			
			// svg
			Document lSvgDocument = lBuilder.newDocument();
			Element lSvgRoot = lSvgDocument.createElement("svg");
			lSvgRoot.setAttribute("xmlns", "http://www.w3.org/2000/svg");
			lSvgRoot.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
			lSvgRoot.setAttribute("baseProfile", "full");
			lSvgRoot.setAttribute("contentStyleType", "text/css");
			lSvgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");
			lSvgRoot.setAttribute("version", "1.1");

			lSvgRoot.setAttribute("viewBox", lDynamicRoot.getAttribute("data-viewbox"));
			lSvgDocument.appendChild(lSvgRoot);

			// 1) import styles
			//lSvgRoot.appendChild(lSvgDocument.importNode((Element) lPath.evaluate("//style[@id='geopos_symb.css']", iDocument.getDocumentElement(), XPathConstants.NODE), true));
			
			// 1) link to styles
			ProcessingInstruction lCss = lSvgDocument.createProcessingInstruction("xml-stylesheet", "type=\"text/xsl\" href=\"/themes/vrsz/images/geoposlib/geopos_symb_dynamic.css\"");
			lSvgDocument.insertBefore(lCss, lSvgRoot);
			
			
			
			// 2) background image
			File lDestImage = new File(VisualServer.WEBROOT+"/"+lDeployPath+"/"+lKontenNr+".png");
			
			File lSrceImage = iInfoFile.getSourceFile("lageplan_dynamic.png");
			if (!lSrceImage.exists())
			{
				// copy image
				lSrceImage = new File(VisualServer.WEBROOT+"/pages/geopos/NoBackground.png");
			}

			if (lSrceImage != null)
			{
	    		ImageIO.write(ImageIO.read(lSrceImage), "png", lDestImage);
			}
			
			lSvgRoot.appendChild(lSvgDocument.importNode((Element) lPath.evaluate("//image[@id='lageplan.png']", iDocument.getDocumentElement(), XPathConstants.NODE), true));
			Element lElement = (Element)lPath.evaluate("/svg/image", lSvgDocument, XPathConstants.NODE);
	        lElement.setAttribute("xlink:href", lDeployPath+"/"+lKontenNr+".png");
	        
			
			// 3) Zeichnung
			lSvgRoot.appendChild(lSvgDocument.importNode((Element) lPath.evaluate("//defs[@id='PROJECT']", iDocument.getDocumentElement(), XPathConstants.NODE), true));
			lSvgRoot.appendChild(lSvgDocument.importNode((Element) lPath.evaluate("//style[@id='PROJECT']", iDocument.getDocumentElement(), XPathConstants.NODE), true));
			Element lProject0 = (Element) lPath.evaluate("//g[(@id='PROJECT0' and @class='layer')]", iDocument.getDocumentElement(), XPathConstants.NODE);
			lProject0.removeAttribute("style");
			lSvgRoot.appendChild(lSvgDocument.importNode(lProject0, true));
			
			Element lProject1 = (Element) lPath.evaluate("//g[(@id='PROJECT1' and @class='layer')]", iDocument.getDocumentElement(), XPathConstants.NODE);
			lProject1.removeAttribute("style");
			// remove all AMPELPLAN objects
			NodeList lList = (NodeList) lPath.evaluate(".//*[contains(concat(' ', @class, ' '), 'AMPELPLAN')]", lProject1, XPathConstants.NODESET);
			for (int i=0; i<lList.getLength(); i++)
			{
				Element lObject = (Element)lList.item(i);
				lProject1.removeChild(lObject);
			}
			lSvgRoot.appendChild(lSvgDocument.importNode(lProject1, true));
	        
			// 4) dynamic symbols
			lSvgRoot.appendChild(lSvgDocument.importNode((Element) lPath.evaluate("//g[(@id='DYNAMIC' and @class='layer')]", iDocument.getDocumentElement(), XPathConstants.NODE), true));
			lElement = (Element)lPath.evaluate("//g[(@id='DYNAMIC' and @class='layer')]", lSvgDocument, XPathConstants.NODE); 
	        lElement.removeAttribute("style");
	        
			Log.out.info("Creating " + VisualServer.WEBROOT+"/"+lDeployPath+"/"+lKontenNr+".svg");
			Xml.write(lSvgDocument, new FileWriter(VisualServer.WEBROOT+"/"+lDeployPath+"/"+lKontenNr+".svg"));
	        
			
			
			HashMap<String, String> mIdToNumber = new HashMap<String, String>();
			
			//
			// Read SPUR and 
			//
			File lFile = iInfoFile.getSourceFile(LayerStatic.SPUR); 
			BufferedReader lReader = new BufferedReader(new FileReader(lFile));
 			String lLine = lReader.readLine();
			while ((lLine = lReader.readLine()) != null) 
 			{
 				String[] lColumn = lLine.split(",",-1);
 				//System.out.println(lColumn[5]);
 				mIdToNumber.put(lColumn[0],lColumn[5]);
			}
			lReader.close();
			
			lFile = iInfoFile.getSourceFile(LayerStatic.DETEKTOR); 
			lReader = new BufferedReader(new FileReader(lFile));
 			lLine = lReader.readLine();
			while ((lLine = lReader.readLine()) != null) 
 			{
 				String[] lColumn = lLine.split(",",-1);
 				//System.out.println(lColumn[5]);
 				mIdToNumber.put(lColumn[0],lColumn[5]);
			}
			lReader.close();
    		
			// xml
			Document lXmlDocument = lBuilder.newDocument();
			Element lXmlRoot = lXmlDocument.createElement("Konfig");
			lList = (NodeList) lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", lDynamicRoot, XPathConstants.NODESET);
			for (int i=0; i<lList.getLength(); i++)
			{
				Element lObject = (Element)lList.item(i);
				SymbolDynamic lDynamicSymbol =  SymbolDynamic.get(lObject.getAttribute("data-symbol"));
				
				String lId = lObject.getAttribute("data-static");
				//System.out.println(lId + " = " + mIdToNumber.get(lId));
				
				lDynamicSymbol.insertXml(lXmlDocument, lXmlRoot, lKontenNr, mIdToNumber.get(lId), lObject.getAttribute("id"));
			}
			
			// add dummy R.B.rt element
			/*
			   <Element elementid="lageplan.png">
			      <Telegrammereignis com_type="idc" objectid="K211.R.B.rt">
			         <Default>
			         </Default>
			      </Telegrammereignis>
			   </Element>
			*/
		
			Element lDummy = lXmlDocument.createElement("Element");
			lDummy.setAttribute("elementid", "lageplan.png");
			lXmlRoot.appendChild(lDummy);
			
			Element lTelegrammereignis = lXmlDocument.createElement("Telegrammereignis");
			lTelegrammereignis.setAttribute("com_type", "idc");
			lTelegrammereignis.setAttribute("objectid", "K"+lKontenNr+".R.B.rt");
			lDummy.appendChild(lTelegrammereignis);
			
			lTelegrammereignis.appendChild(lXmlDocument.createElement("Default"));
			
			lXmlDocument.appendChild(lXmlRoot);
			
			
			Log.out.info("Creating " + VisualServer.WEBROOT+"/"+lDeployPath+"/"+lKontenNr+".xml");
			Xml.write(lXmlDocument, new FileWriter(VisualServer.WEBROOT+"/"+lDeployPath+"/"+lKontenNr+".xml"));
			
			//
			// update node registry
			//
			iNodeRegistry.addNode(lKontenNr);
		}
		catch (Exception e)
		{
			Log.out.error("creating svg for dynamisierung", e);
   			StringWriter lWriter = new StringWriter();
	        e.printStackTrace(new PrintWriter(lWriter));
		}
    }
   
    //
    // static methods called by //deploy.html
    //
    
    public static void resetSymbol(Document iDocument, Element iDynamicObject, Element iDefs) throws Exception
    {
   		XPath lPath = XPathFactory.newInstance().newXPath();  
   		Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+iDynamicObject.getAttribute("data-static")+"']", iDefs, XPathConstants.NODE);
    	
    	String lCategory = lMeta.getAttribute("category"); 
     	SymbolDynamic lSymbol = null;
     	if (lCategory.equals(LayerStatic.SPUR))
     	{
     		lSymbol = SymbolDynamic.getDefault(lCategory, sConfigLookup.get(iDynamicObject.getAttribute("id")));
     	}
     	else
     	{
   			lSymbol = SymbolDynamic.lookup(Integer.parseInt(lMeta.getAttribute("symbolid")));
     	}
     	
		String[] lName = lMeta.getAttribute("name").split(" ");
   		String lText = lName[1];
		if (lCategory.equals(LayerStatic.DETEKTOR))
		{
			String[] lColumn = sConfigLookup.get(iDynamicObject.getAttribute("id"));
			if (lColumn != null)  
			{
   		   		try
   		   		{
   		   			Integer lDistance = Integer.parseInt(lColumn[6]);
   		   			if (lDistance > 10.0)
   		   			{
   		   				lText +=  " (" + lDistance + " m)";
   		   			} 
   		   		}
   		   		catch (Exception e)
   		   		{
   	   				lText +=  " (.. m)";
   		   		}
			}
		}
		Xml.setTextFeld(lSymbol.mSvgDocument.getDocumentElement(), lText);
		
		iDynamicObject.setAttribute("data-symbol", lSymbol.mId);
		iDynamicObject.removeChild((Element)iDynamicObject.getElementsByTagName("g").item(0));
		lSymbol.insertSvg(iDocument, iDynamicObject, iDynamicObject.getAttribute("id"));
    }
    
    public static void resetPositions(Element iRoot)
    {
		XPath lPath = XPathFactory.newInstance().newXPath();

		try
		{
			Element lStaticLayer = (Element)lPath.evaluate("//g[@class='layer' and @id='STATIC']", iRoot, XPathConstants.NODE);
			NodeList lDynamicList = (NodeList)lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", iRoot, XPathConstants.NODESET);
			for (int i=0; i<lDynamicList.getLength(); i++)
			{
				Element lDynamicObject = (Element)lDynamicList.item(i);
				
				Element lStaticObject = (Element)lPath.evaluate(".//g[(contains(concat(' ', @class, ' '), 'object')) and @id='"+lDynamicObject.getAttribute("data-static")+"']", lStaticLayer, XPathConstants.NODE);
				if (lStaticObject != null)
				{
					lDynamicObject.setAttribute("transform", lStaticObject.getAttribute("transform"));
				}
			}
		}
		catch (Exception e)
		{
			Log.out.error("creating svg for dynamisierung", e);
		}
    }
    
    public static void resetSymbols(Document iDocument, InfoFile iInfoFile)
    {
		try
		{
			BufferedReader lReader = new BufferedReader(new FileReader(iInfoFile.getSourceFile(LayerStatic.SPUR)));
			String lLine = lReader.readLine();
			while ((lLine = lReader.readLine()) != null) 
			{
				String[] lColumn = lLine.split(",",-1);
				
				int lNumber = Integer.parseInt(lColumn[5]);
				if (lNumber <= 40)
				{
					sConfigLookup.put("K"+iInfoFile.getAttribute(InfoFile.KNOTENNR)+".R.B.sg"+lNumber, lColumn);
				}
				else
				{
					sConfigLookup.put("K"+iInfoFile.getAttribute(InfoFile.KNOTENNR)+".R.B.do"+(lNumber-40), lColumn);
				}			
			}
			
			lReader = new BufferedReader(new FileReader(iInfoFile.getSourceFile(LayerStatic.DETEKTOR)));
			lLine = lReader.readLine();
			while ((lLine = lReader.readLine()) != null) 
			{
				String[] lColumn = lLine.split(",",-1);
				
				int lNumber = Integer.parseInt(lColumn[5]);
				if (lNumber <= 50)
				{
					sConfigLookup.put("K"+iInfoFile.getAttribute(InfoFile.KNOTENNR)+".R.B.d"+lNumber, lColumn);
				}
				else
				{
					sConfigLookup.put("K"+iInfoFile.getAttribute(InfoFile.KNOTENNR)+".R.B.di"+(lNumber-50), lColumn);
				}			
			}
	    	
			XPath lPath = XPathFactory.newInstance().newXPath();
			Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", iDocument, XPathConstants.NODE); 
			Element lDynamic = (Element) lPath.evaluate("//g[@id='DYNAMIC']", iDocument, XPathConstants.NODE); 
			NodeList lDynamicList = (NodeList)lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", lDynamic, XPathConstants.NODESET);
			for (int i=0; i<lDynamicList.getLength(); i++)
			{
				Element lDynamicObject = (Element)lDynamicList.item(i);
				resetSymbol(iDocument, lDynamicObject, lDefs);
			}
		}
		catch (Exception e)
		{
			Log.out.error("creating svg for dynamisierung", e);
		}
    }
}


