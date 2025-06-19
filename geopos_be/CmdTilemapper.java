package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Map;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.config.UrlConfig;
import ch.bergauer.am.vs.config.UrlConfigEntry;
import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.util.Log;
import ch.bergauer.am.vs.util.Utils;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.sun.net.httpserver.HttpExchange;

public class CmdTilemapper 
{
	public static final String REMOTE_ID = "geopos-tilemapper";
	public static final String DYNAMIC = "dynamic";
	public static final String STATIC = "static";

	public String handleHttpRequest(HttpExchange iExchange, Map<String,String> iParameters)
	{
		String lUploadDir = VisualServer.WEBROOT+"pages/geopos/tiledata/upload/";
		String lKnoten = iParameters.get("knoten");
		String lType = iParameters.get("type");
		
		File lFile = new File(lUploadDir);
		if (!lFile.exists())
		{
			lFile.mkdir();
			try
			{
				Process lProcess = Runtime.getRuntime().exec("chmod 777 " + lFile.getAbsolutePath());
				Utils.closeQuietly(lProcess.getErrorStream());
				Utils.closeQuietly(lProcess.getInputStream());
				Utils.closeQuietly(lProcess.getOutputStream());
			}
			catch (Exception e)
			{
				Log.out.error("Unable to create directory " + lFile.getAbsolutePath(), e);
			}
		}
	
	    InputStream lInput = iExchange.getRequestBody();
	    try 
	    {
	    	FileOutputStream lOutput = new FileOutputStream(lUploadDir+"/"+lType+lKnoten+".pdf");
	    	Log.out.info("Uploading file : " + iParameters.get("filename") + " to " + lUploadDir+"/"+lType+lKnoten+".pdf");
	    	
	        byte buf[] = new byte[4096];
	        for (int n = lInput.read(buf); n > 0; n = lInput.read(buf)) 
	        {
	        	lOutput.write(buf, 0, n);
	        }
	    	lOutput.close();
	    	lInput.close();
	    }
	    catch (Exception e)
	    {
	    	Log.out.error("Error uploading pdf file" + iParameters.get("filename"), e);
	        try 
	        {
	        	lInput.close();
	        }
	        catch (Exception e1)
	        {
	        }
		    return "Failed"; 
	    }
	
	    return "Ok"; 
	}
	
    // 
    // Tilemapper 
    // 
	
    protected void runMapper(ServerCall iCall, File iFile, String iKnoten, String iType, String iSRS, String iTilePath, Integer iZoomMin, Integer iZoomMax, String iComments, Long iArchiveId)
    {
		UrlConfigEntry lEntry = UrlConfig.getEntry("geopos");
    	String lDest = iType+"/"+iKnoten+"."+iArchiveId; 
		try
		{
			// Invoke maptiler 
			String lCommand = (String)lEntry.getAttribute("maptilerCmd");
			lCommand = lCommand.replaceAll("%DEST%", lDest);
			lCommand = lCommand.replaceAll("%SRCE%", iType+iKnoten+".pdf");
			lCommand = lCommand.replaceAll("%ZOOMMIN%", iZoomMin.toString());
			lCommand = lCommand.replaceAll("%ZOOMMAX%", iZoomMax.toString());
			
			if (iSRS.equals("LV03"))
			{
				lCommand = lCommand.replaceAll("%SRS%", "EPSG:21781");  
			}
			else if (iSRS.equals("LV95"))
			{
				lCommand = lCommand.replaceAll("%SRS%", "EPSG:2056"); 
			}
			
			Log.out.debug("running maptiler command : " + lCommand);
			
			Process lProcess = Runtime.getRuntime().exec(lCommand);
			
			BufferedReader lReader = new BufferedReader (new InputStreamReader(lProcess.getInputStream()));
			String lLine = lReader.readLine();
			while (lLine != null && ! lLine.trim().equals("--EOF--")) 	
			{
			    iCall.reply(lLine);
				Thread.sleep(500);
				lLine = lReader.readLine();
			}					
			
			Utils.closeQuietly(lProcess.getErrorStream());
			Utils.closeQuietly(lProcess.getInputStream());
			Utils.closeQuietly(lProcess.getOutputStream());
			
			Log.out.debug("completed maptiler command : " + lCommand);
		    iCall.reply("creating config.json");
			Thread.sleep(1000);

			StringBuffer lBuffer = new StringBuffer();
			lReader = new BufferedReader(new FileReader(iTilePath + "/"+lDest+"/openlayers.html"));
			while ((lLine = lReader.readLine()) != null) 
			{
				lBuffer.append(lLine);
			}
			
			//
			// Parse openlayers.html to create config.json 
			//
			String lPointer = lBuffer.substring(lBuffer.indexOf("mapMinZoom = "));
			String lMinZoom = lPointer.substring("mapMinZoom = ".length(), lPointer.indexOf(';'));
			
			lPointer = lPointer.substring(lPointer.indexOf("mapMaxZoom = "));
			String lMaxZoom = lPointer.substring("mapMaxZoom = ".length(), lPointer.indexOf(';'));

			lPointer = lPointer.substring(lPointer.indexOf("mapMaxResolution = "));
			String lResolution = lPointer.substring("mapMaxResolution = ".length(), lPointer.indexOf(';'));
			
			lPointer = lPointer.substring(lPointer.indexOf("tileExtent = "));
			String[] lBounds = lPointer.substring("tileExtent = [".length(), lPointer.indexOf(']')).split(",");
			
 			lPointer = lPointer.substring(lPointer.indexOf("projection: '"));
 			lPointer = lPointer.substring("projection: '".length());
 			String lSRS = lPointer.substring(0, lPointer.indexOf("'"));
			
			JsonObject lObject = new JsonObject();
			lObject.addProperty("resolution", Double.parseDouble(lResolution));
			lObject.addProperty("maxzoom", Integer.parseInt(lMaxZoom));
			lObject.addProperty("minzoom", Integer.parseInt(lMinZoom));
			lObject.addProperty("comments", iComments);
			if (lSRS.equals("EPSG:21781"))
			{
				lObject.addProperty("srs", "LV03");
			} 
			else if (lSRS.equals("EPSG:2056"))
			{
				lObject.addProperty("srs", "LV95");
			}
			JsonArray lArray = new JsonArray();
			for (int i=0; i<lBounds.length; i++)
			{
				lArray.add(new JsonPrimitive(Double.parseDouble(lBounds[i])));
			}
			lObject.add("bounds", lArray);			
			
			FileWriter lConfig = new FileWriter(iTilePath + "/"+lDest+"/config.json");
			lConfig.write(lObject.toString());
			lConfig.close();
		}
		catch (Exception e)
		{
			Log.out.error("invoking maptiler ", e);
			iCall.reply("Tilemapper fehler aufgetreten");
		}
    }
    
