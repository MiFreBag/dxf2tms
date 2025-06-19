package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.util.Log;

public class InfoFile 
{
	public static final String PFAD = "PFAD";
	public static final String KNOTENART = "KNOTENART";
	public static final String KNOTENNR = "KNOTENNR";
	public static final String KNOTENBEZ = "KNOTENBEZ";
	public static final String MODESTATUS = "MODESTATUS";
	public static final String KNVERS = "KNVERS";
	public static final String MITARBEITER = "MITARBEITER";
	public static final String BEARBEITUNGSDATUM = "BEARBEITUNGSDATUM";
	
	public static final String KNMAPDATUM = "KNMAPDATUM";
	public static final String PLAN = "PLAN";
	public static final String MODE = "MODE";
	public static final String ZEITPUNKT = "ZEITPUNKT";
	public static final String ID = "ID";
	public static final String WASSERZEICHEN = "WASSERZEICHEN";
	public static final String ABLAGE = "ABLAGE";
	public static final String LOGNAME = "logname";
	
	

	public static final String LV95 = "LV95";
	public static final String LV03 = "LV03";
	
	protected HashMap<String,String> mInfo = new HashMap<String,String>();
	
	protected String mVamDir;
	protected String mNodePath;
	protected File mInfoFile;
	protected String mSRS = LV03;

	protected String mProject;
	
	//
	// display mode
	//
	public static final int KNOTENMAPPE = 1;
	public static final int ANZEIGEN = 2;
	public static final int BEARBEITEN = 3;
	public static final int DRUCKEN = 4;
	
	protected int mMode;
	
	protected Date mTimestamp = new Date();
	
 	public InfoFile(String iNodePath)
	{
		mVamDir = VisualServer.WEBROOT + "pages/geopos/vamTransferFiles/";
		
		mNodePath = iNodePath;
		
		try
		{
			mInfoFile = new File(mVamDir + mNodePath+"/vamtogpos/INFO");
			
			BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile));
			String[] lHeader = lReader.readLine().split(",",-1);
			String[] lValue = lReader.readLine().split(",",-1);
			lReader.close();
			
			for (int i=0; i<lHeader.length; i++)
			{
				mInfo.put(lHeader[i], lValue[i]);
			}
			
			// 
			// get KNOTENBEZ from database
			//
			OracleDbMgr lDatabase = OracleDbMgr.getInstance(new OracleDbConf("dbviewonly"));
			Connection lConnection = lDatabase.getConnection();
	        try
	        {
				String[] lQuery = iNodePath.split("/");
				String lKnoten = lQuery[lQuery.length-2];
				mProject = lQuery[lQuery.length-3];
				
				if (mProject.startsWith("knoten"))
				{
					mProject = mProject.replace("knoten", "");
					if (mProject.length() == 0)
					{
						mProject = "B";
					}
				}
				
				if (mProject.equals("H"))
				{
		        	mInfo.put(KNOTENBEZ, "History");
					
				}
				else
				{
					lKnoten = lKnoten.substring(1); // remove "k"
		        	
		        	StringBuffer lSQL = new StringBuffer("select KNOTENBEZ from medmgr.knoten where KNOTENNR = "+mInfo.get(KNOTENNR)+" and ELEMENTMODE = '"+LayerStaticAttributes.ELEMENTMODE.get(mProject)+"' and PHASE = "+LayerStaticAttributes.PHASE.get(mProject));
		            Statement lStatement = lConnection.createStatement();
		            lStatement.execute(lSQL.toString());
		            ResultSet lResultSet = lStatement.getResultSet();
		            if (lResultSet.next()) 
		            {
		            	mInfo.put(KNOTENBEZ, lResultSet.getString(1));
		            }
		            else
		            {
			        	mInfo.put(KNOTENBEZ, "Bezeichnung nicht gefunden !");
		            }
				}
	        }
	        catch (Exception e)
	        {
	        	Log.out.error("Ocacle db access", e);
	        	mInfo.put(KNOTENBEZ, "Datenbankfehler aufgetreten !");
	        }
			
	        // escape "
	        mInfo.put(KNOTENBEZ, mInfo.get(KNOTENBEZ).replaceAll("\"", "\\\\u0022"));
	        
	        //
	        // Get SRS for KONTEN file
	        //
			StringWriter lBuffer = new StringWriter();
			lReader = new BufferedReader(new FileReader(getSourceFile("KNOTEN")));
			String lLine = lReader.readLine();
			lBuffer.write(lLine+"\n");
			lLine = lReader.readLine(); 
			lReader.close();
			String[] lColumn = lLine.split(",",-1);
			if (lColumn.length > 6)
			{
				mSRS = lColumn[lColumn.length-1];
			}
			else
			{
				mSRS = LV03;
			}
				
