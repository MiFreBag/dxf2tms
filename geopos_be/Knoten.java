package ch.bergauer.am.vs.pages.geopos;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.Hashtable;

import javax.imageio.ImageIO;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.config.UrlConfig;
import ch.bergauer.am.vs.config.UrlConfigEntry;
import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.user.UserIF;
import ch.bergauer.am.vs.user.UserSession;
import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.swisstopo.geodesy.reframe_lib.Reframe;

public class Knoten 
{
	public static final String REMOTE_ID = "geopos-plan";
	
	protected Document mSvgDocument = null;
	protected Document mXmlDocument = null;

	protected RemoteSvg mRemoteSvg;
	
	protected LayerPlankopf mLayerPlankopf;
	protected LayerDynamic mLayerDynamic;
	protected LayerStatic mLayerStatic;
	protected LayerProject mLayerProject;
	
	protected UserIF mUser;
	protected Date mDate = new Date();
	protected VisualServer mServer;
	
	protected JsonObject mWebConfig = new JsonObject();
    protected JsonParser mParser = new JsonParser();

	protected InfoFile mInfoFile;
	
	public static Date sCorrectionCutoff;
    
    public static void init()
    {
	    SimpleDateFormat lFormat = new SimpleDateFormat("dd.MM.yyyy");
		UrlConfigEntry lEntry = UrlConfig.getEntry("geopos");
		try
		{
			sCorrectionCutoff = lFormat.parse((String)lEntry.getAttribute("correction-cutoff"));
		}
		catch (Exception e)
		{
			Log.out.error("Correction UI cutoff date not found", e);
			sCorrectionCutoff = Calendar.getInstance().getTime();
		}
    }
	public Knoten(InfoFile iInfoFile, Document iSvgDocument){
		mInfoFile = iInfoFile;
		mSvgDocument = iSvgDocument;
	}
    
 	public Knoten(InfoFile iInfoFile, Hashtable<String, Object> iRemoteObjects, VisualServer iServer)
	{
  		mServer = iServer;
  		mInfoFile = iInfoFile;

  		mWebConfig.addProperty("title", "K"+mInfoFile.getAttribute(InfoFile.KNOTENNR) + " " + mInfoFile.getAttribute(InfoFile.KNOTENBEZ) + "  -  Version "+ mInfoFile.getAttribute(InfoFile.KNVERS));
		mWebConfig.addProperty("knoten", mInfoFile.getAttribute(InfoFile.KNOTENNR));
		mWebConfig.addProperty("project", mInfoFile.getProject());
		mWebConfig.addProperty("srs", mInfoFile.getSRS());
		
		try
		{
			Projection lLageProjection = new Projection(mInfoFile, "LAGEPLAN");
			XPath lPath = XPathFactory.newInstance().newXPath();
			
			boolean fileUpdated = false;

			File lSvgFile = mInfoFile.getSourceFile("knotenplan.svg");
			if (!lSvgFile.exists())
			{
		        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
		        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
				mSvgDocument = lBuilder.parse(new File(VisualServer.WEBROOT + "/pages/geopos/geopos.svg"));
				mSvgDocument.getDocumentElement().normalize();
				
				// symbol library css
				Element lCss = (Element) lPath.evaluate("//style[@id='geopos_symb.css']", mSvgDocument, XPathConstants.NODE);
				lCss.appendChild(mSvgDocument.createTextNode(readCss()));
				
				// background image
				Element lImage = (Element) lPath.evaluate("//image[@id='lageplan.png']", mSvgDocument, XPathConstants.NODE); 
	    		lImage.setAttribute("width", lLageProjection.mWidth.toString());
	    		lImage.setAttribute("height", lLageProjection.mHeight.toString());
	    		lImage.setAttribute("x", "0");
	    		lImage.setAttribute("y", "0");
	    		
				// defs sections
				Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mSvgDocument, XPathConstants.NODE); 
				addPlan(lLageProjection, lDefs, "Lage", "LAGEPLAN", new String[] { "META", "KNOTEN" });  
				addPlan(lLageProjection, lDefs, "Ampel", "AMPELPLAN", new String[] { "AMPELMAST", "AMPEL", "STEUERGERAET", "META" });
				addPlan(lLageProjection, lDefs, "Detektor", "DETEKTORPLAN", new String[] { "DETEKTOR", "META" });
				addPlan(lLageProjection, lDefs, "VVA", "VVAPLAN", new String[] { "VVA", "META" });
				addPlan(lLageProjection, lDefs, "Spur", "SPURENPLAN", new String[] { "SPUR", "META" });
				
		        // add version 
		        Element lRoot = mSvgDocument.getDocumentElement();
		        lRoot.setAttribute("data-version", "1."+InfoFile.VERSION);
			}
			else
			{
				DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
				DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
				mSvgDocument = lBuilder.parse(lSvgFile);
				mSvgDocument.getDocumentElement().normalize();
				
				// convert to version
				if (InfoFile.getVersion(mSvgDocument) == InfoFile.VERSION_1)
				{
					Element lCategory = mSvgDocument.createElement("geopos:category");
					lCategory.setAttribute("id", "KNOTEN");
					
					lPath = XPathFactory.newInstance().newXPath();
					Element lPlan = (Element)lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mSvgDocument, XPathConstants.NODE);
					lPlan.insertBefore(lCategory, lPlan.getFirstChild());
					
					Element lObject = (Element)lPath.evaluate(".//*[local-name()='object'][@id='KNOTEN']", mSvgDocument, XPathConstants.NODE);
					lObject.setAttribute("id", "KNOTENMITTE");
				}
				
				// remove SPUR from AMPELPLAN category
				Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mSvgDocument, XPathConstants.NODE);
				Element lPlan = (Element)lPath.evaluate(".//*[local-name()='plan'][@id='AMPELPLAN']", lDefs, XPathConstants.NODE);
				Element lCategory = (Element)lPath.evaluate(".//*[local-name()='category'][@id='SPUR']", lPlan, XPathConstants.NODE);
				if (lCategory != null)
				{
					lPlan.removeChild(lCategory);
				}
				
