package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.config.UrlConfig;
import ch.bergauer.am.vs.config.UrlConfigEntry;
import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonObject;

//
// Symbols
//
public class SymbolStatic
{
	public final static String NORDPFEIL = "101";
	public final static String PLANKOPF = "103";
	public final static String MASSSTAB = "102";
	public final static String KNOTENMITTE = "110";
	public final static String UNKNOWN = "0";
	
	public final static String SPUR = "201";
	
	public final static String IMAGESTATICPATH = "/themes/vrsz/images/geoposlib/static/";
	
	protected File mFile;
	protected Document mDocument;

	protected Double mWidth;
	protected Double mHeight;
	
	protected String mFilename;
	protected String mId;
	
	public SymbolStatic(String iId, File iFile) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		
		mId = iId;
		mFile = iFile;
        mDocument = Xml.parse(mFile);
        Element lSvg = mDocument.getDocumentElement();
        String lString = lSvg.getAttribute("viewBox");
        String[] lDimension = lString.split(" ");

  //      System.out.println(lString);
		lSvg.setAttribute("id", iId);
        
        // adjust viewbox
        mWidth = Double.parseDouble(lDimension[2]);
        mHeight = Double.parseDouble(lDimension[3]);
		
        // apply transform
		Double lCx = null; 
		Double lCy = null; 
		Element lElement = (Element) lPath.evaluate("//circle[@id='symbolcenter']", mDocument, XPathConstants.NODE);
		if (lElement != null)
		{
			lCx = Double.parseDouble(lElement.getAttribute("cx")); 
			lCy = Double.parseDouble(lElement.getAttribute("cy")); 
		}
		else
		{
			lCx = mWidth/2.0;
			lCy = mHeight/2.0;
		}

