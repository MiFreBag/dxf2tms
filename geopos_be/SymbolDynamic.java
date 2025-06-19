package ch.bergauer.am.vs.pages.geopos;

import java.io.File;
import java.io.FileFilter;
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
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.util.Log;


//
// Symbols
//
public class SymbolDynamic
{
	//public final static String DETEKTOR_REGEX = "\\.R\\.B\\.d(\\d+).*";   // remove
	//public final static String SPUR_REGEX = "\\.R\\.B\\.sg(\\d+).*";  // remove
	
	public final static String IMAGEDYNAMICPATH = "/themes/vrsz/images/geoposlib/dynamic/";
	
	protected String mId;
	protected File mFile;
	protected Document mXmlDocument;
	protected Document mSvgDocument;

	protected Double mWidth;
	protected Double mHeight;
	
	public SymbolDynamic(String iId, File iSvgFile, File iXmlFile) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		
		mId = iId;
		// read xml document
		mXmlDocument = Xml.parse(iXmlFile);
		
		// read svg document
		mSvgDocument = Xml.parse(iSvgFile);
        Element lSvg = mSvgDocument.getDocumentElement();
        String lString = lSvg.getAttribute("viewBox");
        String[] lDimension = lString.split(" ");

		lSvg.setAttribute("id", iId);
        
        // adjust viewbox
        mWidth = Double.parseDouble(lDimension[2]);
        mHeight = Double.parseDouble(lDimension[3]);
         
