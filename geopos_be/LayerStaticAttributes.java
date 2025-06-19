package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.HashMap;

import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonObject;


public class LayerStaticAttributes 
{
	public static final HashMap<String,String> ELEMENTMODE = new HashMap<String,String>();
	public static final HashMap<String,String> PHASE = new HashMap<String,String>();
	
	static
	{
		ELEMENTMODE.put("B", "betrieb");
		ELEMENTMODE.put("P", "projekt");
		ELEMENTMODE.put("V", "vorprojekt");
		ELEMENTMODE.put("S", "studie");
		ELEMENTMODE.put("B1", "bauphase");
		ELEMENTMODE.put("B2", "bauphase");
		ELEMENTMODE.put("B3", "bauphase");
		ELEMENTMODE.put("B4", "bauphase");
		ELEMENTMODE.put("B5", "bauphase");
		ELEMENTMODE.put("B6", "bauphase");
		ELEMENTMODE.put("B7", "bauphase");
		ELEMENTMODE.put("B8", "bauphase");
		ELEMENTMODE.put("B9", "bauphase");
		
		PHASE.put("B", "1");
		PHASE.put("P", "1");
		PHASE.put("V", "1");
		PHASE.put("S", "1");
		PHASE.put("B1", "1");
		PHASE.put("B2", "2");
		PHASE.put("B3", "3");
		PHASE.put("B4", "4");
		PHASE.put("B5", "5");
		PHASE.put("B6", "6");
		PHASE.put("B7", "7");
		PHASE.put("B8", "8");
		PHASE.put("B9", "9");
	};

	private HashMap<String, JsonObject> mAmpelData = new HashMap<String, JsonObject>();
	private HashMap<String, JsonObject> mSpurData = new HashMap<String, JsonObject>();
	private HashMap<String, JsonObject> mDetektorData = new HashMap<String, JsonObject>();
	private HashMap<String, JsonObject> mVVAData = new HashMap<String, JsonObject>();
	