    @RemoteMethod
    public void createTiles(ServerCall iCall, String iKnoten, String iSrs, String iZoomMin, String iZoomMax, String iComments)
    {
		String lUploadDir = VisualServer.WEBROOT+"pages/geopos/tiledata/upload/";

		Long lArchiveId = System.currentTimeMillis();
		File lFile = new File(lUploadDir+"/"+DYNAMIC+iKnoten+".pdf");
		if (lFile.exists())
		{
			runMapper(iCall, lFile, iKnoten, DYNAMIC, iSrs, VisualServer.WEBROOT+"pages/geopos/tiledata/nodes/", Integer.parseInt(iZoomMin), Integer.parseInt(iZoomMax), iComments, lArchiveId);
			lFile.delete();
		}
		
		lFile = new File(lUploadDir+"/"+STATIC+iKnoten+".pdf");
		if (lFile.exists())
		{
			runMapper(iCall, lFile, iKnoten, STATIC, iSrs, VisualServer.WEBROOT+"pages/geopos/tiledata/nodes/", Integer.parseInt(iZoomMin), Integer.parseInt(iZoomMax), iComments, lArchiveId);
			lFile.delete();
		}

		// give some time for messages to display in the browser window
		try
		{
			Thread.sleep(4000);
		}
		catch (Exception e1)
		{
		}
		
		iCall.reply("done");
    }

    @RemoteMethod
    public void abortTiles(ServerCall iCall, String iKnoten)
    {
		String lUploadDir = VisualServer.WEBROOT+"pages/geopos/tiledata/upload/";
		
		File lFile = new File(lUploadDir+"/"+iKnoten+DYNAMIC+".pdf");
		if (lFile.exists())
		{
			lFile.delete();
		}
		
		lFile = new File(lUploadDir+"/"+iKnoten+STATIC+".pdf");
		if (lFile.exists())
		{
			lFile.delete();
		}
    }
    

    @RemoteMethod
    public void deleteTiles(ServerCall iCall, String iKnoten, String iTimestamp)
    {
    	String lName = iKnoten +"."+iTimestamp;
		deleteDirectory(new File(VisualServer.WEBROOT+"pages/geopos/tiledata/nodes/static/"+lName));
		deleteDirectory(new File(VisualServer.WEBROOT+"pages/geopos/tiledata/nodes/dynamic/"+lName));
    }
    
    private void deleteDirectory(File iDirectory) 
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

}
