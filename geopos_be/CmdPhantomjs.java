package ch.bergauer.am.vs.pages.geopos;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

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
import ch.bergauer.am.vs.session.response.AppResponse;
import ch.bergauer.am.vs.util.Log;
import ch.bergauer.am.vs.util.Utils;

import com.itextpdf.text.Image;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfWriter;

public class CmdPhantomjs 
{
	protected String mPrintJob;
	protected String mPrintPath;
	protected String mHost;

	protected static int sPrintJob = 0;
	
	
	private int mVersion = -1;
	
	public CmdPhantomjs(String iHost)
	{
		mPrintJob = "/printjob"+sPrintJob++;
		mPrintPath = "pages/geopos/printdata" + mPrintJob;
		mHost = iHost;

		// always check if prints.js needs to be copied
		File lPrintjs = new File(VisualServer.WEBROOT+"pages/geopos/printdata/print.js"); 
		if (!lPrintjs.exists())
		{
			InputStream lInputStream = null;
			OutputStream lOutputStream = null;
	    	try
	    	{
	    	    lInputStream = new FileInputStream(new File(VisualServer.WEBROOT+"pages/geopos/js/print.js"));
	    	    lOutputStream = new FileOutputStream(lPrintjs);
	        	
	    	    byte[] lBuffer = new byte[1024];
	    		
	    	    int lLength;
	    	    while ((lLength = lInputStream.read(lBuffer)) > 0)
	    	    {
	    	    	lOutputStream.write(lBuffer, 0, lLength);
	    	    }
	    	    
	    	    lInputStream.close();
	    	    lOutputStream.close();
	    	}
	    	catch(IOException e)
	    	{
	    		e.printStackTrace();
	    	}
		}
		
		// create printjob directory
		File lPrintDir = new File(VisualServer.WEBROOT+mPrintPath);
		if (!lPrintDir.exists())
		{
			lPrintDir.mkdirs();
			try
			{
				Process lProcess = Runtime.getRuntime().exec("chmod 777 " + lPrintDir.getAbsolutePath());
				Utils.closeQuietly(lProcess.getErrorStream());
				Utils.closeQuietly(lProcess.getInputStream());
				Utils.closeQuietly(lProcess.getOutputStream());
			}
			catch (Exception e)
			{
				Log.out.error("Unable to create directory " + lPrintDir.getAbsolutePath(), e);
			}
		}
	}
	