		lSvg.setAttribute("viewBox", (-lCx) + " " + (-lCy) + " " + mWidth + " " + mHeight);
        Element lGroup = (Element)lSvg.getElementsByTagName("g").item(0);
        lGroup.setAttribute("transform", "translate("+(-lCx)+","+(-lCy)+")");
		
        
        // remove the style import from the individual symbols. The style sheet geopos_symb.css will be imported globally
		lElement = (Element) lPath.evaluate("//style", mDocument, XPathConstants.NODE);
		if (lElement != null)
		{
			lElement.getParentNode().removeChild(lElement);
		}
        
		
        mFilename = iFile.getName();
	}
	
	
 	public void insert(Document iDocument, Element iParent)
	{
		Element lRoot = mDocument.getDocumentElement();
		NodeList lList= lRoot.getChildNodes();
		for (int i=0; i<lList.getLength(); i++)
		{
			Node lChild = lList.item(i);
			iParent.appendChild(iDocument.importNode(lChild, true));
		}
	}
	
	public JsonObject getJson()
	{
		return Xml.toJson(((Element)mDocument.getDocumentElement().getElementsByTagName("g").item(0)));
	}
	
	//
	// Static
	//
	

	//
	// Symbols
	//
	protected static Map<String, SymbolStatic> sSymbol = Collections.synchronizedMap(new HashMap<String, SymbolStatic> ());
	
	public static synchronized SymbolStatic get(String iId)
	{
		SymbolStatic lSymbol = sSymbol.get(iId);
		if (lSymbol == null)
		{
			lSymbol = sSymbol.get(UNKNOWN);
			Log.out.error("Symbol " + iId + " has error, please check the svg in "+IMAGESTATICPATH);
		}
		return lSymbol;
	}

	// for plankopf only
	public static synchronized SymbolStatic getPlankopf(Projection iProjection)
	{
		return sSymbol.get(PLANKOPF+iProjection.mFormat+iProjection.mMassstab);
	}
	
	
	//
	// Symbol Selection
	//
	static class SymbolConfig
	{
		//ID	BEZ	KLASSE	AMPELTYP	AMPELGEHAEUSETYP	BESCHREIBUNG	STDSTATUS	DETEKTORFUNKTION	DETEKTORAUFB	BEDIENUNGSKASTEN	DETEKTORERFART	MONTAGE	AMPELFUNKTION	VVATYP	ABBIEGEBEZIEHUNG
		public static final int ID = 0;
		public static final int BEZ = 1;
		public static final int KLASSE = 2;
		public static final int AMPELTYP = 3;
		public static final int AMPELGEHAEUSETYP = 4;
		public static final int BESCHREIBUNG = 5;
		public static final int STDSTATUS = 6;
		public static final int DETEKTORFUNKTION = 7;
		public static final int DETEKTORAUFB = 8;
		public static final int BEDIENUNGSKASTEN = 9;
		public static final int DETEKTORERFART = 10;
		public static final int MONTAGE = 11;
		public static final int AMPELFUNKTION = 12;
		public static final int VVATYP = 13;
		public static final int ABBIEGEBEZIEHUNG = 14;
		
		public SymbolStatic mSymbol; 
		protected String [] mAttributes;
		
		public SymbolConfig(String iLine)
		{
			mAttributes = iLine.split("\t",-1);
			
			if (mAttributes.length != 15)
			{
				Log.out.error("Invalid entry in Symbol.cf " + iLine);
			}
			
			mSymbol = SymbolStatic.get(mAttributes[ID]);
			if (mSymbol == null)
			{
				Log.out.error("Symbol " + ID + " not found for Symbol.cf entry " + iLine);
			}
		}
	}
	protected static List<SymbolConfig> sSymbolMap = Collections.synchronizedList(new LinkedList<SymbolConfig>());
	
	
	static interface SymbolSelector 
	{
		public LinkedList<SymbolStatic> select(String[] iAttributes);
	}

	static class ClassSelector implements SymbolSelector 
	{
		private String mClass;
		
		public ClassSelector(String iClass)
		{
			mClass = iClass;
		}
		@Override
		public LinkedList<SymbolStatic> select(String[] iAttributes)
		{
			LinkedList<SymbolStatic> lResult = new LinkedList<SymbolStatic>();
			for (SymbolConfig lEntry : sSymbolMap)
			{
				if (lEntry.mAttributes[SymbolConfig.KLASSE].equals(mClass))
				{
					lResult.add(lEntry.mSymbol);
				}
			}
			return lResult;
		}
	}
	
	
	protected static HashMap<String, SymbolSelector> sCategory = new HashMap<String, SymbolSelector>();
	
	static
	{
		sCategory.put(LayerStatic.AMPEL, new SymbolSelector ()
		{
			@Override
			public LinkedList<SymbolStatic> select(String[] iAttributes)
			{
				SymbolStatic lVibraDefault = null;
				
				//INFOS,XKOORD,YKOORD,SYMBOLID,SYMBOLDREHWINKEL,MASTNR,AMPELNR,AMPELFUNKTION,AMPELTYP,MONTAGE,AMPELGEHAEUSETYP
				LinkedList<SymbolStatic> lResult = new LinkedList<SymbolStatic>();
				for (SymbolConfig lEntry : sSymbolMap)
				{
					if (lEntry.mAttributes[SymbolConfig.KLASSE].equals(LayerStatic.AMPEL) &&
					   (lEntry.mAttributes[SymbolConfig.AMPELFUNKTION].equals("") || lEntry.mAttributes[SymbolConfig.AMPELFUNKTION].equals(iAttributes[7])) &&
					   (lEntry.mAttributes[SymbolConfig.AMPELGEHAEUSETYP].equals("") || lEntry.mAttributes[SymbolConfig.AMPELGEHAEUSETYP].equals(iAttributes[10])) &&
					   (lEntry.mAttributes[SymbolConfig.AMPELTYP].equals("") || lEntry.mAttributes[SymbolConfig.AMPELTYP].equals(iAttributes[8])) &&
					   (lEntry.mAttributes[SymbolConfig.MONTAGE].equals("") || lEntry.mAttributes[SymbolConfig.MONTAGE].equals(iAttributes[9])))				
					{
						lResult.add(lEntry.mSymbol);
						
						if (lEntry.mSymbol.mId.equals("358"))
						{
							lVibraDefault = lEntry.mSymbol;
						}
					}
				}
				
				if (lVibraDefault != null)
				{
					lResult.remove(lVibraDefault);
					lResult.add(0, lVibraDefault);
				}
				
				return lResult;
			}
		});
		
		sCategory.put(LayerStatic.DETEKTOR, new SymbolSelector ()
		{
			@Override
			public LinkedList<SymbolStatic> select(String[] iAttributes)
			{
				//INFOS,XKOORD,YKOORD,SYMBOLID,SYMBOLDREHWINKEL,DETEKTORNR,DISTANZ,DETEKTORFUNKTION,DETEKTORAUFB,DETEKTORERFART
				LinkedList<SymbolStatic> lResult = new LinkedList<SymbolStatic>();
				for (SymbolConfig lEntry : sSymbolMap)
				{
					if (lEntry.mAttributes[SymbolConfig.KLASSE].equals(LayerStatic.DETEKTOR) &&
					   (lEntry.mAttributes[SymbolConfig.DETEKTORFUNKTION].equals("") || lEntry.mAttributes[SymbolConfig.DETEKTORFUNKTION].equals(iAttributes[7])) &&
					   (lEntry.mAttributes[SymbolConfig.DETEKTORAUFB].equals("") || lEntry.mAttributes[SymbolConfig.DETEKTORAUFB].equals(iAttributes[8])) &&
					   (lEntry.mAttributes[SymbolConfig.DETEKTORERFART].equals("") || lEntry.mAttributes[SymbolConfig.DETEKTORERFART].equals(iAttributes[9])))				
					{
						lResult.add(lEntry.mSymbol);
					}
				}
				return lResult;
			}
		});
		
		sCategory.put(LayerStatic.VVA, new SymbolSelector ()
		{
			@Override
			public LinkedList<SymbolStatic> select(String[] iAttributes)
			{
				//INFOS,XKOORD,YKOORD,SYMBOLID,SYMBOLDREHWINKEL,VVANR,VVATYP,ABBIEGEBEZIEHUNG,ETARADIUS,SPUR
				LinkedList<SymbolStatic> lResult = new LinkedList<SymbolStatic>();
				for (SymbolConfig lEntry : sSymbolMap)
				{
					if (lEntry.mAttributes[SymbolConfig.KLASSE].equals(LayerStatic.VVA) &&
					   (lEntry.mAttributes[SymbolConfig.VVATYP].equals("") || lEntry.mAttributes[SymbolConfig.VVATYP].equals(iAttributes[6])) &&
					   (lEntry.mAttributes[SymbolConfig.ABBIEGEBEZIEHUNG].equals("") || lEntry.mAttributes[SymbolConfig.ABBIEGEBEZIEHUNG].equals(iAttributes[7])))				
					{
						lResult.add(lEntry.mSymbol);
					}
				}
				return lResult;
			}
		});
		
		sCategory.put(LayerStatic.AMPELMAST, new SymbolSelector ()
		{
			@Override
			public LinkedList<SymbolStatic> select(String[] iAttributes)
			{
				//INFOS,XKOORD,YKOORD,SYMBOLID,SYMBOLDREHWINKEL,MASTNR,BEDIENUNGSKASTEN
				LinkedList<SymbolStatic> lResult = new LinkedList<SymbolStatic>();
				for (SymbolConfig lEntry : sSymbolMap)
				{
					if (lEntry.mAttributes[SymbolConfig.KLASSE].equals(LayerStatic.AMPELMAST) &&
					   (lEntry.mAttributes[SymbolConfig.BEDIENUNGSKASTEN].equals("") || lEntry.mAttributes[SymbolConfig.BEDIENUNGSKASTEN].equals(iAttributes[6])))				
					{
						lResult.add(lEntry.mSymbol);
					}
				}
				return lResult;
			}
		});
		
				
		sCategory.put(LayerStatic.SPUR, new ClassSelector (LayerStatic.SPUR));
		sCategory.put(LayerStatic.STEUERGERAET, new ClassSelector (LayerStatic.STEUERGERAET));
		sCategory.put(LayerStatic.NORDPFEIL, new ClassSelector (LayerStatic.NORDPFEIL));
		sCategory.put(LayerStatic.KNOTENMITTE, new ClassSelector (LayerStatic.KNOTENMITTE));
		sCategory.put(LayerStatic.MASSSTAB, new ClassSelector (LayerStatic.MASSSTAB));
	}
	

	
	
	public static synchronized List<SymbolStatic> getList(String iCategory, String[] iAttributes)
	{
		SymbolSelector lSelector = sCategory.get(iCategory);
		if (lSelector != null)
		{
			return lSelector.select(iAttributes);
		}
		return new LinkedList<SymbolStatic>();
	}

	//
	// Initialization
	//
	private static long sLastRead = 0;
	
	public static synchronized void init()
	{
        VisualServer.scheduleAtFixedRate(new Runnable()
        {
			@Override
			public void run() 
			{
				try
				{
					UrlConfigEntry lEntry = UrlConfig.getLink("geopos");
					String lPath = (String)lEntry.getAttribute("symbol.cf");

					File lSymbolFile = new File(lPath);
					if (lSymbolFile.lastModified() > sLastRead)
					{
						sLastRead = lSymbolFile.lastModified(); 
						File lDirectory = new File(VisualServer.WEBROOT + IMAGESTATICPATH);
						
						Log.out.info("loading static symbol catalog from "+lDirectory.getAbsolutePath());
						
						sSymbol.clear();
						for (File lFile : lDirectory.listFiles())
						{
							try
							{
								String lName = lFile.getName();
								if (lName.endsWith(".svg"))
								{
									lName = lName.substring(0, lName.indexOf(".svg"));
									String lString[] = lName.split("_");
									String lId = lString[0];
									if (lId.equals(PLANKOPF))
									{
										lId = lId+lString[lString.length-2]+lString[lString.length-1];
									}
									sSymbol.put(lId, new SymbolStatic(lId, lFile));
								}
							}

							catch (Exception e)
							{
								Log.out.error("parsing symbolkatalog file "+lFile.getName(), e);
							}
						}
						
						Log.out.info("GeoPos Symbolkatalog loaded. "+sSymbol.size()+" files.");

						//
						// read symbol map... this defines what symbols can be chosen for a given object 
						//
						sSymbolMap.clear();
						try 
						{	
							BufferedReader lReader = new BufferedReader(new FileReader(lSymbolFile));
							String lLine = lReader.readLine();
							lLine = lReader.readLine();
							lLine = lReader.readLine();
							lLine = lReader.readLine();

							lLine = lReader.readLine();
							while (lLine != null)
							{
								sSymbolMap.add(new SymbolConfig(lLine));
								lLine = lReader.readLine();
							}
							
							lReader.close();
						} 
						catch (Exception e) 
						{
							Log.out.error("parsing config file /opt/alertmaster/ivsconfig/object_cf/dbmgr/symbol.cf", e);
						}
					}
				}
				catch (Exception e)
				{
					Log.out.error("Running Symbol refresh task", e);
				}
			}
        }, 0, 60000);
	};


	
}