				Element lVVaPlan = (Element)lPath.evaluate("//*[local-name()='plan'][@id='VVAPLAN']", mSvgDocument, XPathConstants.NODE);
				
				// when not exist, then it would be updated
				if(lVVaPlan == null){
					fileUpdated = true;
					// try to add extra VVA when not exist
					addPlan(lLageProjection, lDefs, "VVA", "VVAPLAN", new String[] { "VVA", "META" });
				}
				
			}

			// setup background image source 
			Element lImage = (Element) lPath.evaluate("//image[@id='lageplan.png']", mSvgDocument, XPathConstants.NODE); 
			String lSource = mInfoFile.getSourceFile("lageplan_static.png").getAbsolutePath();
			lSource = lSource.replace("\\", "/"); // some of the js code expects forward slashes
	        lSource = "/"+lSource.substring(lSource.indexOf("pages"));
    		lImage.setAttribute("xlink:href", lSource);
			
    		// Setup config info sent to browser via json
			mWebConfig.addProperty("autogen",!mInfoFile.getSourceFile("lageplan_static.png").exists() || !mInfoFile.getSourceFile("lageplan_dynamic.png").exists() || !mInfoFile.getSourceFile("lageplan.png").exists());
			mWebConfig.addProperty("cx",lLageProjection.svgToChX(lLageProjection.mSvgLeft + lLageProjection.mWidth/2)); 
			mWebConfig.addProperty("cy",lLageProjection.svgToChY(lLageProjection.mSvgTop + lLageProjection.mHeight/2));
			
			mWebConfig.addProperty("globalTilePath", "/pages/geopos/tiledata/nodes/"+CmdTilemapper.STATIC+"/all."+mInfoFile.getSRS());
			//mWebConfig.addProperty("globalTilePath", "/pages/geopos/tiledata/nodes/"+CmdTilemapper.STATIC+"/all");
			mWebConfig.addProperty("localTilePath", getTilePath(mInfoFile.getAttribute(InfoFile.KNOTENNR)));
			
			mWebConfig.addProperty("nodePath",iInfoFile.getNodePath());
			mWebConfig.addProperty("readonly", mInfoFile.mMode == InfoFile.ANZEIGEN);
			mWebConfig.addProperty("plan", mInfoFile.getAttribute(InfoFile.PLAN).toUpperCase());
			
			mWebConfig.addProperty("logname",mInfoFile.getAttribute(InfoFile.LOGNAME));
			
			// Create Layers
			mRemoteSvg = new RemoteSvg(mSvgDocument);
	 		iRemoteObjects.put(RemoteSvg.REMOTE_ID, mRemoteSvg);
	 		
	        mLayerStatic = new LayerStatic(this, mInfoFile);
	 		iRemoteObjects.put(LayerStatic.REMOTE_ID, mLayerStatic);
	        mLayerPlankopf = new LayerPlankopf(this, mInfoFile);
	 		iRemoteObjects.put(LayerPlankopf.REMOTE_ID, mLayerPlankopf);
	        mLayerDynamic = new LayerDynamic(this, mInfoFile, iServer);
	 		iRemoteObjects.put(LayerDynamic.REMOTE_ID, mLayerDynamic);
	 		
	        mLayerProject = new LayerProject(this, mInfoFile);
	        
	        // this trigger confirm dialog to save in image, because it's updated on backend
	        mWebConfig.addProperty("fileUpdated", fileUpdated);

			// convert to version
			if (InfoFile.getVersion(mSvgDocument) != InfoFile.VERSION)
			{
				mWebConfig.addProperty("promptRefresh", true);
				//refreshStatic();
			}
			
	        // add version 
	        Element lRoot = mSvgDocument.getDocumentElement();
	        lRoot.setAttribute("data-version", "1."+InfoFile.VERSION);
       	
	 		Xml.write(mSvgDocument, new FileWriter(mInfoFile.getSourceFile("knotenplan.svg")));
		}
		catch (Exception e)
		{	
			Log.out.error("reading Knotendaten " + mInfoFile, e);
		}
	}
	
	private String getTilePath(final String iKnoten)
	{
		File lUploadDir = new File(VisualServer.WEBROOT+"pages/geopos/tiledata/nodes/static/");
		
		File[] lFiles = lUploadDir.listFiles(new FilenameFilter() 
		{
		    public boolean accept(File iFile, String iName) 
		    {
		        return iName.startsWith(iKnoten+".");   
		    }
		});
		Arrays.sort(lFiles, new Comparator<File>()
		{
		    public int compare(File f1, File f2)
		    {
		        return Long.valueOf(f2.lastModified()).compareTo(f1.lastModified());
		    } 
		});

		
		try
		{
			JsonParser lParser = new JsonParser();
			for (File lEntry : lFiles)
			{
				//String lName = lEntry.getName();
				JsonObject lConfig = (JsonObject) lParser.parse(new FileReader(lEntry.getAbsolutePath() + "/config.json")); 
	
				String lSrs = InfoFile.LV03;
				if (lConfig.has("srs"))
				{
					lSrs = lConfig.get("srs").getAsString();
				}
				
				if (mInfoFile.getSRS().equals(lSrs))
				{
					return "/pages/geopos/tiledata/nodes/static/" + lEntry.getName();
				}
			}
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
		
		return null;
	}
	
	private void addPlan(Projection iLageProjection, Element iDefs, String iName, String iId, String[] iCategory) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		Element lPlan = (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+ iId+"']", mSvgDocument, XPathConstants.NODE);
		if (lPlan == null)
		{
			lPlan = mSvgDocument.createElement("geopos:plan");				
			lPlan.setAttribute("id", iId);
			lPlan.setAttribute("name", iName);
		}
		
		Projection lPlanProjection = new Projection(mInfoFile, iId);
		lPlan.setAttribute("region", lPlanProjection.getRegion());
		lPlan.setAttribute("viewbox",  lPlanProjection.getViewbox(iLageProjection));
		lPlan.setAttribute("massstab", lPlanProjection.mMassstab);
		lPlan.setAttribute("auslegung", lPlanProjection.mAuslegung);
		lPlan.setAttribute("format", lPlanProjection.mFormat);
		iDefs.appendChild(lPlan);
		
		for (String lEntry : iCategory)
		{
			Element lCategory = mSvgDocument.createElement("geopos:category");
			lCategory.setAttribute("id", lEntry);
			lPlan.appendChild(lCategory);
		}
		
		Element lPlankopf = mSvgDocument.createElement("geopos:plankopf");
		
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(iId)));
		String lLine = lReader.readLine();
		lLine = lReader.readLine();
		String[] lColumn = lLine.split(",",-1);
		lReader.close();
		lPlankopf.setAttribute("position", lColumn[9].equals("") ? LayerPlankopf.DEFAULT_POSITION : lColumn[9]);
		lPlankopf.setAttribute("auslegung", lColumn[10].equals("") ? LayerPlankopf.DEFAULT_AUSLEGUNG : lColumn[10]);
		lPlan.appendChild(lPlankopf);
	}
 	
	private String readCss() throws Exception
	{
		File lFile = new File(VisualServer.WEBROOT + "/themes/vrsz/images/geoposlib/geopos_symb.css"); 
		if (lFile.exists())
		{
			BufferedReader lReader = new BufferedReader(new FileReader (lFile));
		    String lLine = null;
		    StringBuilder lString = new StringBuilder();
		    while((lLine = lReader.readLine()) != null) 
		    {
		    	lString.append("\t\t");
		    	lString.append(lLine);
		    	lString.append("\n");
		    }
			lReader.close();

			return lString.toString();
		}
		return "";
	}
	
  	public String configure(String iIndexPage)
 	{
		StringWriter lWriter = new StringWriter();
		try
		{
			Xml.write(mSvgDocument, lWriter);
		}
		catch (Exception e)
		{	
			Log.out.error("converting DOM to SVG String in " + mInfoFile, e);
		}
		
		iIndexPage = mLayerProject.configure(iIndexPage);
		iIndexPage = mLayerDynamic.configure(iIndexPage);
		iIndexPage = iIndexPage.replace("<CONFIG>",  "'" + mWebConfig.toString() + "'");
  		return iIndexPage.replace("<SVG>", lWriter.getBuffer());
 	}
	
    public void refreshStatic() throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();  

        // reload geopos_symb css
		Element lCss = (Element) lPath.evaluate("//style[@id='geopos_symb.css']", mSvgDocument, XPathConstants.NODE);
		NodeList lList = lCss.getChildNodes();
		for (int i=0; i<lList.getLength(); i++)
		{
			lCss.removeChild(lList.item(i));
		}
		lCss.appendChild(mSvgDocument.createTextNode(readCss()));

		
		// update project layer styles from geopos.svg
		Element lSvg = (Element) lPath.evaluate("//svg", mSvgDocument, XPathConstants.NODE);
		
        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
		Document lDocument = lBuilder.parse(new File(VisualServer.WEBROOT + "/pages/geopos/geopos.svg"));
		lDocument.getDocumentElement().normalize();
		
		Element lNewStyle = (Element)mSvgDocument.importNode((Element) lPath.evaluate("//style[@id='PROJECT']", lDocument, XPathConstants.NODE), true);
		Element lOldStyle = (Element) lPath.evaluate("//style[@id='PROJECT']", mSvgDocument, XPathConstants.NODE);
		lSvg.insertBefore(lNewStyle, lOldStyle);
		lSvg.removeChild(lOldStyle);
	
		Element lNewDefs = (Element)mSvgDocument.importNode((Element) lPath.evaluate("//defs[@id='PROJECT']", lDocument, XPathConstants.NODE), true);
		Element lOldDefs = (Element) lPath.evaluate("//defs[@id='PROJECT']", mSvgDocument, XPathConstants.NODE);
		lSvg.insertBefore(lNewDefs, lOldDefs);
		lSvg.removeChild(lOldDefs);
		
		
        // recreate static layer 
        mLayerStatic.delete();
        mLayerStatic = new LayerStatic(this, mInfoFile);

        // recreate plankopf layer 
        mLayerPlankopf.delete();
        mLayerPlankopf = new LayerPlankopf(this, mInfoFile);
        
 		Xml.write(mSvgDocument, new FileWriter(mInfoFile.getSourceFile("knotenplan.svg")));
    }
    
    public void refreshDynamic() throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();  

        // reload css
		Element lCss = (Element) lPath.evaluate("//style[@id='geopos_symb.css']", mSvgDocument, XPathConstants.NODE);
		NodeList lList = lCss.getChildNodes();
		for (int i=0; i<lList.getLength(); i++)
		{
			lCss.removeChild(lList.item(i));
		}
		lCss.appendChild(mSvgDocument.createTextNode(readCss()));
 
        // recreate static layer 
        mLayerDynamic.delete();
        mLayerDynamic = new LayerDynamic(this, mInfoFile, mServer);
        
 		Xml.write(mSvgDocument, new FileWriter(mInfoFile.getSourceFile("knotenplan.svg")));
    }    
    
    // determine the valid massstab, auslegung and format
    protected JsonObject findInnerPlanLimits(String iPlan, Projection iLagePlan) throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();
		Projection lPlan = new Projection(mInfoFile, (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", mSvgDocument, XPathConstants.NODE));
		
		JsonObject lResult = new JsonObject();
		for (int i=0; i<Projection.MASSTAB_VALUES.length; i++)
		{
			Projection lTest = new Projection(lPlan.mSvgLeft, 
											  lPlan.mSvgTop, 
											  Projection.MASSTAB_VALUES[i],
											  lPlan.mAuslegung, 
											  lPlan.mFormat);
			lResult.addProperty(Projection.MASSTAB_VALUES[i], iLagePlan.canFit(lTest));
		}
		for (int i=0; i<Projection.AUSLEGUNG_VALUES.length; i++)
		{
			Projection lTest = new Projection(lPlan.mSvgLeft, 
											  lPlan.mSvgTop, 
											  lPlan.mMassstab,
											  Projection.AUSLEGUNG_VALUES[i], 
											  lPlan.mFormat);
			lResult.addProperty(Projection.AUSLEGUNG_VALUES[i], iLagePlan.canFit(lTest));
		}
		for (int i=0; i<Projection.FORMAT_VALUES.length; i++)
		{
			Projection lTest = new Projection(lPlan.mSvgLeft, 
											  lPlan.mSvgTop, 
											  lPlan.mMassstab,
											  lPlan.mAuslegung, 
											  Projection.FORMAT_VALUES[i]);
			lResult.addProperty(Projection.FORMAT_VALUES[i], iLagePlan.canFit(lTest));
		}
		
		return lResult;
    };
    

	//
	// change plan layout
	//
    
    static final String[] sInnerPlans = new String[] { "AMPELPLAN", "DETEKTORPLAN", "SPURENPLAN", "VVAPLAN" };
      
	public JsonObject changePlanLayout(String iPlan, String iAttribute, String iValue) throws Exception 
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", mSvgDocument, XPathConstants.NODE);
		lPlan.setAttribute(iAttribute,  iValue);
		Projection lProjection = new Projection(mInfoFile, lPlan);

		JsonObject lResult = new JsonObject();

		if (iPlan.equals("LAGEPLAN"))
		{
			lPlan.setAttribute("region",  lProjection.getRegion());
			lPlan.setAttribute("viewbox",  lProjection.getViewbox(lProjection));
    		
			// change layout for all inner plans to fit lageplan
	    	for (int i=0; i<sInnerPlans.length; i++)
	    	{
	    		Element lInnerPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+sInnerPlans[i]+"']", mSvgDocument, XPathConstants.NODE);
	    		lInnerPlan.setAttribute("auslegung",  lPlan.getAttribute("auslegung"));
	    		lInnerPlan.setAttribute("format",  lPlan.getAttribute("format"));
	    		lInnerPlan.setAttribute("massstab",  lPlan.getAttribute("massstab"));
	    		lInnerPlan.setAttribute("region",  lPlan.getAttribute("region"));
	    		lInnerPlan.setAttribute("viewbox",  lPlan.getAttribute("viewbox"));

	    		// remove plankopf
				Element lPlankopf = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='"+sInnerPlans[i]+"')]", mSvgDocument, XPathConstants.NODE); 
				lPlankopf.getParentNode().removeChild(lPlankopf);
	    		// recreate plankopf
				lResult.add(sInnerPlans[i], Xml.toJson(mLayerPlankopf.createPlankopf(sInnerPlans[i], lProjection)));
 	    	}
	    	
    		// remove plankopf
			Element lPlankopf = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='LAGEPLAN')]", mSvgDocument, XPathConstants.NODE); 
			lPlankopf.getParentNode().removeChild(lPlankopf);
    		// recreate plankopf
			lResult.add(iPlan, Xml.toJson(mLayerPlankopf.createPlankopf("LAGEPLAN", lProjection)));
		}
		else
		{
			Projection lLageProjection = new Projection(mInfoFile, (Element) lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mSvgDocument, XPathConstants.NODE));
			lProjection.fit(lLageProjection);
			lPlan.setAttribute("region",  lProjection.getRegion());
			lPlan.setAttribute("viewbox",  lProjection.getViewbox(lLageProjection));
			
    		// remove plankopf
			Element lPlankopf = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='"+iPlan+"')]", mSvgDocument, XPathConstants.NODE); 
			lPlankopf.getParentNode().removeChild(lPlankopf);
    		// recreate plankopf
			lResult.add(iPlan, Xml.toJson(mLayerPlankopf.createPlankopf(iPlan, lLageProjection)));
		}
		
		lResult.addProperty("region", lProjection.getRegion());
		return lResult;
	}
	
	//
	// change plan position 
	//
	
	protected void movePlan(Projection iLageProjection, String iPlan, Double iDx, Double iDy, JsonObject iResult) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", mSvgDocument, XPathConstants.NODE);
		Projection lProjection = new Projection(mInfoFile, lPlan);
		lProjection.setPositionSvg(lProjection.mSvgLeft+iDx, lProjection.mSvgTop+iDy);
		
		lPlan.setAttribute("region",  lProjection.getRegion());
		lPlan.setAttribute("viewbox",  lProjection.getViewbox(iLageProjection));
		iResult.addProperty(iPlan, lProjection.getRegion());
	}
	
	protected void moveLayer(Element iRoot, String iClass, Double iDx, Double iDy) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		NodeList lObjects = (NodeList) lPath.evaluate(".//*[contains(concat(' ', @class, ' '), '"+iClass+"')]", iRoot, XPathConstants.NODESET);
		for (int i=0; i<lObjects.getLength(); i++)
		{
			moveObject((Element)lObjects.item(i), iDx, iDy);
		}
	}
	
	protected void moveObject(Element iElement, Double iDx, Double iDy) throws Exception
	{
		String lTransform = iElement.getAttribute("transform");
		
		lTransform = lTransform.substring(7,lTransform.length()-1);
		String[] lMatrix = lTransform.split(" ");
		Double lX = Double.parseDouble(lMatrix[4]);
		Double lY = Double.parseDouble(lMatrix[5]);

		lX -= iDx;
		lY -= iDy;
		
		lMatrix[4] = String.format("%.6f", lX);
		lMatrix[5] = String.format("%.6f", lY);
		iElement.setAttribute("transform", "matrix(" + lMatrix[0] + " " +  lMatrix[1] + " " 
			 									     + lMatrix[2] + " " +  lMatrix[3] + " " 
			 									     + lMatrix[4] + " " +  lMatrix[5] + ")");
	}

	public JsonObject changePlanPosition(String iPlan, Double iSvgX, Double iSvgY) throws Exception 
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", mSvgDocument, XPathConstants.NODE);
		Projection lProjection = new Projection(mInfoFile, lPlan);
		Double lDx = iSvgX - lProjection.mSvgLeft;
		Double lDy = iSvgY - lProjection.mSvgTop;
		lProjection.setPositionSvg(iSvgX, iSvgY);
		
		JsonObject lResult = new JsonObject();
		lResult.addProperty("dx", lDx);
		lResult.addProperty("dy", lDy);
		
		if (iPlan.equals("LAGEPLAN"))
		{
			lPlan.setAttribute("region",  lProjection.getRegion());
			lPlan.setAttribute("viewbox",  lProjection.getViewbox(lProjection));
			lResult.addProperty(iPlan, lProjection.getRegion());
			
			movePlan(lProjection, "AMPELPLAN", lDx, lDy, lResult);
			movePlan(lProjection, "DETEKTORPLAN", lDx, lDy, lResult);
			movePlan(lProjection, "SPURENPLAN", lDx, lDy, lResult);
			movePlan(lProjection, "VVAPLAN", lDx, lDy, lResult);
			
			moveLayer((Element)lPath.evaluate("//g[(@class='layer' and @id='STATIC')]", mSvgDocument, XPathConstants.NODE), "object", lDx, lDy);
			moveLayer((Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT0')]", mSvgDocument, XPathConstants.NODE), "shape", lDx, lDy);
			moveLayer((Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT1')]", mSvgDocument, XPathConstants.NODE), "shape", lDx, lDy);
			
			// make sure Knotenmitte stays within bounds
 			Element lElement = (Element) lPath.evaluate("//g[(@class='category' and @id='KNOTEN')]", mSvgDocument, XPathConstants.NODE); 
 			Element lKnotenMitte = (Element) lPath.evaluate("//g[(contains(concat(' ', @class, ' '), 'object') and @id='KNOTENMITTE')]", lElement, XPathConstants.NODE);
	    	lProjection.centerObject(lKnotenMitte);
	    	
			String lTransform = lKnotenMitte.getAttribute("transform");
			lTransform = lTransform.substring(7,lTransform.length()-1);
			String[] lMatrix = lTransform.split(" ");
			lResult.addProperty("cx", Double.parseDouble(lMatrix[4]));
			lResult.addProperty("cy", Double.parseDouble(lMatrix[5]));
		}
		else
		{
			Projection lLageProjection = new Projection(mInfoFile, (Element) lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mSvgDocument, XPathConstants.NODE));
			lProjection.fit(lLageProjection);
			
			lPlan.setAttribute("region",  lProjection.getRegion());
			lPlan.setAttribute("viewbox",  lProjection.getViewbox(lLageProjection));
			lResult.addProperty(iPlan, lProjection.getRegion());
			
			moveObject((Element)lPath.evaluate("//g[(@class='plankopf' and @id='"+iPlan+"')]", mSvgDocument, XPathConstants.NODE), -lDx, -lDy);  // move opposite direction !
		}

		return lResult;
	}	
    
	//
	// create Background image
	//
	
	public void createPlanImage(JsonObject iObject, String iType)
	{
		int lTileSize = iObject.get("tileSize").getAsInt();
		JsonArray lTileUrls = iObject.get("tileUrls").getAsJsonArray();
		int lTileStride = iObject.get("tileStride").getAsInt();
		JsonObject lSectionMin = iObject.get("sectionMin").getAsJsonObject();
		JsonObject lSectionMax = iObject.get("sectionMax").getAsJsonObject();
		try
		{
			int lImageHeight = lTileUrls.size()/lTileStride * lTileSize;
			int lImageWidth = lTileStride*lTileSize;

			BufferedImage lImage = new BufferedImage(lImageWidth, lImageHeight, BufferedImage.TYPE_INT_ARGB);
			Graphics2D lGraphics = lImage.createGraphics();
			Log.out.info("creating plan image of size size " + lImageWidth + ", " + lImageHeight + " out of " + lTileUrls.size() + " tiles.");
			
			for (int i=0; i<lTileUrls.size(); i++)
			{
				int lTileX = i%lTileStride*lTileSize;
				int lTileY = i/lTileStride*lTileSize;
				String lStaticTile = lTileUrls.get(i).getAsString();
				
				try 
				{
					File lFile = null;
					if (iType.equals(CmdTilemapper.STATIC))
					{
						lFile = new File(VisualServer.WEBROOT+"/"+lStaticTile);
					}
					else if (iType.equals(CmdTilemapper.DYNAMIC))
					{
						lFile = new File(VisualServer.WEBROOT+"/"+lStaticTile.replace(CmdTilemapper.STATIC, CmdTilemapper.DYNAMIC));
						if (!lFile.exists())
						{
							// this is the case when no dynamic map was uploaded
							lFile = new File(VisualServer.WEBROOT+"/"+lStaticTile);
						}
					}

					if (lFile.exists())
					{
						Log.out.info("Adding Tile: " + lFile.getAbsolutePath());
						
						BufferedImage lTile = ImageIO.read(lFile);
						lGraphics.drawImage(lTile, lTileX, lTileY, null);
					}
					else
					{
						Log.out.info("Image Tile not found : " + lFile.getAbsolutePath());
					}
				}
				catch (IOException e) 
				{
					Log.out.info("Error Aadding Tile: " + lStaticTile);
					Log.out.error("Loading Image Tile in GeoPos " + lStaticTile, e);
				}
			}
			lGraphics.dispose();
			
			int lX0 = lSectionMin.get("x").getAsInt();
			int lY0 = lSectionMin.get("y").getAsInt();
			int lX1 = lSectionMax.get("x").getAsInt();
			int lY1 = lSectionMax.get("y").getAsInt();

			File lFile = null;
			if (iType.equals(CmdTilemapper.STATIC))
			{
				lFile = mInfoFile.getSourceFile("lageplan_static.png");
			}
			else if (iType.equals(CmdTilemapper.DYNAMIC))
			{
				lFile = mInfoFile.getSourceFile("lageplan_dynamic.png");
			}
			
			Log.out.info("All tiles added. Saving image: " + lFile.getAbsolutePath());
			ImageIO.write(lImage.getSubimage(lX0,lY0,lX1-lX0, lY1-lY0), "png", lFile);
			Log.out.info("Background image saved: " + lFile.getAbsolutePath() + "  size: " + lFile.length() + " byte ");
		}
		catch (Exception e) 
		{
			Log.out.error("creating plan backrgound image ", e);
		}
				
		try
		{
			XPath lPath = XPathFactory.newInstance().newXPath();
			
			// get the dimension of the image from the projection
			Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mSvgDocument, XPathConstants.NODE);
			Projection lProjection = new Projection(mInfoFile, lPlan);
			
			Element lSvgImage = (Element) lPath.evaluate("image", mSvgDocument.getDocumentElement(), XPathConstants.NODE);
			lSvgImage.setAttribute("x", "0");
			lSvgImage.setAttribute("y", "0");
			lSvgImage.setAttribute("width", lProjection.mWidth.toString());
			lSvgImage.setAttribute("height", lProjection.mHeight.toString());
			
			Log.out.info("updated <image> " + lProjection.mSvgLeft + "," + lProjection.mSvgTop + " : " + " w= " + lProjection.mWidth + " h=" + lProjection.mHeight);
		}
		catch (Exception e) 
		{
			Log.out.error("creating plan backrgound image ", e);
		}
	}
		
	//
	// Save all files in vamtogpos
	//
    public void saveInVamToGpos() throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();
		Projection lProjection = new Projection(mInfoFile, (Element) lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mSvgDocument, XPathConstants.NODE));
    	
		mLayerStatic.saveInVamToGpos(lProjection);
 		
		savePlan(lProjection, "SPURENPLAN");
		savePlan(lProjection, "AMPELPLAN");
		savePlan(lProjection, "DETEKTORPLAN");
		savePlan(lProjection, "LAGEPLAN");
		savePlan(lProjection, "VVAPLAN");
		
		// save INFOFILE
		StringWriter lBuffer = new StringWriter();
		
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile("INFO")));
		// Line 1
		String lLine = lReader.readLine();
		lBuffer.write(lLine+"\n");
		// Line 2
		String[] lColumn = lLine.split(",",-1);
		lBuffer.write(mInfoFile.getAttribute(lColumn[0]));
		for (int i=1; i<lColumn.length; i++)
		{
			lBuffer.write(",");
			lBuffer.write(mInfoFile.getAttribute(lColumn[i]));
		}
		lBuffer.write('\n');
		lBuffer.close();
		lReader.close();
		
		// override input file
		FileWriter lWriter = new FileWriter(mInfoFile.getSourceFile("INFO"));
		lWriter.write(lBuffer.toString());
		lWriter.close();

		// save SVG Document
 		Xml.write(mSvgDocument, new FileWriter(mInfoFile.getSourceFile("knotenplan.svg")));
    }

  	
	//
	// Exporting from vamtogpos to gpostovam
	//
    public static void copyToGposToVam(InfoFile iInfoFile) throws Exception
    {
    	Xml.copyFile(iInfoFile.getSourceFile("knotenplan.svg"), iInfoFile.getDestFile("knotenplan.svg"));
    	
		LayerStatic.copyToGposToVam(iInfoFile);
 		
		Xml.copyFile(iInfoFile.getSourceFile("SPURENPLAN"), iInfoFile.getDestFile("SPURENPLAN"));
		Xml.copyFile(iInfoFile.getSourceFile("AMPELPLAN"), iInfoFile.getDestFile("AMPELPLAN"));
		Xml.copyFile(iInfoFile.getSourceFile("DETEKTORPLAN"), iInfoFile.getDestFile("DETEKTORPLAN"));
		Xml.copyFile(iInfoFile.getSourceFile("VVAPLAN"), iInfoFile.getDestFile("VVAPLAN"));
		Xml.copyFile(iInfoFile.getSourceFile("LAGEPLAN"), iInfoFile.getDestFile("LAGEPLAN"));
		//Xml.copyFile(mInfoFile.getSourceFile("INFO"), mInfoFile.getDestFile("INFO"));
 
		// copy lageplan_static.png/dynamic.png from input to output directory
		BufferedImage lImage = ImageIO.read(iInfoFile.getSourceFile("lageplan_static.png"));
		ImageIO.write(lImage, "png", iInfoFile.getDestFile("lageplan_static.png"));
		
		lImage = ImageIO.read(iInfoFile.getSourceFile("lageplan_dynamic.png"));
		ImageIO.write(lImage, "png", iInfoFile.getDestFile("lageplan_dynamic.png"));
		
		lImage = ImageIO.read(iInfoFile.getSourceFile("lageplan.png"));
		ImageIO.write(lImage, "png", iInfoFile.getDestFile("lageplan.png"));
		
		// just write a dummy knotenplan.xml
		PrintWriter lWriter = new PrintWriter(iInfoFile.getDestFile("knotenplan.xml"));
		lWriter.append("<config>Coming soon...</config>");
    }
	
	
	public void savePlan(Projection iProjection, String iPlan) throws Exception 
	{
		DateFormat sDateFormat = new SimpleDateFormat("dd.MM.yy");

		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lSvgObject = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", mSvgDocument, XPathConstants.NODE);
		
		StringWriter lBuffer = new StringWriter();
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(iPlan)));
		String lLine = lReader.readLine();
		lBuffer.write(lLine+"\n");
		while ((lLine = lReader.readLine()) != null) 
		{
			String[] lColumn = lLine.split(",",-1);

			// position
			String[] lMatrix = lSvgObject.getAttribute("region").split(" ");
			lColumn[1] = Layer.sNumberFormat.format(iProjection.svgToChX(Double.parseDouble(lMatrix[0])));
			lColumn[2] = Layer.sNumberFormat.format(iProjection.svgToChY(Double.parseDouble(lMatrix[1])));
			
			// attributes
			lColumn[4] = lSvgObject.getAttribute("massstab");
			lColumn[5] = lSvgObject.getAttribute("auslegung");
			lColumn[6] = lSvgObject.getAttribute("format");
			
			// user
			//lColumn[7] = mUser.getId();

			// date
			lColumn[8] = sDateFormat.format(mDate);
			
			// plankopf
			lSvgObject = (Element) lPath.evaluate(".//*[local-name()='plankopf']", lSvgObject, XPathConstants.NODE);
			lColumn[9] = lSvgObject.getAttribute("position");
			lColumn[10] = lSvgObject.getAttribute("auslegung");
			
			// write values
			lBuffer.write(lColumn[0]);
			for (int i=1; i<lColumn.length; i++)
			{
				lBuffer.write(",");
				lBuffer.write(lColumn[i]);
			}
			lBuffer.write('\n');
		}
		lBuffer.close();
		lReader.close();
		
		// override input file
		FileWriter lWriter = new FileWriter(mInfoFile.getSourceFile(iPlan));
		lWriter.write(lBuffer.toString());
		lWriter.close();
	}
	
	//
	// Remote Methods called by browser
	//
	  
    @RemoteMethod
    public String changePlanLayout(ServerCall iCall, String iPlan, String iAttribute, String iValue)
    {
    	try
    	{
    		JsonObject lResult = changePlanLayout(iPlan, iAttribute, iValue);
    		saveInVamToGpos();
        	return lResult.toString();
    	}
    	catch (Exception e)
    	{
			Log.out.error("changing Layout ", e);
   		
    	}
    	return null;
    }
    
    @RemoteMethod
    public String changePlanPosition(ServerCall iCall, String iPlan, Number iSvgX, Number iSvgY)
    {
    	try
    	{
    		JsonObject lResult = changePlanPosition(iPlan, iSvgX.doubleValue(), iSvgY.doubleValue());
    		saveInVamToGpos();
        	return lResult.toString();
    	}
    	catch (Exception e)
    	{
			Log.out.error("changing Layout ", e);
   		
    	}
    	return null;
    }
    
    @RemoteMethod
    public void createPlanImage(ServerCall iCall, String iType, String iConfig, Boolean iFromAutogen)
    {
    	try
    	{
    		if (iType.equals(CmdTilemapper.STATIC))
    		{
        		if (!iFromAutogen || !mInfoFile.getSourceFile("lageplan_static.png").exists())
        		{
        			createPlanImage(mParser.parse(iConfig).getAsJsonObject(), CmdTilemapper.STATIC);
        		}
    		}
    		else if (iType.equals(CmdTilemapper.DYNAMIC))
    		{
        		if (!iFromAutogen || !mInfoFile.getSourceFile("lageplan_dynamic.png").exists())
        		{
        			createPlanImage(mParser.parse(iConfig).getAsJsonObject(), CmdTilemapper.DYNAMIC);
        		}
    		}
    		saveInVamToGpos();
     		iCall.reply(null);
    	}
    	catch (Exception e)
    	{
			Log.out.error("creating Lageplan image", e);
     		iCall.reply("Hintergrundbild konnte nicht erstellt werden");
    	}
    }
    
    @RemoteMethod
    public void createLisaImage(ServerCall iCall, Boolean iFromAutogen)
    {
    	try
    	{
    		if (!iFromAutogen || !mInfoFile.getSourceFile("lageplan.png").exists())
    		{
	    		UserSession lSession = iCall.getUserSession();
		 		CmdPhantomjs lPrinter = new CmdPhantomjs(lSession.getSessionInfo(UserSession.TARGET_HOST));
		 		BufferedImage lImage = ImageIO.read(new ByteArrayInputStream(lPrinter.printBackground(mInfoFile)));
				ImageIO.write(lImage, "png", mInfoFile.getSourceFile("lageplan.png"));
    		}
     		iCall.reply(null);
		}
		catch (Exception e)
		{
			Log.out.error("creating LISA export image", e);
     		iCall.reply("LISA export konnte nicht erstellt werden");
		}
	}
    
    
    
    @RemoteMethod
    public String getPlanLimits(ServerCall iCalle)
    {
    	try
    	{
    		XPath lPath = XPathFactory.newInstance().newXPath();
    		Projection lLagePlan = new Projection(mInfoFile, (Element) lPath.evaluate("//*[local-name()='plan'][@id='LAGEPLAN']", mSvgDocument, XPathConstants.NODE));
    		
    		JsonObject lResult = new JsonObject();
    		lResult.add("AMPELPLAN", findInnerPlanLimits("AMPELPLAN", lLagePlan));
    		lResult.add("DETEKTORPLAN", findInnerPlanLimits("DETEKTORPLAN", lLagePlan));
    		lResult.add("SPURENPLAN", findInnerPlanLimits("SPURENPLAN", lLagePlan));
    		lResult.add("VVAPLAN", findInnerPlanLimits("VVAPLAN", lLagePlan));
    		
    		JsonObject lJson = new JsonObject();
       		for (int j=0; j<Projection.MASSTAB_VALUES.length; j++)
    		{
       			lJson.addProperty(Projection.MASSTAB_VALUES[j], true);
    		}
    		for (int j=0; j<Projection.AUSLEGUNG_VALUES.length; j++)
    		{
    			lJson.addProperty(Projection.AUSLEGUNG_VALUES[j], true);
    		}
    		for (int j=0; j<Projection.FORMAT_VALUES.length; j++)
    		{
    			lJson.addProperty(Projection.FORMAT_VALUES[j], true);
    		}
    		lResult.add("LAGEPLAN", lJson);
    		//lResult.add("LAGEPLAN", findLagePlanLimits(lLagePlan));
    		
        	return lResult.toString();
    	}
    	catch (Exception e)
    	{
			Log.out.error("changing Layout ", e);
   		
    	}
    	return null;
    }
     
    @RemoteMethod
    public String getTileList(ServerCall iCall, final String iKnoten)
    {
		JsonArray lResult = new JsonArray();
		JsonParser lParser = new JsonParser(); 
    	try
    	{
    		File lUploadDir = new File(VisualServer.WEBROOT+"pages/geopos/tiledata/nodes/static/");
    		
    		File[] lFiles = lUploadDir.listFiles(new FilenameFilter() 
    		{
    		    public boolean accept(File iFile, String iName) 
    		    {
    		        return iFile.isDirectory() && iName.startsWith(iKnoten+".") && iName.contains(".");
    		    }
    		});;
    		Arrays.sort(lFiles, new Comparator<File>()
    		{
    		    public int compare(File f1, File f2)
    		    {
    		        return Long.valueOf(f2.lastModified()).compareTo(f1.lastModified());
    		    } 
    		});
    		
    		for (File lEntry : lFiles)
    		{
 				String lName = lEntry.getName();
				JsonObject lConfig = (JsonObject) lParser.parse(new FileReader(lEntry.getAbsolutePath() + "/config.json")); 

				String lSrs = InfoFile.LV03;
				if (lConfig.has("srs"))
				{
					lSrs = lConfig.get("srs").getAsString();
				}
				
				if (mInfoFile.getSRS().equals(lSrs))
				{
					JsonObject lObject = new JsonObject();
					lObject.addProperty("comments", lConfig.get("comments") != null ? lConfig.get("comments").getAsString() : "null");  // this will not be null once in production
					lObject.addProperty("tilepath", "/pages/geopos/tiledata/nodes/"+CmdTilemapper.STATIC+"/"+lEntry.getName());
					
					int lIndex = lName.indexOf('.');
					if (lIndex != -1)
					{
						lObject.addProperty("timestamp", Long.parseLong(lName.substring(lIndex + 1)));
					}
					else
					{
						Log.out.error("invalid map directory " + lName);
					}
					
					lResult.add(lObject);
				}
    		}
		}
		catch (Exception e)
		{
			Log.out.error("changing Layout ", e);
			
		}

    	return lResult.toString();
    }
    
    //
    // add VVaPlan (this call for deploy, this add the VVaPLan into the old knotenplan, that already generate but didn't have VVaPlan)
    //
    public void addVVaPlan(){
    	
    	try{
    		
			Projection lLageProjection = new Projection(mInfoFile, "LAGEPLAN");
			XPath lPath = XPathFactory.newInstance().newXPath();

			File lSvgFile = mInfoFile.getSourceFile("knotenplan.svg");
			if (lSvgFile.exists())
			{
				
				Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mSvgDocument, XPathConstants.NODE); 
				
				Element lPlan = (Element)lPath.evaluate("//*[local-name()='plan'][@id='VVAPLAN']", mSvgDocument, XPathConstants.NODE);
				if (lPlan == null)
				{
					addPlan(lLageProjection, lDefs, "VVA", "VVAPLAN", new String[] { "VVA", "META" });
				}
				
				
				new LayerStatic(this, mInfoFile);
				new LayerPlankopf(this, mInfoFile);
				
			}
    		
    	}
		catch (Exception e)
		{	
			Log.out.error("addVVaPlan " + mInfoFile, e);
		}
    	
    }
    
    //
    // LV95 conversion
    //
    protected void convertPlan(Reframe iReframe, String iId) throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();
			
		Element lPlan = (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+ iId+"']", mSvgDocument, XPathConstants.NODE);
		Projection lProjection = new Projection(mInfoFile, lPlan);
		lProjection.toLV95(iReframe);
		lPlan.setAttribute("region", lProjection.getRegion());
    }
    
    public void toLV95(Reframe iReframe) throws Exception
    {
    	convertPlan(iReframe, "LAGEPLAN");  
		convertPlan(iReframe, "AMPELPLAN");
		convertPlan(iReframe, "DETEKTORPLAN");
		convertPlan(iReframe, "SPURENPLAN");
		convertPlan(iReframe, "VVAPLAN");
    }
 
}
