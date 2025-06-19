package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.StringWriter;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonObject;

public class LayerStatic extends Layer
{
	public static final String AMPEL = "AMPEL";
	public static final String AMPELMAST = "AMPELMAST";
	public static final String SPUR = "SPUR";
	public static final String DETEKTOR = "DETEKTOR";
	public static final String VVA = "VVA";
	public static final String STEUERGERAET = "STEUERGERAET";
	public static final String NORDPFEIL = "NORDPFEIL";
	public static final String MASSSTAB = "MASSSTAB";
	public static final String KNOTENMITTE = "KNOTENMITTE";
	public static final String KNOTEN = "KNOTEN";
	public static final String META = "META";
	
	public static final String REMOTE_ID = "geopos-static";
	
	protected InfoFile mInfoFile;
	
	protected HashMap<String, String[]> mObjectMap = new HashMap<String, String[]> ();
	
	protected LayerStaticAttributes mAttributes;
	
	private abstract class ObjectBuilder 
	{
		public void getSymbolText(Element iSymbol, String[] iColumn) throws Exception {} ;
		public void getDisplayText(Element iSymbol, String[] iColumn) throws Exception {};
		public abstract String getCategory();
	}
	
	private class NumberComparator implements Comparator<String[]>
	{
		int mColumn;
		
		public NumberComparator(int iColumn)
		{
			mColumn = iColumn;
		}
		
		@Override
		public int compare(String[] o1, String[] o2) 
		{
			Integer v1 = Integer.parseInt(o1[mColumn]);
			Integer v2 = Integer.parseInt(o2[mColumn]);
			return v1.compareTo(v2);
		}
	};
	
