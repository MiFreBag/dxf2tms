 package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Hashtable;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.data.DatapointAdapter;
import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.session.BrowserSession;
import ch.bergauer.am.vs.util.Log;

import com.swisstopo.geodesy.reframe_lib.IReframe.AltimetricFrame;
import com.swisstopo.geodesy.reframe_lib.IReframe.PlanimetricFrame;
import com.swisstopo.geodesy.reframe_lib.Reframe;

// 28657

public class Session extends DatapointAdapter
{
    protected InfoFile mInfoFile;
    protected Knoten mPlan;
    protected String mNodePath;

    protected Hashtable<String, Object> mRemoteObjects = new Hashtable<String, Object>();

 	public Session(BrowserSession iSession, VisualServer iServer, InfoFile iInfoFile)
	{
 	//	SymbolStatic.init();
 		mInfoFile = iInfoFile;
 		
		mPlan = new Knoten(mInfoFile, mRemoteObjects, iServer);
 		
 		mRemoteObjects.put(Knoten.REMOTE_ID, mPlan);
 		mRemoteObjects.put(CmdTilemapper.REMOTE_ID, new CmdTilemapper());
    }

 	public void closeSession()
 	{
 		if (mInfoFile.mMode == InfoFile.ANZEIGEN)
 		{
 			deleteDirectory(mInfoFile.getRootDir());
 		}
  	}
 	
 	private void deleteDirectory(File iDirectory) 
 	{
	    if(iDirectory.exists())
	    {
	        File[] lFiles = iDirectory.listFiles();
	        if(lFiles!=null)
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
 	
 	public Object getRemoteObject(String iName)
 	{
 		return mRemoteObjects.get(iName);
 	}
 	
  	public String configure(String iIndexPage)
 	{
  		return mPlan.configure(iIndexPage);
 	}
   
    //
    // Remove Methods
    //
    
    // update object positions and symbols
    @RemoteMethod
    public void refreshStatic(ServerCall iCall)
    {
    	// Reloads all of the symbols, this is used in case the geopos.css or symbollibrary has changed. 
    	try
    	{
    		mPlan.saveInVamToGpos();
    		
    		mPlan.refreshStatic();
    	}
    	catch (Exception e)
    	{
     		Log.out.error("error refreshing Knoten " + mInfoFile, e);
   			StringWriter lWriter = new StringWriter();
	        e.printStackTrace(new PrintWriter(lWriter));
	        iCall.reply(lWriter.toString());
    	}
    }

    // update object positions and symbols
    @RemoteMethod
    public void refreshDynamic(ServerCall iCall)
    {
    	// Reloads all of the symbols, this is used in case the geopos.css or symbollibrary has changed. 
    	try
    	{
    		mPlan.saveInVamToGpos();
    		
    		mPlan.refreshDynamic();
    	}
    	catch (Exception e)
    	{
     		Log.out.error("error refreshing Knoten " + mInfoFile, e);
   			StringWriter lWriter = new StringWriter();
	        e.printStackTrace(new PrintWriter(lWriter));
	        iCall.reply(lWriter.toString());
    	}
    }
    
    
    // save only kontenpaln.svg ... this is called just before printing
    @RemoteMethod
    public void save(ServerCall iCall)
    {
    	try
    	{
    		mPlan.saveInVamToGpos();
    		iCall.reply(null);
    	}
    	catch (Exception e)
    	{
     		//Log.out.error("saving Knoten " + mInfoFile, e);
   			StringWriter lWriter = new StringWriter();
	        e.printStackTrace(new PrintWriter(lWriter));
	        iCall.reply(lWriter.toString());
    	}
    }
     
    // saves everyting in gpostovam
    @RemoteMethod
    public void export(ServerCall iCall)
    {
    	String lResult = "0";
    	
    	try
    	{
    		Knoten.copyToGposToVam(mInfoFile);
	        iCall.reply(null);
			mInfoFile.writeStatOk();
    	}
    	catch (Exception e)
    	{
	        iCall.reply(lResult);
			mInfoFile.writeStatError("Speicherfehler", e);
    	}
    }
    

    protected void convertFile(Reframe iReframe, String iId) throws Exception
    {
    	StringWriter lBuffer = new StringWriter();

    	// read file
		BufferedReader lReader = new BufferedReader(new FileReader(mInfoFile.getSourceFile(iId)));
		String lLine = lReader.readLine();
		lBuffer.write(lLine);
		lBuffer.write('\n');
		
		Log.out.info("Converting " + iId);
		while ((lLine = lReader.readLine()) != null) 
		{
			String[] lColumn = lLine.split(",",-1);
			if (!lColumn[1].isEmpty() && !lColumn[2].isEmpty())
			{
				double[] lInput = new double[] { Float.parseFloat(lColumn[1]), Float.parseFloat(lColumn[2])  };
				double[] lOutput = iReframe.ComputeReframe(lInput, PlanimetricFrame.LV03_Military, PlanimetricFrame.LV95, AltimetricFrame.Ellipsoid, AltimetricFrame.Ellipsoid);
				lColumn[1] = String.format("%.2f", lOutput[0]);
				lColumn[2] = String.format("%.2f", lOutput[1]);
			}
			
			// write values
			lBuffer.write(lColumn[0]);
			for (int i=1; i<lColumn.length; i++)
			{
				lBuffer.write(",");
				lBuffer.write(lColumn[i]);
			}
			lBuffer.write('\n');
		}
		
		lReader.close();
		
		// write file
		FileWriter lWriter = new FileWriter(mInfoFile.getSourceFile(iId));
		lWriter.write(lBuffer.toString());
		lWriter.close();
    }
        
    
    
    @RemoteMethod
    public void toLV95(ServerCall iCall) throws Exception
    {
    	// delete images
		File lPng = mInfoFile.getSourceFile("lageplan_static.png");
		if (lPng.exists())
		{
			lPng.delete();
		}
		lPng = mInfoFile.getSourceFile("lageplan_dynamic.png");
		if (lPng.exists())
		{
			lPng.delete();
		}

		lPng = mInfoFile.getSourceFile("lageplan.png");
		if (lPng.exists())
		{
			lPng.delete();
		}

		// convert plan using SwissTopo jar
		Reframe lReframe = new Reframe();

		mPlan.toLV95(lReframe);
		mInfoFile.setSRS(InfoFile.LV95);
  		mPlan.saveInVamToGpos();
    }


    @RemoteMethod
    public void close(ServerCall iCall)
    {
    }
       
}