			String lMode = getAttribute("MODE");
			if (lMode.equals("Bearbeiten"))
			{
				mMode = BEARBEITEN;
			}
			else if (lMode.equals("Anzeigen"))
			{
				mMode = ANZEIGEN;
			}
			else if (lMode.equals("Knotenmappe"))
			{
				mMode = KNOTENMAPPE;
			}
			else if (lMode.equals("Drucken"))
			{
				mMode = DRUCKEN;
			}
		}
		catch (Exception e)
		{
			Log.out.error("Error reading INFO file  " + mInfoFile.getAbsolutePath());
		}
	}
	
	public File getRootDir()
	{
		String lPath = mVamDir + mNodePath;
		lPath = lPath.substring(0, lPath.lastIndexOf('/'));
		return new File(lPath);
	}
	
	
	public String getAttribute(String iIndex)
	{
		return mInfo.get(iIndex);
	}

	public String setAttribute(String iIndex, String iValue)  // JSTIER this is only used once 
	{
		return mInfo.put(iIndex,iValue);
	}
	
	public String getNodePath()
	{
		return mNodePath;
	}	
	
	public Date getEditTime()
	{
		return Calendar.getInstance().getTime();
	}	

	public String getProject()
	{
		return mProject;
	}	


	public String getSRS()
	{
		return mSRS;
	}	
	public void setSRS(String iSrs)
	{
		mSRS = iSrs;
	}	

	
	@Override
	public String toString()
	{
		return getAttribute(KNOTENNR) + ":" + getAttribute(KNVERS) + "-" + getAttribute(KNOTENBEZ);
	}

	
	//
	// Write stat.txt that synchronizes with vam
	//
	public void writeStatOk()
	{
		try
		{
			BufferedWriter lWriter = new BufferedWriter(new FileWriter(getDestFile("stat.txt")));
			lWriter.write("0");
			lWriter.close();
		}
		catch (Exception e)
		{
			Log.out.error("Cannot write " + getDestFile("stat.txt"));
		}
	}
	
	public void writeStatError(String iMessage, Exception iError)
	{
 		Log.out.error("saving Knoten " + this.toString(), iError);
 
		try
		{
			BufferedWriter lWriter = new BufferedWriter(new FileWriter(getDestFile("stat.txt")));
			lWriter.write("-1 "+iMessage);
			
   			StringWriter lExceptionWriter = new StringWriter();
   			iError.printStackTrace(new PrintWriter(lExceptionWriter));
			lWriter.write(lExceptionWriter.toString());
			
			lWriter.close();
		}
		catch (Exception e)
		{
			Log.out.error("Cannot write " + getDestFile("stat.txt"));
		}
	}

	public void writeStatError(String iMessage)
	{
 		Log.out.error(iMessage);
 
		try
		{
			BufferedWriter lWriter = new BufferedWriter(new FileWriter(getDestFile("stat.txt")));
			lWriter.write("-1 "+iMessage);
			lWriter.close();
		}
		catch (Exception e)
		{
			Log.out.error("Cannot write " + getDestFile("stat.txt"));
		}
	}
	
	
	//
	// paths 
	//
	public File getSourceFile(String iName)
	{
		return new File(mVamDir + mNodePath + "/vamtogpos/" + iName);
	}
	
	public File getDestFile(String iName)
	{
		return new File(mVamDir + mNodePath + "/gpostovam/" + iName);
	}
	

	// use this information to determine if the plan has been saved at least once with the new geopos
	protected static DateFormat sDateFormat = new SimpleDateFormat("dd.MM.yyyy HH:mm:ss");
	protected static String DEPLOY_DATE = new String("07.05.2015 00:00:00");
	
	
	//
	// setup plankopf for display
	//
	
	public HashMap<String, String> getPlanInfo(String iPlan) throws Exception
	{
		// read PLAN file and initialize plan info
		BufferedReader lReader = new BufferedReader(new FileReader(getSourceFile(iPlan)));
		String lLine = lReader.readLine();
		String[] lKeys = lLine.split(",");
		lLine = lReader.readLine();
		String[] lValues = lLine.split(",",-1);
		lReader.close();
		
		HashMap<String, String> lPlanInfo = new HashMap<String, String>();
		for (int i=0; i<lKeys.length; i++)
		{
			lPlanInfo.put(lKeys[i], lValues[i]);
		}
		
		String lPlanText = iPlan.substring(0, 1)+iPlan.toLowerCase().substring(1);
		if("VVAPLAN".equalsIgnoreCase(iPlan)){
			lPlanText = "VVaPlan";
		}
		lPlanInfo.put("PLAN", lPlanText);

		if (lPlanInfo.get("MASSSTAB").equals(""))
		{
			lPlanInfo.put("MASSSTAB",Projection.DEFAULT_MASSTAB);			
		}

		return lPlanInfo;
	}    
	
	public void setupPlankopf(Element iPlankopf, String iPlan, int iMode, HashMap<String, String> iInfo) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();  
		
		Element lText; 
		
		// plan
		lText = (Element) lPath.evaluate(".//text[@id='PLAN']", iPlankopf, XPathConstants.NODE); 
		lText.setTextContent(iInfo.get("PLAN") + " 1 : " + iInfo.get("MASSSTAB") + " / " + iInfo.get("FORMAT"));		

		// knoten
		lText = (Element) lPath.evaluate(".//text[@id='KNOTEN']", iPlankopf, XPathConstants.NODE); 
		String lString = "K"+getAttribute(KNOTENNR) + " " + getAttribute(KNOTENBEZ);
		if (lString.length() > 45) 
		{
			lString = lString.substring(0, 45) + " ...";
		}
		lText.setTextContent(lString);
		
		// Druckdatum
		lText = (Element) lPath.evaluate(".//text[@id='DRUCKDATUM']", iPlankopf, XPathConstants.NODE); 
		switch (iMode)
		{
		case ANZEIGEN:
		case BEARBEITEN:
			lText.setTextContent("Druckdatum: " + sDateFormat.format(mTimestamp) + " (" + this.getAttribute(LOGNAME) + ")");
			break;
			
		case KNOTENMAPPE:
			lText.setAttribute("style", "display:none");
			break;
			
		case DRUCKEN:
			lText.setTextContent("Druckdatum: " + this.getAttribute(ZEITPUNKT) + " (" + this.getAttribute(LOGNAME) + ")");
			break;
		}
		
		// Bearbeitung
		lText = (Element) lPath.evaluate(".//text[@id='BEARBEITUNG']", iPlankopf, XPathConstants.NODE); 
		switch (iMode)
		{
		case ANZEIGEN:
		case BEARBEITEN:
		case DRUCKEN:
			lText.setTextContent("Version: " + getAttribute(KNVERS) + " / " + iInfo.get(BEARBEITUNGSDATUM) + " (" + iInfo.get(MITARBEITER) + ")");
			break;
			
		case KNOTENMAPPE:
			lText.setAttribute("style", "display:none");
			break;
		}

		// Status
		lText = (Element) lPath.evaluate(".//text[@id='STATUS']", iPlankopf, XPathConstants.NODE); 
		switch (iMode)
		{
		case ANZEIGEN:
		case BEARBEITEN:
		case DRUCKEN:
			lText.setTextContent("Status: " + getAttribute(MODESTATUS));
			break;
			
		case KNOTENMAPPE:
			lText.setTextContent("Knotenmappe: " + getAttribute(KNVERS) + " - " +  getAttribute(KNMAPDATUM));
			break;
		}
	}

	//
	// Versioning
	//
	
	// initial version deployed on approximately November 25th 2015 
	public final static int VERSION_1 = 1;  

	// first mayor change deployed on approximately December 18th 2015
	// - changes include new file format with separate Zeichnungslayers for Lage, Ampel, Spuren and Detektor 
	// - new category for Knotenmitte
	public final static int VERSION_1_2 = 2; 
	
	// minor changes
	public final static int VERSION_1_3 = 3;    
	
	// final version 
	public final static int VERSION_1_4 = 4;    
	
	
	public final static int VERSION = VERSION_1_4; 
	
	public static int getVersion(Document iDocument) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();
		
		Element lRoot = (Element)lPath.evaluate("//svg", iDocument, XPathConstants.NODE);
		String lVersion = lRoot.getAttribute("data-version");
		if (lVersion.equals(""))
		{
			return VERSION_1;
		}
		else if (lVersion.equals("1.2"))
		{
			return VERSION_1_2;
		}
		else if (lVersion.equals("1.3"))
		{
			return VERSION_1_3;
		}
		else if (lVersion.equals("1.4"))
		{
			return VERSION_1_4;
		}
		else
		{
			Log.out.error("Invalid version number : " + lVersion);
		}
		
		return VERSION_1_4;
	}
}
