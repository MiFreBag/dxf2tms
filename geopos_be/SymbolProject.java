package ch.bergauer.am.vs.pages.geopos;

import java.io.File;
import java.io.FileFilter;
import java.io.StringWriter;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonObject;

//
// Symbols
//
public class SymbolProject
{
	public final static String NORDPFEIL = "101";
	public final static String PLANKOPF = "103";
	public final static String MASSSTAB = "102";
	public final static String KNOTENMITTE = "110";
	
	public final static String SPUR = "201";
	
	protected File mFile;
	protected Document mDocument;

	protected Double mWidth;
	protected Double mHeight;
	
	protected Double mDx = 0.0;
	protected Double mDy = 0.0;
	
	protected String mFilename;
	protected String mId;
	
	public SymbolProject(String iId, File iFile) throws Exception
	{
		mId = iId;
		mFile = iFile;
		
        mDocument = Xml.parse(mFile);
        
        Element lSvg = mDocument.getDocumentElement();
        String lString = lSvg.getAttribute("viewBox");
        String[] lDimension = lString.split(" ");
        mWidth = Double.parseDouble(lDimension[2]);
        mHeight = Double.parseDouble(lDimension[3]);
        
		lSvg.setAttribute("id", iId);
		lSvg.setAttribute("viewBox", -mWidth/2 + " " + (-mHeight/2) + " " + mWidth + " " + mHeight);
       
        Element lGroup = (Element)lSvg.getElementsByTagName("g").item(0);
        lGroup.setAttribute("transform", "translate(-"+mWidth/2.0+",-"+mHeight/2.0+")");
        
        // remove the style import from the individual symbols. The style sheet geopos_symb.css will be imported globally
		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lElement = (Element) lPath.evaluate("//style", mDocument, XPathConstants.NODE);
		if (lElement != null)
		{
			lElement.getParentNode().removeChild(lElement);
		}
        
        mFilename = iFile.getName();
	}
	
 	
	public JsonObject getJson()
	{
		return Xml.toJson(((Element)mDocument.getDocumentElement().getElementsByTagName("g").item(0)));
	}
	
	public String getString()
	{
		StringWriter lWriter = new StringWriter();
		try
		{
			Xml.write(((Element)mDocument.getDocumentElement().getElementsByTagName("g").item(0)), lWriter);
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
		return lWriter.toString();
	}

	
	
	//
	// Static
	//
	protected static Map<String, LinkedList<SymbolProject>> sSymbol = Collections.synchronizedMap(new HashMap<String, LinkedList<SymbolProject>> ());
	
		
	public static synchronized void init()
	{
		File lDirectory = new File(VisualServer.WEBROOT + "/themes/vrsz/images/geoposlib/project/");
		
		Log.out.info("loading project symbol catalog from "+lDirectory.getAbsolutePath());
		
		sSymbol.clear();
		
		
		FileFilter lFilter = new FileFilter() 
		{
			public boolean accept(File file) 
			{
				return file.isDirectory() && !file.getName().startsWith(".svn");
			}
		};
		
		File[] lDirs = lDirectory.listFiles(lFilter);
		
		Arrays.sort(lDirs, new Comparator<File>()
		{
		    public int compare(File o1, File o2) 
		    {
		    	return o1.getName().compareTo(o2.getName());
		    }

		}); 		
		
		for (File lEntry : lDirs)
		{
			File[] lFiles = lEntry.listFiles();
			
			Arrays.sort(lFiles, new Comparator<File>()
			{
			    public int compare(File o1, File o2) 
			    {
			    	return o1.getName().compareTo(o2.getName());
			    }

			}); 		
			
			
			LinkedList<SymbolProject> lList = new LinkedList<SymbolProject>();
			
			for (File lSymbol : lFiles)
			{
				try
				{
					String lName = lSymbol.getName();
					if (lName.endsWith(".svg"))//  && lName.startsWith("160_16_DET"))
					{
						lName = lName.substring(0, lName.indexOf(".svg"));
						String lString[] = lName.split("_");
						String lId = lString[0];
						lList.add(new SymbolProject(lId, lSymbol));
					}
				}
				catch (Exception e)
				{
					Log.out.error("parsing symbolkatalog file "+lSymbol.getName(), e);
				}
			}

			sSymbol.put(lEntry.getName().split("_")[1], lList);

		}
		
		Log.out.info("GeoPos project symbolkatalog loaded. "+sSymbol.size()+" files.");
	};
	
}

