package ch.bergauer.am.vs.pages.geopos;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import ch.bergauer.am.vs.jsbmi.RemoteMethod;
import ch.bergauer.am.vs.jsbmi.ServerCall;
import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class RemoteSvg 
{
	public static final String REMOTE_ID = "geopos-svg";
	
	protected Document mDocument;
	protected JsonParser mParser = new JsonParser();

	public RemoteSvg(Document iDocument)
	{
		mDocument = iDocument;
	}

    @RemoteMethod
    public void updateAttribute(ServerCall iCall, String iId, String iClass, String iAttribute, String iValue)
    {
     	try
    	{
    		XPath lPath = XPathFactory.newInstance().newXPath();
    		
    		
    		Element lElement = (Element) lPath.evaluate("//*[(@id='"+iId+"' and contains(concat(' ', @class, ' '), '"+iClass+"'))]", mDocument, XPathConstants.NODE);
    		//Element lElement = (Element) lPath.evaluate("//*[(@id='"+iId+"' and @class='"+iClass+"')]", mDocument, XPathConstants.NODE); 
        	if (lElement != null)
        	{
        		lElement.setAttribute(iAttribute, iValue);
        	}
        	else
        	{
        		Log.out.error("Element not found " + "//*[(@id='"+iId+"' and @class='"+iClass+"')]");
        	}
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
    }
    
    @RemoteMethod
    public void createNode(ServerCall iCall, String iParentId, String iParentClass, String iJson)
    {
    	try
    	{
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lElement = (Element) lPath.evaluate("//g[@id='"+iParentId+"']", mDocument, XPathConstants.NODE); 
        	if (lElement != null)
        	{
        		lElement.appendChild(Xml.fromJson(mDocument, mParser.parse(iJson).getAsJsonObject()));
        	}
        	else
        	{
        		Log.out.error("Element not found " + "g[@id='"+iParentId+"']");
        	}
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
    }
    
    @RemoteMethod
    public void createPattern(ServerCall iCall, String iPatternId)
    {
    	try
    	{
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lElement = (Element) lPath.evaluate("//defs[@id='PROJECT']", mDocument, XPathConstants.NODE); 
    		
        	if (lElement != null)
        	{
        		JsonObject lNewPattern = createPatternFromId(iPatternId);
        		if(lNewPattern!=null){
        			Element lChildElement = Xml.fromJson(mDocument, lNewPattern);
            		lElement.appendChild(lChildElement);
        		}
        	}
        	else
        	{
        		Log.out.error("Element not found " + "defs[@id='PROJECT']");
        	}
		}
		catch (Exception e)
		{
			Log.out.error(e.toString());
		}
    }
    
    @RemoteMethod
    public void deletePattern(ServerCall iCall, String iPatternIdArray)
    {
    	try
    	{
    		JsonArray lJsonArr = mParser.parse(iPatternIdArray).getAsJsonArray();
    		
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lParentElement = (Element) lPath.evaluate("//defs[@id='PROJECT']", mDocument, XPathConstants.NODE); 
    		
    		if (lParentElement != null)
        	{
    			for (int i=0; i<lJsonArr.size(); i++)
    			{
    				String lPatternId = lJsonArr.get(i).getAsString();
    				
    	    		Element lElement = (Element) lPath.evaluate("//pattern[@id='"+lPatternId+"']", mDocument, XPathConstants.NODE); 
    	    		
    	        	if (lElement != null)
    	        	{
    	        		lParentElement.removeChild(lElement);
    	        	}
    			}
        	}
    		else
        	{
    			Log.out.error("lParentElement not found " + "defs[@id='PROJECT']");
        	}
    		
		}
		catch (Exception e)
		{
			Log.out.error(e.toString());
		}
    }
 
    @RemoteMethod
    public void deleteNode(ServerCall iCall, String iJson)
    {
    	try
    	{
    		JsonObject lJson = mParser.parse(iJson).getAsJsonObject();
    		
    		String lId = null;
    		String lClass = null;
    		JsonArray lAttributes = lJson.get("attributes").getAsJsonArray();
    		for (int i=0; i<lAttributes.size(); i++)
    		{
    			JsonObject lObject = lAttributes.get(i).getAsJsonObject();
    			if (lObject.get("name").getAsString().equals("id"))
    			{
    				lId = lObject.get("value").getAsString();
    			}
    			else if (lObject.get("name").getAsString().equals("class"))
    			{
    				lClass = lObject.get("value").getAsString();
    			}
    		}
        	
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lElement = (Element) lPath.evaluate("//" + lJson.get("tagName").getAsString() + "[@id='"+lId+"' and @class='"+lClass+"']", mDocument, XPathConstants.NODE); 
        	if (lElement != null)
        	{
        		Element lParent = (Element)lElement.getParentNode();
        		lParent.removeChild(lElement);
        	}
        	else
        	{
        		Log.out.error("Element not found " +  lJson.get("tagName").getAsString() + "[@id='"+lId+"' and @class='"+lClass+"']");
        	}
    		
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
    }
    
    @RemoteMethod
    public void updateNode(ServerCall iCall, String iJson)
    {
    	try
    	{
    		JsonObject lJson = mParser.parse(iJson).getAsJsonObject();
    		
    		String lId = null;
    		String lClass = null;
    		JsonArray lAttributes = lJson.get("attributes").getAsJsonArray();
    		for (int i=0; i<lAttributes.size(); i++)
    		{
    			JsonObject lObject = lAttributes.get(i).getAsJsonObject();
    			if (lObject.get("name").getAsString().equals("id"))
    			{
    				lId = lObject.get("value").getAsString();
    			}
    			else if (lObject.get("name").getAsString().equals("class"))
    			{
    				lClass = lObject.get("value").getAsString();
    			}
    		}
    		
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lElement = (Element) lPath.evaluate("//" + lJson.get("tagName").getAsString() + "[@id='"+lId+"' and @class='"+lClass+"']", mDocument, XPathConstants.NODE); 
        	if (lElement != null)
        	{
        		Element lParent = (Element)lElement.getParentNode();
        		lParent.removeChild(lElement);
        		lParent.appendChild(Xml.fromJson(mDocument, lJson));
        	}
        	else
        	{
        		Log.out.error("Element not found " +  lJson.get("tagName").getAsString() + "[@id='"+lId+"' and @class='"+lClass+"']");
        	}
    		
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
    }
    
    @RemoteMethod
    public void insertBefore(ServerCall iCall, String iParentId, String iSrceId, String iDestId)
    {
    	try
    	{
    		XPath lPath = XPathFactory.newInstance().newXPath();  
    		Element lParent = (Element) lPath.evaluate("//g[@id='"+iParentId+"']", mDocument, XPathConstants.NODE);
    		
    		Element lSrce = (Element) lPath.evaluate(".//*[@id='"+iSrceId+"']", lParent, XPathConstants.NODE); 
    		Element lDest = (Element) lPath.evaluate(".//*[@id='"+iDestId+"']", lParent, XPathConstants.NODE); 
    		
    		lParent.insertBefore(lSrce, lDest);
    		
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
    }

    protected JsonObject createPatternFromId(String iPatternId){
    	
    	String lJsonString = null;
    	
    	if(iPatternId != null){
    		
    		if(iPatternId.startsWith("schraffiert1-")){
    			
    			String lPattFillColor = iPatternId.replace("schraffiert1-", "");
        		
    	        lJsonString = "{"
	                + "\"tagName\": \"pattern\","
	                + "\"attributes\": ["
	                    + "{"
	                        + "\"name\": \"height\","
	                        + "\"value\": \"1\""
	                    + "},"
	                    + "{"
	                        + "\"name\": \"patternUnits\","
	                        + "\"value\": \"userSpaceOnUse\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"width\","
	                        + "\"value\": \"1\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"x\","
	                        + "\"value\": \"0\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"y\","
	                        + "\"value\": \"0\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"id\","
	                        + "\"value\": "+iPatternId
	                    + "}"
	                + "],"
	                + "\"children\": ["
	                    + "{"
	    	                + "\"tagName\": \"g\","
	    	                + "\"attributes\": ["
	    	                    + "{"
	    	                        + "\"name\": \"style\","
	    	                        + "\"value\": \"stroke:#"+lPattFillColor+"; stroke-width:0.1;stroke-opacity : 0.5\""
	    	                    + "}"
	    	                + "],"
	    	                + "\"children\": ["
			                    + "{"
			    	                + "\"tagName\": \"path\","
			    	                + "\"attributes\": ["
			    	                    + "{"
			    	                        + "\"name\": \"d\","
			    	                        + "\"value\": \"M0,0 l1,1\""
			    	                    + "}"
			    	                + "]"
			                    + "},"
			                    + "{"
			    	                + "\"tagName\": \"path\","
			    	                + "\"attributes\": ["
			    	                    + "{"
			    	                        + "\"name\": \"d\","
			    	                        + "\"value\": \"M1,0 l-1,1\""
			    	                    + "}"
			    	                + "]"
			                    + "}"
			                + "]"
	                    + "}"
	                + "]"
	            + "}";
    	        
        	}else if(iPatternId.startsWith("schraffiert13-")){
        		
        		String lPattFillColor = iPatternId.replace("schraffiert13-", "");
        		
    	        lJsonString = "{"
	                + "\"tagName\": \"pattern\","
	                + "\"attributes\": ["
	                    + "{"
	                        + "\"name\": \"height\","
	                        + "\"value\": \"4\""
	                    + "},"
	                    + "{"
	                        + "\"name\": \"patternUnits\","
	                        + "\"value\": \"userSpaceOnUse\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"width\","
	                        + "\"value\": \"4\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"x\","
	                        + "\"value\": \"0\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"y\","
	                        + "\"value\": \"0\""
                        + "},"
	                    + "{"
	                        + "\"name\": \"id\","
	                        + "\"value\": "+iPatternId
	                    + "}"
	                + "],"
	                + "\"children\": ["
	                    + "{"
	    	                + "\"tagName\": \"g\","
	    	                + "\"attributes\": ["
	    	                    + "{"
	    	                        + "\"name\": \"style\","
	    	                        + "\"value\": \"stroke:#"+lPattFillColor+"; stroke-width:0.4;stroke-opacity : 1; stroke-linecap:square\""
	    	                    + "}"
	    	                + "],"
	    	                + "\"children\": ["
			                    + "{"
			    	                + "\"tagName\": \"path\","
			    	                + "\"attributes\": ["
			    	                    + "{"
			    	                        + "\"name\": \"d\","
			    	                        + "\"value\": \"M1,0 l-1,1\""
			    	                    + "}"
			    	                + "]"
			                    + "},"
			                    + "{"
			    	                + "\"tagName\": \"path\","
			    	                + "\"attributes\": ["
			    	                    + "{"
			    	                        + "\"name\": \"d\","
			    	                        + "\"value\": \"M3,0 l-3,3\""
			    	                    + "}"
			    	                + "]"
		    	                + "},"
			                    + "{"
			    	                + "\"tagName\": \"path\","
			    	                + "\"attributes\": ["
			    	                    + "{"
			    	                        + "\"name\": \"d\","
			    	                        + "\"value\": \"M4,1 l-3,3\""
			    	                    + "}"
			    	                + "]"
		    	                + "},"
			                    + "{"
			    	                + "\"tagName\": \"path\","
			    	                + "\"attributes\": ["
			    	                    + "{"
			    	                        + "\"name\": \"d\","
			    	                        + "\"value\": \"M4,3 l-1,1\""
			    	                    + "}"
			    	                + "]"
			                    + "}"
			                + "]"
	                    + "}"
	                + "]"
	            + "}";
    	        
        	}
    	}
    	
    	if(lJsonString != null){
    		return mParser.parse(lJsonString).getAsJsonObject();
    	}
    	
    	return null;
    }
	
}