	public LayerStaticAttributes(InfoFile iInfoFile)
	{
		String lPath = iInfoFile.getNodePath();

		try
		{
			String[] lQuery = lPath.split("/");
			String lKnoten = lQuery[lQuery.length-2];
			String lProject = lQuery[lQuery.length-3];
			
			if (lProject.startsWith("knoten"))
			{
				lProject = lProject.replace("knoten", "");
				if (lProject.length() == 0)
				{
					lProject = "B";
				}
			}
			//lKnoten = "k217.WM3E1SEV";
			
			lKnoten = lKnoten.substring(1); // remove "k"
			if (lKnoten.contains("."))
			{
				lKnoten = lKnoten.substring(0, lKnoten.indexOf('.'));
			}
			
			
			OracleDbMgr lDatabase = OracleDbMgr.getInstance(new OracleDbConf("dbviewonly"));
			
			// read SQL db for additional data
			Connection lConnection = lDatabase.getConnection();
			StringBuffer lSQL = new StringBuffer("empty");
	        try
	        {
	        	//
	        	// From SQL Database
	        	//
	        	
	        	// Ampel data
	        	lSQL = new StringBuffer("select KNOTENNR, ELEMENTMODE, PHASE, MASTNR, AMPELNR, SPURNR, AMPELFUNKTION, ZUSTAND from medmgr.ampel where KNOTENNR = "+lKnoten+" and ELEMENTMODE = '"+ELEMENTMODE.get(lProject)+"' and PHASE = "+PHASE.get(lProject)+" order by KNOTENNR, ELEMENTMODE, PHASE, MASTNR, AMPELNR");
	        //	System.out.println("AMPEL SQL = " + lSQL);
	            Statement lStatement = lConnection.createStatement();
	            lStatement.execute(lSQL.toString());
	            ResultSet lResultSet = lStatement.getResultSet();
	            while(lResultSet.next()) 
	            {
	            	mAmpelData.put(lResultSet.getString(4)+lResultSet.getString(5), createJson(lResultSet));
	            }
	            lResultSet.close();
	            lStatement.close();
	            
	        	// Spur data
	        	lSQL = new StringBuffer("select KNOTENNR, ELEMENTMODE, PHASE, SPURNR, SPURTYP, SPURTYPKONF, ZUSTAND from medmgr.spur where KNOTENNR = "+lKnoten+" and ELEMENTMODE = '"+ELEMENTMODE.get(lProject)+"' and PHASE = "+PHASE.get(lProject)+" order by KNOTENNR, ELEMENTMODE, PHASE, SPURNR");	            
	        	//System.out.println("SPUR SQL = " + lSQL);
	            
	            lStatement = lConnection.createStatement();
	            lStatement.execute(lSQL.toString());
	            lResultSet = lStatement.getResultSet();
	            while(lResultSet.next()) 
	            {
	            	mSpurData.put(lResultSet.getString(4), createJson(lResultSet));
	            }
	            lResultSet.close();
	            lStatement.close();
	            
	        	//
	        	// From Config files
	        	//
	            
	            // get Detektor Data from file
	            File lFile = iInfoFile.getSourceFile(LayerStatic.DETEKTOR); 
    			BufferedReader lReader = new BufferedReader(new FileReader(lFile));
    			String lLine = lReader.readLine();
				String[] lTitle = lLine.split(",",-1);
    			while ((lLine = lReader.readLine()) != null) 
    			{
    				String[] lColumn = lLine.split(",",-1);
    				JsonObject lObject = new JsonObject();
     		    	for (int i=0; i<lColumn.length; i++)
    		    	{
    		    		lObject.addProperty(lTitle[i], lColumn[i]);
    		    	}
     		    	mDetektorData.put(lColumn[5], lObject);
    			}
    			
    			// get VVA Data from file
	            lFile = iInfoFile.getSourceFile(LayerStatic.VVA); 
    			lReader = new BufferedReader(new FileReader(lFile));
    			lLine = lReader.readLine();
				lTitle = lLine.split(",",-1);
    			while ((lLine = lReader.readLine()) != null) 
    			{
    				String[] lColumn = lLine.split(",",-1);
    				JsonObject lObject = new JsonObject();
     		    	for (int i=0; i<lColumn.length; i++)
    		    	{
    		    		lObject.addProperty(lTitle[i], lColumn[i]);
    		    	}
     		    	mVVAData.put(lColumn[5], lObject);
    			}
    			
	            lFile = iInfoFile.getSourceFile(LayerStatic.AMPEL); 
    			lReader = new BufferedReader(new FileReader(lFile));
    			lLine = lReader.readLine();
				lTitle = lLine.split(",",-1);
    			while ((lLine = lReader.readLine()) != null) 
    			{
    				String[] lColumn = lLine.split(",",-1);
    				JsonObject lObject = mAmpelData.get(lColumn[5]+lColumn[6]);
    				if (lObject != null)
    				{
         		    	for (int i=0; i<lColumn.length; i++)
        		    	{
        		    		lObject.addProperty(lTitle[i], lColumn[i]);
        		    	}
    				}
    			}
	        	
	            lFile = iInfoFile.getSourceFile(LayerStatic.SPUR); 
    			lReader = new BufferedReader(new FileReader(lFile));
    			lLine = lReader.readLine();
				lTitle = lLine.split(",",-1);
    			while ((lLine = lReader.readLine()) != null) 
    			{
    				String[] lColumn = lLine.split(",",-1);
    				JsonObject lObject = mSpurData.get(lColumn[5]);
    				if (lObject != null)
    				{
         		    	for (int i=0; i<lColumn.length; i++)
        		    	{
        		    		lObject.addProperty(lTitle[i], lColumn[i]);
        		    	}
    				}
    			}
	            
	        }
	        catch (Exception e)
	        {
	            Log.out.error(lSQL.toString(), e);
	        }
	        lDatabase.releaseConnection(lConnection);
   
        }
        catch (Exception e)
        {
            Log.out.error("Error creating attributes for Knoten " + iInfoFile.toString(), e);
        }
	}
	
	private JsonObject createJson(ResultSet iResultSet) throws Exception
	{
		JsonObject lObject = new JsonObject();
        ResultSetMetaData lResultMeta = iResultSet.getMetaData();
    	for (int i=1; i<=lResultMeta.getColumnCount(); i++)
    	{
    		lObject.addProperty(lResultMeta.getColumnName(i), iResultSet.getString(i));
    	}
		return lObject;
	}
	
	public JsonObject getAmpelInfo(String iNr)
	{
		return mAmpelData.get(iNr);
	}
	
	public JsonObject getSpurenInfo(String iNr)
	{
		return mSpurData.get(iNr);
	}
	
	public JsonObject getDetektorInfo(String iNr)
	{
		return mDetektorData.get(iNr);
	}
	
	public JsonObject getVVAInfo(String iNr)
	{
		return mVVAData.get(iNr);
	}
	
	
	
}