        // apply transform
		Double lCx = null; 
		Double lCy = null; 
		Element lElement = (Element) lPath.evaluate("//circle[@id='symbolcenter']", mSvgDocument, XPathConstants.NODE);
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
		lElement = (Element) lPath.evaluate("//style", mSvgDocument, XPathConstants.NODE);
		if (lElement != null)
		{
			lElement.getParentNode().removeChild(lElement);
		}
	}
	
 	public void insertSvg(Document iDocument, Element iParent, String iDpId)
	{
		Element lRoot =(Element) mSvgDocument.getDocumentElement().cloneNode(true);
		bindSvgElements(lRoot, iDpId); 
		
		NodeList lList= lRoot.getChildNodes();
		for (int i=0; i<lList.getLength(); i++)
		{
			Node lChild = lList.item(i);
			iParent.appendChild(iDocument.importNode(lChild, true));
		}
	}
 	
	protected void bindSvgElements(Element iElement, String iDpId) 
	{
        NodeList lList = iElement.getChildNodes();
        for (int i = 0; i < lList.getLength(); i++) 
        {
            Node lNode = lList.item(i);
            if (lNode.getNodeType() == Node.ELEMENT_NODE)
            {
            	Element lElement = (Element) lNode;
            	
               	NamedNodeMap lAttributes = lElement.getAttributes();
            	for (int a=0; a<lAttributes.getLength(); a++)
            	{
            		Node lEntry = lAttributes.item(a);
            		String lAttrbuteName = lEntry.getNodeName();
                	String lAttribute = lElement.getAttribute(lAttrbuteName);
                	
            		lAttribute = lAttribute.replaceAll("DPID", iDpId);
            		lElement.setAttribute(lAttrbuteName, lAttribute);
            	}
            	
            	bindSvgElements(lElement, iDpId);
            }
        }
    } 	
	
 	public void insertXml(Document iDocument, Element iParent, String iKnotenNr, String iObjectId, String iDpId)
	{
		Element lRoot = (Element)mXmlDocument.getDocumentElement().cloneNode(true);
		bindXmlElements(lRoot, iKnotenNr, iObjectId, iDpId); 
		
		NodeList lList= lRoot.getChildNodes();
		for (int i=0; i<lList.getLength(); i++)
		{
			Node lChild = lList.item(i);
			iParent.appendChild(iDocument.importNode(lChild, true));
		}
	}

	protected void bindXmlElements(Element iElement, String iKnotenNr, String iObjectId, String iDpId) 
	{
        NodeList lList = iElement.getChildNodes();
        for (int i = 0; i < lList.getLength(); i++) 
        {
            Node lNode = lList.item(i);
            if (lNode.getNodeType() == Node.ELEMENT_NODE)
            {
            	Element lElement = (Element) lNode;
              	
            	NamedNodeMap lAttributes = lElement.getAttributes();
            	for (int a=0; a<lAttributes.getLength(); a++)
            	{
            		Node lEntry = lAttributes.item(a);
            		String lAttrbuteName = lEntry.getNodeName();
                	String lAttribute = lElement.getAttribute(lAttrbuteName);
                	
            		lAttribute = lAttribute.replaceAll("DPID", iDpId);
            		lAttribute = lAttribute.replaceAll("KNOTENNR", iKnotenNr);
            		lAttribute = lAttribute.replaceAll("OBJEKTNR", iObjectId);
            		lElement.setAttribute(lAttrbuteName, lAttribute);
            	}
            	
        		if (lElement.getNodeName().equals("script"))
        		{
            		String lTextContent = lElement.getTextContent();
            		lTextContent = lTextContent.replaceAll("DPID", iDpId);
            		lTextContent = lTextContent.replaceAll("KNOTENNR", iKnotenNr);
            		lTextContent = lTextContent.replaceAll("OBJEKTNR", iObjectId);
            		lElement.setTextContent(lTextContent);
        		}
            	
            	bindXmlElements(lElement, iKnotenNr, iObjectId, iDpId);
            }
        }
    } 	
	
	
	//
	// Static
	//
	protected static Map<String, SymbolDynamic> sSymbolList = Collections.synchronizedMap(new HashMap<String, SymbolDynamic> ());
	protected static Map<Integer, SymbolDynamic> sSymbolLookup = Collections.synchronizedMap(new HashMap<Integer, SymbolDynamic> ());
	
	protected static Map<String, LinkedList<SymbolDynamic>> sSymbolCategory = Collections.synchronizedMap(new HashMap<String, LinkedList<SymbolDynamic>> ());
	
	
	public static SymbolDynamic get(String iId)
	{
		return sSymbolList.get(iId);
	}

	public static SymbolDynamic lookup(int iId)
	{
		return sSymbolLookup.get(iId);
	}
	
	
	public static synchronized void init()
	{
		File lRoot = new File(VisualServer.WEBROOT + IMAGEDYNAMICPATH);
		
		Log.out.info("loading dynamic symbol catalog from "+lRoot.getAbsolutePath());
		
		sSymbolCategory.clear();
		sSymbolList.clear();
		
		FileFilter lFilter = new FileFilter() 
		{
			public boolean accept(File file) 
			{
				return file.isDirectory() && !file.getName().startsWith(".svn");
			}
		};
		
		File[] lDirs = lRoot.listFiles(lFilter);
		
		Arrays.sort(lDirs, new Comparator<File>()
		{
		    public int compare(File o1, File o2) 
		    {
		    	return o1.getName().compareTo(o2.getName());
		    }

		}); 		
		
		for (File lCategory : lDirs)
		{
			File[] lFiles = lCategory.listFiles();
			
			Arrays.sort(lFiles, new Comparator<File>()
			{
			    public int compare(File o1, File o2) 
			    {
			    	return o1.getName().compareTo(o2.getName());
			    }

			}); 		
			
			LinkedList<SymbolDynamic> lList = new LinkedList<SymbolDynamic>();
			
			for (File lSvgFile : lFiles)
			{
				try
				{
					String lName = lSvgFile.getName();
					if (lName.endsWith(".svg"))
					{
						String lPath = lSvgFile.getAbsolutePath();
						lPath = lPath.substring(0, lPath.indexOf(".svg"));
						File lXmlFile = new File(lPath+".xml");
						if (lXmlFile != null)
						{
							String lId = lSvgFile.getName();
							lId = lId.substring(0, lId.lastIndexOf("."));
							SymbolDynamic lSymbol = new SymbolDynamic(lId, lSvgFile, lXmlFile);
							sSymbolList.put(lId, lSymbol);
							lList.add(lSymbol);
							
							// find the ones with a static symbol id as key
							String[] lSegments = lId.split("_");
							if (lSegments.length > 0)
							{
								try
								{
									Integer lSymbolId = Integer.parseInt(lSegments[0]);
									sSymbolLookup.put(lSymbolId, lSymbol);
								}
								catch (Exception e)
								{
									
								}
							}
						}
					}
				}
				catch (Exception e)
				{
					Log.out.error("parsing symbolkatalog file "+lSvgFile.getName(), e);
				}
			}

			sSymbolCategory.put(lCategory.getName().split("_")[1], lList);
		}
		
		Log.out.info("GeoPos project symbolkatalog loaded. "+sSymbolCategory.size()+" files.");
	};
	
	public static SymbolDynamic getDefault(String iCategory, String[] lRow)
	{
		if (iCategory.equals("SPUR"))
		{
			for (SymbolDynamic lSymbol : sSymbolCategory.get("Signalgruppen"))
			{
				if (lSymbol.mId.startsWith(lRow[6]+"_"))
				{
					return lSymbol;
				}
			}
			
			return sSymbolList.get("210_21_SPUR");
		}
		else if (iCategory.equals("DETEKTOR"))
		{
			for (SymbolDynamic lSymbol : sSymbolCategory.get("Detektoren"))
			{
				if (lSymbol.mId.startsWith(lRow[3]+"_"))
				{
					return lSymbol;
				}
			}
			return sSymbolList.get("kntvis_detektor_t_links");
		}
		else if (iCategory.equals("VVA"))
		{
			
			for (SymbolDynamic lSymbol : sSymbolCategory.get("VVa"))
			{
				if (lSymbol.mId.startsWith(lRow[3]+"_")) // SYMBOLID
				{
					return lSymbol;
				}
			}
			return sSymbolList.get("500_19_SRZG");
		}
		
		return null;
	}

}