	public LayerStatic(Knoten iPlan, InfoFile iInfoFile)
	{
		super(iPlan, "STATIC");
		
		mInfoFile = iInfoFile;
		try
		{	 
			Projection lProjection = new Projection(mInfoFile, "LAGEPLAN");
			
    		addCategory(lProjection, SPUR, new ObjectBuilder()
    		{
    			@Override
     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
    			{
    				iElement.setAttribute("name", "Spur " + iColumn[5]);
    			}
     			
    			@Override
    			public void getSymbolText(Element iSymbol, String[] iColumn) throws Exception
    			{
			   		Xml.setTextFeld(iSymbol, iColumn[5]);
    			};
    			
     			@Override
    			public String getCategory()
    			{
    				return SPUR;
    			}
    		}, new NumberComparator(5));
    		
       		addCategory(lProjection, DETEKTOR, new ObjectBuilder()
    		{
       			@Override
    			public void getSymbolText(Element iSymbol, String[] iColumn) throws Exception
    			{
			   		String lText = iColumn[5];
			   		try
			   		{
			   			Integer lDistance = Integer.parseInt(iColumn[6]);
			   			if (lDistance > 10.0)
			   			{
			   				lText +=  " (" + lDistance + " m)";
			   			} 
			   		}
			   		catch (Exception e)
			   		{
		   				lText +=  " (.. m)";
			   		}
			   		
			   		Xml.setTextFeld(iSymbol, lText);
    			};
    			
    			@Override
    			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
    			{
					iElement.setAttribute("name", "Detektor " + iColumn[5]);
    			}
    			
     			@Override
    			public String getCategory()
    			{
    				return DETEKTOR;
    			}
     		}, new NumberComparator(5));
       		
       		addCategory(lProjection, VVA, new ObjectBuilder()
    		{
       			@Override
    			public void getSymbolText(Element iSymbol, String[] iColumn) throws Exception
    			{
			   		String lText = iColumn[5];
			   		
			   		Xml.setTextFeld(iSymbol, lText);
    			};
    			
    			@Override
    			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
    			{
					iElement.setAttribute("name", "VVa " + iColumn[5]);
    			}
    			
     			@Override
    			public String getCategory()
    			{
    				return VVA;
    			}
     		}, new NumberComparator(5));
       		
	    	addCategory(lProjection, AMPELMAST, new ObjectBuilder()
    		{
       			@Override
    			public void getSymbolText(Element iSymbol, String[] iColumn) throws Exception
    			{
			   		String lText = "";
		   			if (iColumn[6].equals("ja"))
		   			{
		   				lText = "BK";
		   			}
		   			else
		   			{
		   				lText = iColumn[5];
		   			}
			   		
			   		Xml.setTextFeld(iSymbol, lText);
    			};
	    		
	    		@Override
     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
    			{
	    			String lText = "Mast " + iColumn[5];
	    			
		   			if (iColumn[6].equals("ja"))
		   			{
		   				lText += " - BK";
		   			}
	    			
    				iElement.setAttribute("name", lText);
    			}    			
    			
     			@Override
    			public String getCategory()
    			{
    				return AMPELMAST;
    			}
    		}, new NumberComparator(5));
	    	
    		addCategory(lProjection, AMPEL, new ObjectBuilder()
    		{
    			@Override
    			public void getSymbolText(Element iSymbol, String[] iColumn) throws Exception
    			{
    				Xml.setTextFeld(iSymbol, iColumn[5] +  iColumn[6]);
    			};
    			
    			@Override
     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
    			{
      			    iElement.setAttribute("name", "Ampel " + iColumn[5] + iColumn[6]);
    			}    			
    			
     			@Override
    			public String getCategory()
    			{
    				return AMPEL;
    			}
     		}, new NumberComparator(5));
	    	
	    	addCategory(lProjection, STEUERGERAET, new ObjectBuilder()
    		{
     			@Override
     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
    			{
    				iElement.setAttribute("name", "Steuergeraet");
    			}    			
    			
     			@Override
     			public String getCategory()
    			{
    				return STEUERGERAET;
    			}
    		}, null);
	    	

			XPath lPath = XPathFactory.newInstance().newXPath();
			
    		// add Knotenmitte
			Element lCategory = (Element) lPath.evaluate("//g[(@class='category' and @id='KNOTEN')]", mElement, XPathConstants.NODE); 
	    	if (lCategory == null)
	    	{
	    		lCategory = mDocument.createElement("g");
	    		lCategory.setAttribute("class", "category");
	    		lCategory.setAttribute("id", "KNOTEN");
	    		mElement.appendChild(lCategory);
	    		
	    		// Knotenmitte may already exist under META
				if (InfoFile.getVersion(mDocument) == InfoFile.VERSION_1)
		    	{
					Element lKnoten = (Element) lPath.evaluate("//g[(@class='object' and @id='KNOTEN')]", mElement, XPathConstants.NODE); 
		    		lKnoten.setAttribute("id", KNOTENMITTE);
		    		lCategory.appendChild(lKnoten);
		    	}
		    	else
		    	{
		    		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(KNOTEN)));
		    		String lLine = lReader.readLine();
					lLine = lReader.readLine(); 
					String[] lColumn = lLine.split(",",-1);
					lReader.close();
	
		    		lCategory.appendChild(insertSymbol(SymbolStatic.get(SymbolStatic.KNOTENMITTE), lColumn, KNOTENMITTE, lProjection, new ObjectBuilder()
		    		{
		     			@Override
		     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
		    			{
		    				iElement.setAttribute("name", "Knotenmitte");
		    			}
		    			
		     			@Override
		    			public String getCategory()
		    			{
		    				return KNOTEN;
		    			}
		    		}));
		    	}
	    	}
	    	
    		// center Knotenmitte if necessary
 			Element lKnotenMitte = (Element) lPath.evaluate("//g[(contains(concat(' ', @class, ' '), 'object') and @id='KNOTENMITTE')]", lCategory, XPathConstants.NODE); 
	    	lProjection.centerObject(lKnotenMitte);
	    	
