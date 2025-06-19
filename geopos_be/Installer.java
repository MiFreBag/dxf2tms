package ch.bergauer.am.vs.pages.geopos;

import java.io.File;
import java.io.FileWriter;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;

import ch.bergauer.am.vs.VisualServer;
import ch.bergauer.am.vs.VisualServerAdapter;
import ch.bergauer.am.vs.config.ClassData;
import ch.bergauer.am.vs.config.VsConfig;
import ch.bergauer.am.vs.pages.AjaxRequestHandlerIF;
import ch.bergauer.am.vs.pages.HtmlRequestHandlerIF;
import ch.bergauer.am.vs.pages.Installable;
import ch.bergauer.am.vs.session.BrowserSession;
import ch.bergauer.am.vs.user.UserSession;
import ch.bergauer.am.vs.util.Log;
import ch.bergauer.am.vs.util.Utils;

import com.sun.net.httpserver.HttpExchange;

public class Installer extends Installable
{
    protected HashMap<BrowserSession, Session> mSession = new HashMap<BrowserSession, Session>();
    protected String mIndexPage;
    protected String mPath;
    protected VisualServer mServer;
     
    public String install(final VisualServer iServer, String iPath)
    {      
		/*
        Reframe lReframe = new Reframe();
   	
		double[] lInput = new double[] { 683518.0, 246871.0   };
		//double[] lInput = new double[] { 601000.0, 197500.0   };
		double[] lOutput = lReframe.ComputeReframe(lInput, PlanimetricFrame.LV03_Military, PlanimetricFrame.LV95, AltimetricFrame.Ellipsoid, AltimetricFrame.Ellipsoid);

		System.out.println(lOutput[0] + ", " + lOutput[1]);

		//
		//http://geodesy.geo.admin.ch/reframe/lv03tolv95?easting=683518&northing=246871&format=json
		//{"easting": "2683518.8982585864", "northing": "1246870.8346011695"}
		//
		//http://geodesy.geo.admin.ch/reframe/lv03tolv95?easting=601000&northing=197500&format=json
		//{"easting": "2601000.029913621", "northing": "1197500.036557976"} 
		*/
		
		
        mIndexPage = Utils.readHtmlFile(iPath+"/index.html");
        mPath = iPath;
        mServer = iServer;
        
        SymbolStatic.init();
        SymbolDynamic.init();
        SymbolProject.init();
                 
        CmdPhantomjs.init();
        
        Knoten.init();

        try 
        {
    	    // handlers called vis browser
    	    iServer.setHtmlHandler(getContext()+"/index.html", new HtmlRequestHandlerIF() 
    	    {
            	@Override
    	        public Object handleHtmlRequest(BrowserSession iSession, HttpExchange iExchange, Map<String,String> iParameters)
    	        {
             		String lNodePath = iParameters.get("nodepath");
             		InfoFile lInfoFile = new InfoFile(lNodePath);
        			lInfoFile.setAttribute(InfoFile.LOGNAME, iParameters.get("logname"));  
             		
             		Object lResult = "";
            		switch (lInfoFile.mMode)
            		{
	            		case InfoFile.BEARBEITEN:
	            		case InfoFile.ANZEIGEN:
	            		{
	           	        	Session lSession = mSession.get(iSession);
	        	        	if (lSession == null)
	        	        	{
	                            lSession = new Session(iSession, iServer, lInfoFile);
	                            mSession.put(iSession, lSession);
	        	        	}
	        	        	
	        	        	if (VsConfig.sReload)
	        	        	{
	        	        		mIndexPage = Utils.readHtmlFile(mPath+"/index.html");    	        		
	        	        	}
	        	        	lResult = lSession.configure(mIndexPage);
	            		}
            			break;
	            		case InfoFile.KNOTENMAPPE:
	            		{
	        	     		UserSession lSession = iSession.getUserSession();
	           	    		CmdPhantomjs lPrinter = new CmdPhantomjs(lSession.getSessionInfo(UserSession.TARGET_HOST));
	           	    		lResult = lPrinter.printMappe(lInfoFile);
	            		}
            			break;
	            		case InfoFile.DRUCKEN:
	            		{
	        	     		UserSession lSession = iSession.getUserSession();
	        	    		CmdPhantomjs lPrinter = new CmdPhantomjs(lSession.getSessionInfo(UserSession.TARGET_HOST));
	            			lInfoFile.setAttribute(InfoFile.LOGNAME, iParameters.get("logname"));  
	        	    		lResult = lPrinter.printPlan(lInfoFile, false);
	            		}
            			break;
            		}
            		
            		return lResult;
    	        }
    	    });
    	    
       	    
       	    // Command line printing using curl or powershell
       	    iServer.setHtmlHandler(getContext()+"/print.html", new HtmlRequestHandlerIF() 
    	    {
    	    	@Override
    	        public Object handleHtmlRequest(BrowserSession iSession, HttpExchange iExchange, Map<String,String> iParameters)
    	        {
    	     		UserSession lSession = iSession.getUserSession();
    	    		CmdPhantomjs lPrinter = new CmdPhantomjs(lSession.getSessionInfo(UserSession.TARGET_HOST));
             		InfoFile lInfoFile = new InfoFile(iParameters.get("nodepath"));
        			lInfoFile.setAttribute(InfoFile.LOGNAME, iParameters.get("logname"));  
        			
        			Object lResult = "";
        			try{
        				File lFile = lInfoFile.getSourceFile("knotenplan.svg");
        				if (!lFile.exists())
        				{
        					new Knoten(lInfoFile, new Hashtable<String, Object>(), iServer);
            				lFile = lInfoFile.getSourceFile("knotenplan.svg");
        				}
            			DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
        		        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
         		        Document lDocument = lBuilder.parse(lFile);
        				lDocument.getDocumentElement().normalize();
        				
        				// Try to add VVaPlan into the svgimage
        				new Knoten(lInfoFile, lDocument).addVVaPlan();
        				Xml.write(lDocument, new FileWriter(lInfoFile.getSourceFile("knotenplan.svg")));
        				Knoten.copyToGposToVam(lInfoFile);
                		
                		switch (lInfoFile.mMode)
                		{
    	            		case InfoFile.BEARBEITEN:
    	            		case InfoFile.ANZEIGEN:
    	            		{
    	            		}
                			break;
    	            		case InfoFile.KNOTENMAPPE:
    	            		{
    	           	    		lResult = lPrinter.printMappe(lInfoFile);
    	            		}
                			break;
    	            		case InfoFile.DRUCKEN:
    	            		{
    	        	    		lResult = lPrinter.printPlan(lInfoFile, false);
    	            		}
                			break;
                		}
        			}catch(Exception e){
        				Log.out.error(e);
        			}
             		
    	            return lResult;
    	        }    	    	
    	    });
       	    
       	    // This is called on from within the geopos browser app.
      	    iServer.setHtmlHandler(getContext()+"/print-plan.html", new HtmlRequestHandlerIF() 
    	    {
    	    	@Override
    	        public Object handleHtmlRequest(BrowserSession iSession, HttpExchange iExchange, Map<String,String> iParameters)
    	        {
    	     		UserSession lSession = iSession.getUserSession();
    	    		CmdPhantomjs lPrinter = new CmdPhantomjs(lSession.getSessionInfo(UserSession.TARGET_HOST));
             		InfoFile lInfoFile = new InfoFile(iParameters.get("nodepath"));
             		lInfoFile.setAttribute(InfoFile.PLAN, iParameters.get("plan"));
        			lInfoFile.setAttribute(InfoFile.LOGNAME, iParameters.get("logname"));  
             		return lPrinter.printPlan(lInfoFile, true);
    	        }    	    	
    	    });


      	    // upload tiles
      	    iServer.setHtmlHandler(getContext()+"/upload-background.html", new HtmlRequestHandlerIF() 
    	    {
    	    	@Override
    	        public Object handleHtmlRequest(BrowserSession iSession, HttpExchange iExchange, Map<String,String> iParameters)
    	        {
       	        	Session lSession = mSession.get(iSession);
       	        	CmdTilemapper lTileMapper = (CmdTilemapper)lSession.getRemoteObject(CmdTilemapper.REMOTE_ID);
       	        	return lTileMapper.handleHttpRequest(iExchange, iParameters);
    	        }    	    	
    	    });
 
      	    //http://plr2-dev/pages/geopos/deploy.html?nodepath=/readwrite/knoten/k322.FQ/30.1&logname=pe&forceupdate=true&savevam=true
      	    //http://plr2-dev/index.html?viewname=geopos&nodepath=/readwrite/knoten/k322.FQ/30.1&logname=pe
      	    //plr2-dev/index.html?viewname=kntvis-322&zooming=true
      	    iServer.setHtmlHandler(getContext()+"/deploy.html", new HtmlRequestHandlerIF() 
    	    {
    	    	@Override
    	        public Object handleHtmlRequest(BrowserSession iSession, HttpExchange iExchange, Map<String,String> iParameters)
    	        {
             		InfoFile lInfoFile = new InfoFile(iParameters.get("nodepath"));
        			lInfoFile.setAttribute(InfoFile.LOGNAME, iParameters.get("logname"));
        			
        			ClassData lClass = mServer.getModuleClassData("nodeRegistry");
        			ch.bergauer.am.vs.modules.nodes.Installer lNodeRegistry = (ch.bergauer.am.vs.modules.nodes.Installer)lClass.getInstance();
       				
    				boolean lForceReset = false;
    				if (iParameters.containsKey("forceupdate"))
    				{
    					lForceReset = iParameters.get("forceupdate").equals("true");
    				}
    				boolean lSaveVam = false;
    				if (iParameters.containsKey("savevam"))
    				{
    					lSaveVam = iParameters.get("savevam").equals("true");
    				}
        			
        			try
        			{
        				File lFile = lInfoFile.getSourceFile("knotenplan.svg");
        				
        				if (!lFile.exists())
        				{
        					new Knoten(lInfoFile, new Hashtable<String, Object>(), iServer);
            				lFile = lInfoFile.getSourceFile("knotenplan.svg");
        				}
        				
        		        DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
        		        DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
         		        Document lDocument = lBuilder.parse(lFile);
        				lDocument.getDocumentElement().normalize();
         				
        				if (lForceReset)
        				{
        					//	make sure all dynamic elements are at the same place as the static ones.
        					LayerDynamic.resetPositions(lDocument.getDocumentElement());
        					LayerDynamic.resetSymbols(lDocument, lInfoFile);
        				}
        				
        				// Try to add VVaPlan into the svgimage
        				new Knoten(lInfoFile, lDocument).addVVaPlan();
        				
        				if (lSaveVam)
        				{
        					Xml.write(lDocument, new FileWriter(lInfoFile.getSourceFile("knotenplan.svg")));
        				}
        				
                        LayerDynamic.deploy(lInfoFile, lDocument, lNodeRegistry);
                        
                        if (lSaveVam)
                        {
                        	Knoten.copyToGposToVam(lInfoFile);
                        	lInfoFile.writeStatOk();
                        }
        			}
        			catch (Exception e)
        			{
        				Log.out.error(e);
        			}
        			
       				if (!lSaveVam)
    				{
             			CmdPhantomjs.deleteDirectory(lInfoFile.getRootDir());
    				}

    	            return 1;
    	        }    	    	
    	    });
      	    
 
    	    
     	    // install ajax handlers
    	    iServer.setAjaxHandler("geopos", new AjaxRequestHandlerIF()
    	    {
            	@Override
    	        public Object handleExecRequest(BrowserSession iSession)
    	        {
    	            return mSession.get(iSession);
    	        }
    	    });
    	    
    	    instalRemoteObject(iServer, LayerStatic.REMOTE_ID);
    	    instalRemoteObject(iServer, LayerPlankopf.REMOTE_ID);
       	    instalRemoteObject(iServer, LayerDynamic.REMOTE_ID);
    	    instalRemoteObject(iServer, Knoten.REMOTE_ID);
    	    instalRemoteObject(iServer, RemoteSvg.REMOTE_ID);
    	    instalRemoteObject(iServer, CmdTilemapper.REMOTE_ID);
    	    
    	    // install cleanup listener
            iServer.addListener(new VisualServerAdapter()
            {
                @Override
                public void browserSessionClosed(BrowserSession iSession)
                {
                	if (mSession.containsKey(iSession))
                	{
    	        		Session lSession = mSession.remove(iSession);
    	        		lSession.closeSession();
                	}
                }
            });
             
         	return "SUCCESS";
        } 
        catch (Exception e) 
        {
        	Log.out.error(e);
            return "ERROR "+e.getMessage();
        }
    }
    
    
    protected void instalRemoteObject(final VisualServer iServer, final String iName)
    {
   	    iServer.setAjaxHandler(iName, new AjaxRequestHandlerIF()
	    {
        	@Override
	        public Object handleExecRequest(BrowserSession iSession)
	        {
        		Session lSession = mSession.get(iSession);
        		
	            return lSession.getRemoteObject(iName);
	        }
	    });    	    
   	
    }
    
    
 }