    //
    // Planmappe
    //
    public String printMappe(InfoFile iInfoFile)
    {
    	String lResult = "Ok";
    	
		File lDestDir = new File(VisualServer.WEBROOT + "pages/geopos/" + iInfoFile.getAttribute(InfoFile.ABLAGE));
		if (!lDestDir.exists())
		{
			lResult = "Ablage Verzeichniss fehlt" + lDestDir.getAbsolutePath();
	   		iInfoFile.writeStatError(lResult);
		}
		else
		{
	     	try
	    	{
	     		Log.out.info("printing " + iInfoFile.toString() );
	     		
				File lFile = iInfoFile.getSourceFile("knotenplan.svg");
		        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
		        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
				Document lDocument = lBuilder.parse(lFile);
				lDocument.getDocumentElement().normalize();
				mVersion = InfoFile.getVersion(lDocument);

				XPath lPath = XPathFactory.newInstance().newXPath();
				
				// show static layer
				Element lLayer = (Element)lPath.evaluate("//g[(@class='layer' and @id='STATIC')]", lDocument, XPathConstants.NODE); 
				lLayer.setAttribute("style", "display: visible");
		        
				// show zeichnung
				if (mVersion == InfoFile.VERSION_1)
				{
					// show info layer
					Element lInfo = (Element)lPath.evaluate("//g[(@class='layer' and @id='INFO')]", lDocument, XPathConstants.NODE); 
					lInfo.setAttribute("style", "display: visible");
					// show projektierung layer
					Element lProject = (Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT')]", lDocument, XPathConstants.NODE); 
					lProject.setAttribute("style", "display: visible");
				}
				else
				{
					Element lProject0 = (Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT0')]", lDocument, XPathConstants.NODE);
					lProject0.setAttribute("style", "display: visible");
				}
				
				// set Wasserzeichen
				Element lWasserzeichen = (Element)lPath.evaluate("//text[@id='watermark']", lDocument, XPathConstants.NODE); 
				lWasserzeichen.setAttribute("style", "display: none");
	
				// copy lageplan_static.png to tempdir
				File lTempImage = new File(VisualServer.WEBROOT+mPrintPath+"/lageplan_static.png");
	    		BufferedImage lImage = ImageIO.read(iInfoFile.getSourceFile("lageplan_static.png"));
	    		ImageIO.write(lImage, "png", lTempImage);
				
				// change image path
				Element lElement = (Element)lPath.evaluate("/svg/image", lDocument, XPathConstants.NODE); 
		        lElement.setAttribute("xlink:href", "/"+mPrintPath+"/lageplan_static.png");
	    		
		        pintMapEntry(lDocument, iInfoFile, "LAGEPLAN");
		        pintMapEntry(lDocument, iInfoFile, "SPURENPLAN");
		        pintMapEntry(lDocument, iInfoFile, "AMPELPLAN");
		        pintMapEntry(lDocument, iInfoFile, "DETEKTORPLAN");
		        pintMapEntry(lDocument, iInfoFile, "VVAPLAN");
		        
	    		iInfoFile.writeStatOk();
	    	}
			catch (Exception e)
			{
				lResult = toString(e);
	    		iInfoFile.writeStatError("Druckfehler", e);
			}
		}
		deleteDirectory(new File(VisualServer.WEBROOT+mPrintPath));
     	return lResult;
    }

    
    protected void pintMapEntry(Document iDocument, InfoFile iInfoFile, String iName) throws Exception
    {
        showStaticObjects(iDocument, iName);
		if (mVersion != InfoFile.VERSION_1)
		{
	        showProjectObjects(iDocument, iName);
		}
        showPlankopf(iInfoFile, iDocument, iName, InfoFile.KNOTENMAPPE, true);
		printPlan(iInfoFile, iDocument, iName);
		
		XPath lPath = XPathFactory.newInstance().newXPath();
		Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iName+"']", iDocument, XPathConstants.NODE);
		toPdf(VisualServer.WEBROOT+mPrintPath+"/"+iName+".png", VisualServer.WEBROOT + "pages/geopos/" + iInfoFile.getAttribute(InfoFile.ABLAGE)+ "/" + iName.toLowerCase()+".pdf", lPlan);
    }

    
    //
    // Individual plan for viewing in Browser  // NOT USED ANYMORE
    //
    public Object printPlan(InfoFile iInfoFile, boolean iFromBrowser)
    {
        String lPlan = iInfoFile.getAttribute(InfoFile.PLAN).toUpperCase();
        
        VisualServer.setServerBusy(true);
    	Object lResponse = "Ok";
    	try
    	{
			File lFile = iInfoFile.getSourceFile("knotenplan.svg");
	        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
	        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
			Document lDocument = lBuilder.parse(lFile);
			lDocument.getDocumentElement().normalize();
			mVersion = InfoFile.getVersion(lDocument);

			// show static layer
			XPath lPath = XPathFactory.newInstance().newXPath();  
			Element lLayer = (Element)lPath.evaluate("//g[(@class='layer' and @id='STATIC')]", lDocument, XPathConstants.NODE); 
			lLayer.setAttribute("style", "display: visible");
			
			// show zeichnung
			if (mVersion == InfoFile.VERSION_1)
			{
				// show info layer
				Element lInfo = (Element)lPath.evaluate("//g[(@class='layer' and @id='INFO')]", lDocument, XPathConstants.NODE); 
				lInfo.setAttribute("style", "display: visible");
				// show projektierung layer
				Element lProject = (Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT')]", lDocument, XPathConstants.NODE); 
				lProject.setAttribute("style", "display: visible");
			}
			else
			{
				Element lProject0 = (Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT0')]", lDocument, XPathConstants.NODE);
				lProject0.setAttribute("style", "display: visible");
			}
			
			// set Wasserzeichen
			Element lWasserzeichen = (Element)lPath.evaluate("//text[@id='watermark']", lDocument, XPathConstants.NODE); 
		//	lWasserzeichen.setAttribute("style", "display: visible");
			
	   		Element lElement = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+lPlan+"']", lDocument, XPathConstants.NODE);
    		Watermark lWatermark = sWatermak.get(lElement.getAttribute("format")+lElement.getAttribute("auslegung")+lElement.getAttribute("massstab"));
    		lWatermark.configure(lElement, lWasserzeichen, iInfoFile.getAttribute(InfoFile.WASSERZEICHEN));
			
			// copy lageplan_static.png to tempdir
			File lTempImage = new File(VisualServer.WEBROOT+mPrintPath+"/lageplan_static.png");
    		BufferedImage lImage = ImageIO.read(iInfoFile.getSourceFile("lageplan_static.png"));
    		ImageIO.write(lImage, "png", lTempImage);
			
			// change image path
			lElement = (Element)lPath.evaluate("/svg/image", lDocument, XPathConstants.NODE); 
	        lElement.setAttribute("xlink:href", "/"+mPrintPath+"/lageplan_static.png");
	        
	        showStaticObjects(lDocument, lPlan);
			if (mVersion != InfoFile.VERSION_1)
			{
		        showProjectObjects(lDocument, lPlan);
			}
	        showPlankopf(iInfoFile, lDocument, lPlan, InfoFile.DRUCKEN, true);
			printPlan(iInfoFile, lDocument, lPlan);
	        
		    if (iFromBrowser)
	        {
	        	// print command invoked from the geopos GUI. return the png to Browser
	    		File lPrintout = new File(VisualServer.WEBROOT+mPrintPath+"/"+lPlan+".png");
		     	FileInputStream lStream = new FileInputStream(lPrintout);
		     	byte [] lArray = new byte[(int)lPrintout.length()];
		        lStream.read(lArray,0,lArray.length);
		        lStream.close();
	        	lResponse = new AppResponse(AppResponse.PNG, lArray);
	        	
	    		//toPdf(VisualServer.WEBROOT+mPrintPath+"/"+lPlan+".png", iInfoFile.getDestFile(lPlan.toLowerCase()+".pdf").getAbsolutePath(), (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+lPlan+"']", lDocument, XPathConstants.NODE));
	        }
	        else
	        {
	        	// print command invoked from the VAM. Save png in gpostovam
	    		toPdf(VisualServer.WEBROOT+mPrintPath+"/"+lPlan+".png", iInfoFile.getDestFile(lPlan.toLowerCase()+".pdf").getAbsolutePath(), (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+lPlan+"']", lDocument, XPathConstants.NODE));
	    		iInfoFile.writeStatOk();
	    		/*
	        	BufferedImage lSrceImage = ImageIO.read(lPrintout);
				File lDestImage = iInfoFile.getDestFile(lPlan.toLowerCase()+".png");
	    		ImageIO.write(lSrceImage, "png", lDestImage);
	    		iInfoFile.writeStatOk();
	    		*/
	        }
    	}
		catch (Exception e)
		{
			lResponse = toString(e);
	        if (!iFromBrowser)
	        {
	    		iInfoFile.writeStatError("Druckfehler", e);
	        }
	        else
	        {
				Log.out.error("Druckfehler " + iInfoFile, e);
	        }
		}
        VisualServer.setServerBusy(false);
     	
		deleteDirectory(new File(VisualServer.WEBROOT+mPrintPath));
		return lResponse;
    }

    
    //
    // Background + Massstab for Lisa export
    //
    public byte [] printBackground(InfoFile iInfoFile)
    {
        VisualServer.setServerBusy(true);
     	try
    	{
     		Log.out.info("printing " + iInfoFile.toString() );
     		
			File lFile = iInfoFile.getSourceFile("knotenplan.svg");
			if (lFile.exists())
			{
		        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
		        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
				Document lDocument = lBuilder.parse(lFile);
				lDocument.getDocumentElement().normalize();

				XPath lPath = XPathFactory.newInstance().newXPath();
				
				// hide all layers
				NodeList lList = (NodeList) lPath.evaluate("//g[@class='layer']", lDocument, XPathConstants.NODESET);
				for (int i=0; i<lList.getLength(); i++)
				{
					Element lLayer = (Element)lList.item(i);
					lLayer.setAttribute("style", "display: none");
				}
				
				// show Lageplan zeichnung layer
				Element lProject0 = (Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT0')]", lDocument, XPathConstants.NODE);
				lProject0.setAttribute("style", "display: visible");
				

				// Show Static layer
				Element lLayer = (Element)lPath.evaluate("//g[(@class='layer' and @id='STATIC')]", lDocument, XPathConstants.NODE); 
				lLayer.setAttribute("style", "display: visible");
				
				// Hide all static categories
				lList = (NodeList) lPath.evaluate(".//g[@class='category']", lLayer, XPathConstants.NODESET);
				for (int i=0; i<lList.getLength(); i++)
				{
					Element lCategory = (Element)lList.item(i);
					lCategory.setAttribute("style", "display: none");
				}

				// show meta category
				Element lCategory = (Element)lPath.evaluate(".//g[(@class='category' and @id='META')]", lLayer, XPathConstants.NODE); 
				lCategory.setAttribute("style", "display: visible");
				
				// Hide all meta objects
				lList = (NodeList) lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", lCategory, XPathConstants.NODESET);
				for (int i=0; i<lList.getLength(); i++)
				{
					Element lObject = (Element)lList.item(i);
					lObject.setAttribute("style", "display: none");
				}
				Element lMassstab = (Element)lPath.evaluate(".//g[(contains(concat(' ', @class, ' '), 'object') and @id='MASSSTAB')]", lDocument, XPathConstants.NODE); 
				lMassstab.setAttribute("style", "display: visible");
				
				// hide Wasserzeichen
				Element lWasserzeichen = (Element)lPath.evaluate("//text[@id='watermark']", lDocument, XPathConstants.NODE); 
				lWasserzeichen.setAttribute("style", "display: none");

				
				// copy lageplan_static.png to tempdir (under different name)
				File lTempImage = new File(VisualServer.WEBROOT+mPrintPath+"/lageplan_static.png");
	    		BufferedImage lImage = ImageIO.read(iInfoFile.getSourceFile("lageplan_static.png"));
	    		ImageIO.write(lImage, "png", lTempImage);
				
				// change image path
				Element lElement = (Element)lPath.evaluate("/svg/image", lDocument, XPathConstants.NODE); 
		        lElement.setAttribute("xlink:href", "/"+mPrintPath+"/lageplan_static.png");
		        
		        showPlankopf(iInfoFile, lDocument, "LAGEPLAN", InfoFile.ANZEIGEN, false);
				printPlan(iInfoFile, lDocument, "LAGEPLAN");
			}
			else
			{	
				Log.out.error("Error printing " + iInfoFile  + " - /knotenplan.svg does not exist");
			}
    	}
		catch (Exception e)
		{
			Log.out.error("printing " + iInfoFile, e);
		}
     	
     	byte [] lArray = null;
     	try
     	{
    		File lFile = new File(VisualServer.WEBROOT+mPrintPath+"/LAGEPLAN.png");
	     	FileInputStream lStream = new FileInputStream(lFile);
	        lArray = new byte[(int)lFile.length()];
	        lStream.read(lArray,0,lArray.length);
	        lStream.close();
     	}
     	catch (Exception e)
     	{
			Log.out.error(e);
    	}
        VisualServer.setServerBusy(false);
     	
		deleteDirectory(new File(VisualServer.WEBROOT+mPrintPath));
		return lArray;
    }
   
    
    protected void showStaticObjects(Document iDocument, String iPlan) throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();  
    	
		// Hide all STATIC elements
		NodeList lList = (NodeList) lPath.evaluate("//g[@class='category']", iDocument, XPathConstants.NODESET);
		for (int i=0; i<lList.getLength(); i++)
		{
			Element lCategory = (Element)lList.item(i);
			lCategory.setAttribute("style", "display: none");
		}
		
		// Show STATIC elements for this plan type
		Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", iDocument, XPathConstants.NODE);
		lList = (NodeList) lPath.evaluate("*[local-name()='category']", lPlan, XPathConstants.NODESET);
		for (int i=0; i<lList.getLength(); i++)
		{
			Element lElement = (Element)lList.item(i);
			Element lCategory = (Element)lPath.evaluate("//g[(@class='category' and @id='"+lElement.getAttribute("id")+"')]", iDocument, XPathConstants.NODE); 
			lCategory.setAttribute("style", "display: visible");
		}
		
		// Alwyas print Spuren in AMPELPLAN
		if (iPlan.equals("AMPELPLAN"))
		{
			Element lCategory = (Element)lPath.evaluate("//g[(@class='category' and @id='SPUR')]", iDocument, XPathConstants.NODE);
			lCategory.setAttribute("style", "display: visible");
		}
    }    
    
    protected void showProjectObjects(Document iDocument, String iPlan) throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();
		
		// show only plan layer
		Element lProject1 = (Element)lPath.evaluate("//g[(@class='layer' and @id='PROJECT1')]", iDocument, XPathConstants.NODE); 
		NodeList lList = (NodeList) lPath.evaluate(".//*[contains(concat(' ', @class, ' '), 'shape')]", lProject1, XPathConstants.NODESET);
		for (int i=0; i<lList.getLength(); i++)
		{
			Element lShape = (Element)lList.item(i);
			String lClass = lShape.getAttribute("class");
			if (lClass.contains(iPlan))
			{
				lShape.setAttribute("style", "display: visible");
			}
			else
			{
				lShape.setAttribute("style", "display: none");
			}
		}
    }    
    
    
    protected void showPlankopf(InfoFile iInfoFile, Document iDocument, String iPlan, int iMode, boolean iVisible) throws Exception
    {
		XPath lPath = XPathFactory.newInstance().newXPath();  
    	
		// Show Plankopf layer
		Element lLayer = (Element)lPath.evaluate("//g[(@class='layer' and @id='PLANKOPF')]", iDocument, XPathConstants.NODE); 
		lLayer.setAttribute("style", "display: visible");
				
		// Hide all Plankopf elements
		NodeList lList = (NodeList) lPath.evaluate("//g[@class='plankopf']", iDocument, XPathConstants.NODESET);
		for (int i=0; i<lList.getLength(); i++)
		{
			Element lCategory = (Element)lList.item(i);
			lCategory.setAttribute("style", "display: none");
		}
		
		if (iVisible)
		{
			// Setup Plankopf for this plan type
			Element lPlankopf = (Element)lPath.evaluate("//g[(@class='plankopf' and @id='"+iPlan+"')]", iDocument, XPathConstants.NODE);
			
			
			// check to see if Plankopf has already been upgraded. 
			Element lBearbeitung = (Element) lPath.evaluate("//g[(@class='plankopf' and @id='BEARBEITUNG')]", lPlankopf, XPathConstants.NODE); 
			if (lBearbeitung == null)
			{
				while (lPlankopf.hasChildNodes())
				{
					lPlankopf.removeChild(lPlankopf.getFirstChild());
				}
				
				// upgrade this Knoten to contain the new PlanKopf info
				Element lPlanKonfig = (Element)lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", iDocument, XPathConstants.NODE);
				Projection lPlanProjection = new Projection(iInfoFile, lPlanKonfig);
				
				SymbolStatic lSymbol = SymbolStatic.getPlankopf(lPlanProjection);
				lSymbol.insert(iDocument, lPlankopf);
			}
			
			lPlankopf.setAttribute("style", "display: visible");

			// find format
			//Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", iDocument, XPathConstants.NODE);
			//lPlanInfo.put("FORMAT", lPlan.getAttribute("format"));
			HashMap<String, String> lPlanInfo = iInfoFile.getPlanInfo(iPlan);
			
			iInfoFile.setupPlankopf(lPlankopf, iPlan, iMode, lPlanInfo);
		}
    }    
    
    
    protected void printPlan(InfoFile iInfoFile, Document iDocument, String iPlan) throws Exception
    {
 		Element lSvgElement = iDocument.getDocumentElement();
		XPath lPath = XPathFactory.newInstance().newXPath();  
				
		// Setup the viewbox
		Element lPlan = (Element) lPath.evaluate("//*[local-name()='plan'][@id='"+iPlan+"']", iDocument, XPathConstants.NODE);
		lSvgElement.setAttribute("viewBox", lPlan.getAttribute("viewbox"));

		// setup border
		String[] lViewbox = lPlan.getAttribute("viewbox").split(" ");
		Element lBorder = (Element)lPath.evaluate("//rect[@id='border']", iDocument, XPathConstants.NODE);
		lBorder.setAttribute("x", lViewbox[0]);
		lBorder.setAttribute("y", lViewbox[1]);
		lBorder.setAttribute("width", lViewbox[2]);
		lBorder.setAttribute("height", lViewbox[3]);
		
		// save svg as a temporary file
		File lTempSvg = new File(VisualServer.WEBROOT+mPrintPath+"/knotenplan.svg");
		Xml.write(iDocument, new FileWriter(lTempSvg));

		// run the print command
		UrlConfigEntry lEntry = UrlConfig.getLink("geopos");
		String lCommand = (String)lEntry.getAttribute("printCmd");

		lCommand = lCommand.replace("%PRINTJOB%", mPrintJob); 
		lCommand = lCommand.replace("%FILE%", "temp.png");
		lCommand = lCommand.replace("%HOST%", mHost);
		
		String lFormat = lPlan.getAttribute("format");
		String lAuslegung = lPlan.getAttribute("auslegung");
		
		int lWidth = 0;
		int lHeight = 0;
		if (lFormat.equals("A4"))
		{
			// 210 x 297 mm
			if (lAuslegung.equals("hoch"))
			{
				lWidth = 210;
				lHeight = 297;
			}
			else
			{
				lWidth = 297;
				lHeight = 210;
			}
		}
		else
		{
			// 297 x 420
			if (lAuslegung.equals("hoch"))
			{
				lWidth = 297;
				lHeight = 420;
			}
			else
			{
				lWidth = 420;
				lHeight = 297;
			}
		}
		
		lWidth -= Projection.PRINT_MARGIN;
		lHeight -= Projection.PRINT_MARGIN;

		// convert to pixels for 300 DPI printer
		float lDotsPerMM = 11.811023622f; 
		int lPrintW = (int)(lWidth*lDotsPerMM+0.5);
		int lPrintH = (int)(lHeight*lDotsPerMM+0.5);
		lCommand = lCommand + lAuslegung + " "  + lFormat + " " + lPrintW + " " + lPrintH;
		
		Log.out.info("started print command : " + lCommand);
		Process lProcess = Runtime.getRuntime().exec(lCommand);
		lProcess.waitFor();
		Utils.closeQuietly(lProcess.getErrorStream());
		Utils.closeQuietly(lProcess.getInputStream());
		Utils.closeQuietly(lProcess.getOutputStream());
		Log.out.info("completed print command : " + lCommand);
		
		// now create png with proper margins for 300 DPI printer
		int lMargin = (int)(0.5*Projection.PRINT_MARGIN*lDotsPerMM+0.5);
		int lImageWidth = lPrintW + 2*lMargin;
		int lImageHeight = lPrintH + 2*lMargin;
		BufferedImage lImage = new BufferedImage(lImageWidth, lImageHeight, BufferedImage.TYPE_INT_ARGB);
		Graphics2D lGraphics = lImage.createGraphics();
		
		File lPrintResult = new File(VisualServer.WEBROOT+mPrintPath+"/temp.png");
		lGraphics.drawImage(ImageIO.read(new File(VisualServer.WEBROOT+mPrintPath+"/temp.png")), lMargin, lMargin, null);
		ImageIO.write(lImage, "png", new File(VisualServer.WEBROOT+mPrintPath+"/"+iPlan+".png"));
		lPrintResult.delete();
    }
    
	public static final float MIN_MARGIN = 0.4f; // inches
	
  
    private void toPdf(String iPngFile, String iPdfFile, Element iConfig) throws Exception
    {
    	String lFormat = iConfig.getAttribute("format");
    	String lAuslegung = iConfig.getAttribute("auslegung");

    	Rectangle lPage = null;
    	if (lFormat.equals("A3"))
    	{
    		lPage = PageSize.A3;
    	}
    	else if (lFormat.equals("A4"))
    	{
    		lPage = PageSize.A4;
    	}

        if (lAuslegung.equals("quer"))
		{
        	lPage = lPage.rotate();
		}
        
        com.itextpdf.text.Document lDocument = new com.itextpdf.text.Document(lPage); 
    	
        lDocument.addSubject("Knotenplan");
        lDocument.addCreationDate();
        
        PdfWriter.getInstance(lDocument, new FileOutputStream(iPdfFile));
        Image lImage = Image.getInstance(iPngFile);
        lImage.setAbsolutePosition(0, 0);
        lImage.scaleToFit(lPage.getWidth(), lPage.getHeight());        
        
        lDocument.open();
        lDocument.add(lImage);
        lDocument.close();
        
        // copy png file as well for now
		//ImageIO.write(ImageIO.read(new File(iPngFile)), "png", new File(iPdfFile.replace(".pdf", ".png")));
    }
    
    public static void deleteDirectory(File iDirectory) 
    {
        if (iDirectory.exists())
        {
            File[] lFiles = iDirectory.listFiles();
            if(lFiles != null)
            {
                for(int i=0; i<lFiles.length; i++) 
                {
                    if(lFiles[i].isDirectory()) 
                    {
                        deleteDirectory(lFiles[i]);
                    }
                    else 
                    {
                        lFiles[i].delete();
                    }
                }
            }
        }
        iDirectory.delete();
    }
    
    public static void init()
    {
		File lPrintDir = new File(VisualServer.WEBROOT+ "pages/geopos/printdata");
        File[] lFiles = lPrintDir.listFiles();
        if (lFiles != null)
        {
            for(int i=0; i<lFiles.length; i++) 
            {
                if(lFiles[i].isDirectory()) 
                {
                    deleteDirectory(lFiles[i]);
                }
            }
        }
    }
    
    
    static class Watermark
    {
    	public static final int HOCH = 1;
    	public static final int QUER = 2;
    	
    	
    	public static final String FONT_NAME = "Arial";
    	public static final double FONT_ASPECT = 0.42;
    	
    	protected int mFontSize;
    	protected String mStrokeWidth;
    	protected int mAuslegung;
    	
    	public Watermark(int iAuslegung, int iFontSize, float iStrokeWidth)
    	{
    		mFontSize = iFontSize;
    		mStrokeWidth = String.valueOf(iStrokeWidth);
     		mAuslegung = iAuslegung;
    	}
    	
    	public void configure(Element iPlan, Element iElement, String iText)
    	{
    		String[] lViewbox = iPlan.getAttribute("viewbox").split(" ");
    		
    		iElement.setTextContent(iText);
    		iElement.setAttribute("font-size", String.valueOf(mFontSize));
    		iElement.setAttribute("font-family", FONT_NAME);
    		iElement.setAttribute("stroke-width", "0");
    		iElement.setAttribute("fill", "#BCBCBC");
       		iElement.setAttribute("opacity", "0.220");
       		iElement.removeAttribute("style");
     		
   			Double lX = Double.parseDouble(lViewbox[0]);
   			Double lY = Double.parseDouble(lViewbox[1]);
   			Double lW = Double.parseDouble(lViewbox[2]);
   			Double lH = Double.parseDouble(lViewbox[3]);

   			Double lD = Math.sqrt(lW*lW+lH*lH);

   			Double lAngle = 0.0;
      		switch (mAuslegung)
       		{
	       		case HOCH:
	       		{
	       			lAngle = -58.9;
	       		}
	      		break;
	       		case QUER:
	       		{
	       			lAngle = -36.3;
	       		}
	      		break;
       		}
    			
			iElement.setAttribute("transform", "translate("+lX+","+(lY+lH)+") rotate("+lAngle+") translate("+(lD/2-(0.5*iText.length()*mFontSize*FONT_ASPECT))+","+mFontSize/2+")"); 
    	}
    }
    
    static Map<String, Watermark> sWatermak = Collections.synchronizedMap(new HashMap<String, Watermark>());
    
    static
    {
    	sWatermak.put("A4hoch200",  new Watermark(Watermark.HOCH, 12,0.04f));
    	sWatermak.put("A4hoch500",  new Watermark(Watermark.HOCH, 22,0.1f));
    	sWatermak.put("A4hoch1000", new Watermark(Watermark.HOCH, 36,0.2f));
    	sWatermak.put("A4quer200",  new Watermark(Watermark.QUER, 12,0.04f));
    	sWatermak.put("A4quer500",  new Watermark(Watermark.QUER, 22,0.1f));
    	sWatermak.put("A4quer1000", new Watermark(Watermark.QUER, 36,0.2f));
    	
    	sWatermak.put("A3hoch200",  new Watermark(Watermark.HOCH, 17,0.06f));
    	sWatermak.put("A3hoch500",  new Watermark(Watermark.HOCH, 32,0.14f));
    	sWatermak.put("A3hoch1000", new Watermark(Watermark.HOCH, 50,0.28f));
    	sWatermak.put("A3quer200",  new Watermark(Watermark.QUER, 17,0.06f));
    	sWatermak.put("A3quer500" , new Watermark(Watermark.QUER, 32,0.14f));
    	sWatermak.put("A3quer1000", new Watermark(Watermark.QUER, 50,0.28f));
    }

    
    private String toString(Exception e)
    {
		StringWriter lWriter = new StringWriter();
		e.printStackTrace(new PrintWriter(lWriter));
		return lWriter.toString();
    }
}