    		// add Nordpfeil, Massstab
 			lCategory = (Element) lPath.evaluate("//g[(@class='category' and @id='META')]", mElement, XPathConstants.NODE); 
	    	if (lCategory == null)
	    	{
	    		lCategory = mDocument.createElement("g");
	    		lCategory.setAttribute("class", "category");
	    		lCategory.setAttribute("id", "META");
	    		mElement.appendChild(lCategory);
	    		
				BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(MASSSTAB)));
				String lLine = lReader.readLine();
				lLine = lReader.readLine(); 
				String[] lColumn = lLine.split(",",-1);
				lReader.close();

	    		lCategory.appendChild(insertSymbol(SymbolStatic.get(SymbolStatic.MASSSTAB), lColumn, MASSSTAB, lProjection, new ObjectBuilder()
	    		{
	     			@Override
	     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
	    			{
	    				iElement.setAttribute("name", "Massstab");
	    			}
	    			
	     			@Override
	    			public String getCategory()
	    			{
	    				return META;
	    			}
	    		}));
	    		
				lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(NORDPFEIL)));
				lLine = lReader.readLine();
				lLine = lReader.readLine(); 
				lColumn = lLine.split(",",-1);
				lReader.close();

	    		lCategory.appendChild(insertSymbol(SymbolStatic.get(SymbolStatic.NORDPFEIL), lColumn, NORDPFEIL, lProjection, new ObjectBuilder()
	    		{
	     			@Override
	     			public void getDisplayText(Element iElement, String[] iColumn) throws Exception
	    			{
	    				iElement.setAttribute("name", "Nordpfeil");
	    			}
	    			
	     			@Override
	    			public String getCategory()
	    			{
	    				return META;
	    			}
	    		}));
	    	}
	    	else
	    	{
	    		if (InfoFile.getVersion(mDocument) == InfoFile.VERSION_1)
	    		{
		    		Element lObject = (Element) lPath.evaluate("//*[local-name()='object'][@id='NORDPFEIL']", mDocument, XPathConstants.NODE);
		    		lObject.setAttribute("category", "META");
		    		lObject = (Element) lPath.evaluate("//*[local-name()='object'][@id='MASSSTAB']", mDocument, XPathConstants.NODE);
		    		lObject.setAttribute("category", "META");
	    		}
	    	}
 		}
		catch (Exception e)
		{
			Log.out.error("Creating object elements STATIC", e);
		}
		
		
		mAttributes = new LayerStaticAttributes(iInfoFile);
	}

	
	protected void addCategory(Projection iProjection, String iId, ObjectBuilder iBuilder, Comparator<String[]> iComparator)
	{
		try
		{
			XPath lPath = XPathFactory.newInstance().newXPath();  
			
			Element lCategory = (Element) lPath.evaluate("//g[(@class='category' and @id='"+iId+"')]", mElement, XPathConstants.NODE); 
	    	if (lCategory == null)
	    	{
	    		lCategory = mDocument.createElement("g");
	    		lCategory.setAttribute("class", "category");
	    		lCategory.setAttribute("id", iId);
	    		mElement.appendChild(lCategory);
	    	}

	    	addObjects(iProjection, lCategory, mInfoFile.getSourceFile(iId), iBuilder, iComparator);
		}
		catch (Exception e)
		{
			Log.out.error("Creating plan layer element " + iId, e);
		}
	}
	
	protected void addObjects(Projection iProjection, Element iCategory, File iFile, ObjectBuilder iBuilder, Comparator<String[]> iComparator) throws Exception
	{
		// create Layer objects
    	if (iFile.exists())
    	{
    		// read and sort objects
			BufferedReader lReader = new BufferedReader(new FileReader(iFile));
			String lLine = lReader.readLine();
			LinkedList<String[]> lFileContent = new LinkedList<String[]>();
			while ((lLine = lReader.readLine()) != null) 
			{
				String[] lColumn = lLine.split(",",-1);
				lFileContent.add(lColumn);
			}
			
			if (iComparator != null)
			{
				Collections.sort(lFileContent, iComparator);
			}
			
			// add objects to svg
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		HashSet<String> lVamId = new HashSet<String> ();
			for (String[] lColumn : lFileContent)
			{
				lVamId.add(lColumn[0]);
				
		   		Element lObject = (Element) lPath.evaluate(".//g[(contains(concat(' ', @class, ' '), 'object') and @id='"+lColumn[0]+"')]", iCategory, XPathConstants.NODE); 
		   		if (lObject == null)
		   		{
					SymbolStatic lSymbol = null;
		   			if (lColumn[3].equals(""))
		   			{
		   				List<SymbolStatic> lList = SymbolStatic.getList(iBuilder.getCategory(), lColumn);
		   				if (lList.size() > 0)
		   				{
		   					lSymbol = lList.get(0); 
				   			lColumn[3] = lSymbol.mId;
		   				}
			   			else
			   			{
				   			lSymbol = SymbolStatic.get(SymbolStatic.UNKNOWN);		   	
				   			lColumn[3] = SymbolStatic.UNKNOWN;
			   			}
		   			}
		   			else
		   			{
			   			lSymbol = SymbolStatic.get(lColumn[3]);		   				
		   			}
		   			
					if (iBuilder != null)
					{
						iBuilder.getSymbolText(lSymbol.mDocument.getDocumentElement(), lColumn);
					}
					
					Element lElement = insertSymbol(lSymbol, lColumn, lColumn[0],  iProjection, iBuilder);
					iCategory.appendChild(lElement);
		   		}
		   		else
		   		{
					if (iBuilder != null)
					{
						iBuilder.getSymbolText(lObject, lColumn);
					}
					
					
					// this is to make sure the sort order is applied to older files.
					iCategory.appendChild(iCategory.removeChild(lObject));
		   		}
		   		
		   		mObjectMap.put(lColumn[0], lColumn);
			}
			lReader.close();
			
    		// remove all missing objects. Assume they do not exist anymore.
			//Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mDocument.getDocumentElement(), XPathConstants.NODE); 
			NodeList lList = (NodeList) lPath.evaluate(".//g[contains(concat(' ', @class, ' '), 'object')]", iCategory, XPathConstants.NODESET); 
			for (int i=0; i<lList.getLength(); i++)
			{
				Element lObject = (Element)lList.item(i);
				if (!lVamId.contains(lObject.getAttribute("id")))
				{
					lObject.getParentNode().removeChild(lObject);
					
					// remove from meta as well
					Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+lObject.getAttribute("id")+"']", mDocument, XPathConstants.NODE);
					lMeta.getParentNode().removeChild(lMeta);
				}
			}
    	}
	}
	
	protected Element insertSymbol(SymbolStatic iSymbol, String[] iColumn, String iId, Projection iProjection, ObjectBuilder iBuilder) throws Exception
	{
		Element lGroup = mDocument.createElement("g");

		Double lXco = 0.0;
		boolean lUnpositioned = false;
		if (iColumn[1].length() > 0)
		{
			lXco = Double.parseDouble(iColumn[1]);
		}
		else
		{
			// use center of map
			lXco = 0.0;//iProjection.svgToChX(iProjection.mLeft + iProjection.mWidth/2.0);
			lUnpositioned = true;
		}
		
		Double lYco = 0.0;
		if (iColumn[2].length() > 0)
		{
			lYco = Double.parseDouble(iColumn[2]);
		}
		else
		{
			// use center of map
			lYco = 0.0;//iProjection.svgToChY(iProjection.mTop + iProjection.mHeight/2.0);
			lUnpositioned = true;
		}
		

		if (lUnpositioned)
		{
			lGroup.setAttribute("class", "object unpositioned");
		}
		else
		{
			lGroup.setAttribute("class", "object");
		}

		
		
		Double lAngle = 0.0;
		if (iColumn[4].length() > 0)
		{
			lAngle = Double.parseDouble(iColumn[4]);
		}
		
		
        lGroup.setAttribute("transform", getMatrix(iProjection, iSymbol, lAngle, lXco, lYco));
		lGroup.setAttribute("id", iId);
		iSymbol.insert(mDocument, lGroup);
		
		// add entry to defs
		Element lMeta = mDocument.createElement("geopos:object");
		lMeta.setAttribute("id", iId);
		lMeta.setAttribute("symbolid", iColumn[3]);
		lMeta.setAttribute("category", iBuilder.getCategory());
		
		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mDocument.getDocumentElement(), XPathConstants.NODE); 
		lDefs.appendChild(lMeta);
		iBuilder.getDisplayText(lMeta, iColumn);
		return lGroup;
	}
	

	protected String getMatrix(Projection iProjection, SymbolStatic iSymbol, Double iAngle, Double iX, Double iY) throws Exception
	{
        Double lAngle = -iAngle*Math.PI/180.0;
        Double e = iProjection.chToViewboxX(iX);
        Double f = iProjection.chToViewboxY(iY);

        Double a = Math.cos(lAngle);
        Double b = Math.sin(lAngle);
        Double c = -Math.sin(lAngle);
        Double d = Math.cos(lAngle);
        
		
		return "matrix("+ a +" "+ b +" " + c +" "+ d +" " + e +" "+f+")";        
	}
	
	//
	// delete layer from svg file 
	//
	@Override 
	public void delete() 
	{
		//Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+iObject+"']", mDocument, XPathConstants.NODE);
		
		try
		{
			XPath lPath = XPathFactory.newInstance().newXPath();
			Element lDefs = (Element) lPath.evaluate("//defs[@id='DEFS']", mDocument, XPathConstants.NODE); 
			
			NodeList lList = (NodeList) lPath.evaluate("//*[local-name()='object']", mDocument, XPathConstants.NODESET);
			for (int i=lList.getLength()-1; i>=0; i--)
			{
				lDefs.removeChild(lList.item(i));
			}
		}
		catch (Exception e)
		{
			Log.out.error("Creating plan layer element ", e);
		}

		super.delete();
		
		Xml.removeWhitespace(mDocument.getDocumentElement());
	}	
	
	//
	// exporting
	//
	
	public void saveInVamToGpos(Projection iProjection) throws Exception
	{
		saveObjects(iProjection, AMPEL);
		saveObjects(iProjection, AMPELMAST);
		saveObjects(iProjection, STEUERGERAET);
		saveObjects(iProjection, DETEKTOR);
		saveObjects(iProjection, VVA);
		saveObjects(iProjection, SPUR);

		saveMeta(iProjection, NORDPFEIL);
		saveMeta(iProjection, MASSSTAB);
		saveKnotenmitte(iProjection);
	}
	
	public static void copyToGposToVam(InfoFile iInfoFile) throws Exception
	{
		Xml.copyFile(iInfoFile.getSourceFile(AMPEL), iInfoFile.getDestFile(AMPEL));
		Xml.copyFile(iInfoFile.getSourceFile(AMPELMAST), iInfoFile.getDestFile(AMPELMAST));
		Xml.copyFile(iInfoFile.getSourceFile(STEUERGERAET), iInfoFile.getDestFile(STEUERGERAET));
		Xml.copyFile(iInfoFile.getSourceFile(DETEKTOR), iInfoFile.getDestFile(DETEKTOR));
		Xml.copyFile(iInfoFile.getSourceFile(VVA), iInfoFile.getDestFile(VVA));
		Xml.copyFile(iInfoFile.getSourceFile(SPUR), iInfoFile.getDestFile(SPUR));
		
		Xml.copyFile(iInfoFile.getSourceFile(NORDPFEIL), iInfoFile.getDestFile(NORDPFEIL));
		Xml.copyFile(iInfoFile.getSourceFile(MASSSTAB), iInfoFile.getDestFile(MASSSTAB));
		Xml.copyFile(iInfoFile.getSourceFile(KNOTEN), iInfoFile.getDestFile(KNOTEN));
	}
	
	protected void saveObjects(Projection iProjection, String iCategory) throws Exception 
	{
		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lPlanParent = (Element) lPath.evaluate("//g[@id='"+iCategory+"' and @class='category']", mDocument, XPathConstants.NODE); 
		Element lDefsParent = (Element) lPath.evaluate("//defs[@id='DEFS']", mDocument, XPathConstants.NODE); 
		
		StringWriter lBuffer = new StringWriter();
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(iCategory)));
		String lLine = lReader.readLine();
		lBuffer.write(lLine+"\n");
		while ((lLine = lReader.readLine()) != null) 
		{
			String[] lColumn = lLine.split(",",-1);
			Element lObject = (Element) lPath.evaluate("//g[@id='"+lColumn[0]+"' and contains(concat(' ', @class, ' '), 'object')]", lPlanParent, XPathConstants.NODE);
			
			Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+lColumn[0]+"']", lDefsParent, XPathConstants.NODE);
			exportSymbol(lObject, lMeta, iProjection, lColumn);
			
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
		FileWriter lWriter = new FileWriter(mInfoFile.getSourceFile(iCategory));
		lWriter.write(lBuffer.toString());
		lWriter.close();
	}
	
	protected void saveMeta(Projection iProjection, String iObject) throws Exception 
	{
		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lObject = (Element) lPath.evaluate("//g[@id='"+iObject+"' and contains(concat(' ', @class, ' '), 'object')]", mDocument, XPathConstants.NODE);
		Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+iObject+"']", mDocument, XPathConstants.NODE);
		
		StringWriter lBuffer = new StringWriter();
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(iObject)));
		String lLine = lReader.readLine();
		lBuffer.write(lLine+"\n");
		lLine = lReader.readLine(); 
		String[] lColumn = lLine.split(",",-1);
		
		exportSymbol(lObject, lMeta, iProjection, lColumn);
		
		// write values
		lBuffer.write(lColumn[0]);
		for (int i=1; i<lColumn.length; i++)
		{
			lBuffer.write(",");
			lBuffer.write(lColumn[i]);
		}
		lBuffer.write('\n');
		lBuffer.close();
		lReader.close();
	
		// override input file
		FileWriter lWriter = new FileWriter(mInfoFile.getSourceFile(iObject));
		lWriter.write(lBuffer.toString());
		lWriter.close();
	}
	
	
	protected void saveKnotenmitte(Projection iProjection) throws Exception 
	{
		XPath lPath = XPathFactory.newInstance().newXPath();  
		Element lObject = (Element) lPath.evaluate("//g[@id='"+KNOTENMITTE+"' and contains(concat(' ', @class, ' '), 'object')]", mDocument, XPathConstants.NODE);
		Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+KNOTENMITTE+"']", mDocument, XPathConstants.NODE);
		
		StringWriter lBuffer = new StringWriter();
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(KNOTEN)));
		String lLine = lReader.readLine();
		lBuffer.write(lLine+"\n");
		lLine = lReader.readLine(); 
		String[] lColumn = lLine.split(",",-1);
		
		exportSymbol(lObject, lMeta, iProjection, lColumn);
		
		// update SRS
		lColumn[lColumn.length-1] = mInfoFile.getSRS();
		
		// write values
		lBuffer.write(lColumn[0]);
		for (int i=1; i<lColumn.length; i++)
		{
			lBuffer.write(",");
			lBuffer.write(lColumn[i]);
		}
		lBuffer.write('\n');
		lBuffer.close();
		lReader.close();
	
		// override input file
		FileWriter lWriter = new FileWriter(mInfoFile.getSourceFile(KNOTEN));
		lWriter.write(lBuffer.toString());
		lWriter.close();
	}
	
	
	protected void exportSymbol(Element iSvgObject, Element iMeta, Projection iProjection, String[] iColumn)
	{
		// position
		String lTransform = iSvgObject.getAttribute("transform");
		lTransform = lTransform.substring(7,lTransform.length()-1);
		String[] lMatrix = lTransform.split(" ");
//		iColumn[1] = String.format("%.1f", iProjection.viewboxToChX(Double.parseDouble(lMatrix[4])));
//		iColumn[2] = String.format("%.1f", iProjection.viewboxToChY(Double.parseDouble(lMatrix[5])));

		String lClass = iSvgObject.getAttribute("class");
		if (!lClass.contains("unpositioned"))
		{
			iColumn[1] = sNumberFormat.format(iProjection.viewboxToChX(Double.parseDouble(lMatrix[4])));
			iColumn[2] = sNumberFormat.format(iProjection.viewboxToChY(Double.parseDouble(lMatrix[5])));
		}
		else
		{
			iColumn[1] = "";
			iColumn[2] = "";
		}
		iColumn[4] = String.format("%d", ((int)(Math.atan2(Double.parseDouble(lMatrix[2]), Double.parseDouble(lMatrix[0]))*180.0/Math.PI)+360)%360); 
		iColumn[3] = iMeta.getAttribute("symbolid"); 
	}
	
	
		
	//
	// Remote Methods called by browser
	//
	
    @RemoteMethod
    public String changeSymbol(ServerCall iCall, String iObjectId, String iSymbolId)
    {
    	SymbolStatic lSymbol = SymbolStatic.get(iSymbolId);
    	try
		{
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lElement = (Element) lPath.evaluate(".//g[@id='"+iObjectId+"']", mElement, XPathConstants.NODE); 
        	if (lElement != null)
        	{
           		Element lOldText = (Element) lPath.evaluate(".//text[@id='textfeld']", lElement, XPathConstants.NODE);
           		if (lOldText != null)
           		{
    				Xml.setTextFeld(lSymbol.mDocument.getDocumentElement(), lOldText.getTextContent());
           		}
        		
        		lElement.removeChild((Element)lElement.getElementsByTagName("g").item(0));
        		lSymbol.insert(mDocument, lElement);
        		
        		// update meta data
        		Element lMeta = (Element) lPath.evaluate("//*[local-name()='object'][@id='"+iObjectId+"']", mDocument, XPathConstants.NODE);
        		lMeta.setAttribute("symbolid", iSymbolId);
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
    	
    	JsonObject lObject = lSymbol.getJson();
    	return lObject.toString();
    }

    @RemoteMethod
    public String getSymbolSelection(ServerCall iCall, String iObjectId, String iCategory, String iSymbolId)
    {
//    	Log.out.info(iSymbolKey);
     	try
		{
    		XPath lPath = XPathFactory.newInstance().newXPath();
        	StringBuffer lBuffer = new StringBuffer();
        	int lCount = 0;
        	
        	lBuffer.append("<tr>\n");
        	for (SymbolStatic lSymbol : SymbolStatic.getList(iCategory, mObjectMap.get(iObjectId)))
        	{
            	lBuffer.append("<td class='geopos-symbol"+ (iSymbolId.equals(lSymbol.mId) ? " active" : " inactive") + "'>\n");
            	
    			Element lSvg = (Element) lPath.evaluate("//svg", lSymbol.mDocument, XPathConstants.NODE);
    			lSvg.setAttribute("width", "66");
    			lSvg.setAttribute("height", "66");

    			Xml.setTextFeld(lSvg, "??");
    			
    			StringWriter lWriter = new StringWriter();
            	Xml.write(lSvg, lWriter);
            	lBuffer.append(lWriter);
        	
            	lSvg.removeAttribute("width");
            	lSvg.removeAttribute("height");
            	
            	lBuffer.append("</td>\n");
        		if (++lCount % 2 == 0)
        		{
                	lBuffer.append("</tr>\n");
        	    	lBuffer.append("<tr>\n");
        		}
        	}
        	lBuffer.append("</tr>\n");
        	//Log.out.info(lBuffer.toString());
        	return lBuffer.toString();

		}
		catch (Exception e)
		{
			Log.out.error("getting selection for symbol " + iCategory + ":" + iObjectId, e);
		}
    	return "";
    }
    
    @RemoteMethod
    public String getAttribute(ServerCall iCall, String iCategory, String iId)
    {
    	JsonObject lResult = null;
		
    	String[] lObject = mObjectMap.get(iId);
    	if (lObject != null)
    	{
    		if (iCategory.equals(AMPEL))
    		{
            	lResult  = mAttributes.getAmpelInfo(lObject[5]+lObject[6]);
    			
    		}
    		else if (iCategory.equals(SPUR))
    		{
            	lResult  = mAttributes.getSpurenInfo(lObject[5]);
    			
    		}
    		else if (iCategory.equals(DETEKTOR))
    		{
            	lResult  = mAttributes.getDetektorInfo(lObject[5]);
    			
    		}
    		else if (iCategory.equals(VVA))
    		{
            	lResult  = mAttributes.getVVAInfo(lObject[5]);
    			
    		}
    	}
    	
    	if (lResult == null)
    	{
    		lResult = new JsonObject();    		
    	}
        return lResult.toString();
    }
 }
