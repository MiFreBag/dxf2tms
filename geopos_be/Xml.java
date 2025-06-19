package ch.bergauer.am.vs.pages.geopos;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Writer;
import java.util.LinkedList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import ch.bergauer.am.vs.util.Log;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class Xml 
{
	protected static Document parse(File iFile) throws Exception
	{
	    DocumentBuilderFactory lFactory = DocumentBuilderFactory.newInstance();
	    lFactory.setNamespaceAware(false);
	    lFactory.setValidating(false);
	    lFactory.setIgnoringElementContentWhitespace(true);
	    lFactory.setFeature("http://apache.org/xml/features/nonvalidating/load-dtd-grammar", false);
	    lFactory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
	    
	    DocumentBuilder lBuilder = lFactory.newDocumentBuilder();
	    Document lDocument = lBuilder.parse(iFile);
	    Element lRoot = lDocument.getDocumentElement();
	    Xml.removeWhitespace(lRoot);
	    return lDocument;
	}
	
	protected static void write(Document iDocument, Writer iWriter) throws Exception
	{
		removeWhitespace(iDocument.getDocumentElement());
		
        Transformer lTransformer = TransformerFactory.newInstance().newTransformer();
        //lTransformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
        lTransformer.setOutputProperty(OutputKeys.INDENT, "yes");
        lTransformer.setOutputProperty(OutputKeys.ENCODING, "ISO-8859-1");
        
        lTransformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "3");    
        DOMSource lSource = new DOMSource(iDocument);
        lTransformer.transform(lSource, new StreamResult(iWriter));
        iWriter.close();
	}
	
	protected static void write(Element iRoot, Writer iWriter) throws Exception
	{
        Transformer lTransformer = TransformerFactory.newInstance().newTransformer();
        lTransformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
        lTransformer.setOutputProperty(OutputKeys.INDENT, "yes");
        lTransformer.setOutputProperty(OutputKeys.ENCODING, "ISO-8859-1");
        
        lTransformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "3");    
        DOMSource lSource = new DOMSource(iRoot);
        lTransformer.transform(lSource, new StreamResult(iWriter));
        iWriter.close();
	}
	
	protected static void removeWhitespace(Element iElement) 
	{
        LinkedList<Node> lRemove = new LinkedList<Node>();
    	
        NodeList lList = iElement.getChildNodes();
        for (int i = 0; i < lList.getLength(); i++) 
        {
            Node lNode = lList.item(i);
           
            if (lNode.getNodeType() == Node.TEXT_NODE) 
            {
                String lText = lNode.getTextContent();
                if (lText.trim().isEmpty())
                {
                	lRemove.add(lNode);
                }
            }
            else if (lNode.getNodeType() == Node.ELEMENT_NODE)
            {
                removeWhitespace((Element) lNode);
            }
        }
        
        for (Node lNode : lRemove)
        {
        	iElement.removeChild(lNode);
        }
    }
	
	//
	//
	//
	
	private static JsonArray getAttributes(Element iElement)
	{
		JsonArray lArray = new JsonArray();
		NamedNodeMap lMap = iElement.getAttributes();
		for (int i=0; i<lMap.getLength(); i++)
		{
			Node lNode = lMap.item(i);
			JsonObject lObject = new JsonObject();
			lObject.addProperty("id", lNode.getNodeName());
			lObject.addProperty("value", lNode.getNodeValue());
			lArray.add(lObject);
		}
		return lArray;
	}
	
	private static JsonArray getChildren(Element iElement)
	{
		JsonArray lArray = new JsonArray();
		NodeList lList = iElement.getChildNodes();
		for (int i=0; i<lList.getLength(); i++)
		{
			Node lItem = lList.item(i);
			if (lItem instanceof Element)
			{
				lArray.add(toJson((Element)lItem));
			}
		}
		return lArray;
	}
	
	
	//
	// Convert from Json
	//

	public static JsonObject toJson(Element iElement)
	{
		JsonObject lObject = new JsonObject();
		lObject.addProperty("tagName", iElement.getNodeName());
		lObject.add("attributes", getAttributes(iElement));
		lObject.add("children", getChildren(iElement));
		lObject.addProperty("textContent", iElement.getTextContent());
		return lObject;
	}
	

	public static Element fromJson(Document iDocument, JsonObject iObject)
	{
		Element lElement = iDocument.createElement(iObject.get("tagName").getAsString());
		
		try
		{
			if(iObject.has("textContent")){
				lElement.setTextContent(StringUtils.unescapeHtml3(iObject.get("textContent").getAsString()));
			}
			
			if(iObject.has("attributes")){
				JsonArray lAttributes = iObject.get("attributes").getAsJsonArray();
				for (int i=0; i<lAttributes.size(); i++)
				{
					JsonObject lAttribute = lAttributes.get(i).getAsJsonObject();
					lElement.setAttribute(lAttribute.get("name").getAsString(), lAttribute.get("value").getAsString());
				}
			}
			
			if(iObject.has("children")){
				JsonArray lChildren = iObject.get("children").getAsJsonArray();
				for (int i=0; i<lChildren.size(); i++)
				{
					Element lChild = fromJson(iDocument, lChildren.get(i).getAsJsonObject());
					lElement.appendChild(lChild);
				}
			}
		}
		catch (Exception e)
		{
			Log.out.error(e);
		}
		
		return lElement;
	}	
	
	
	  
    public static void copyFile(File iSrce, File iDest)
    {
    	try
    	{
    	    InputStream lInput = new FileInputStream(iSrce);
    	    OutputStream lOutput = new FileOutputStream(iDest);
 
    	    byte[] lBuffer = new byte[1024];
    	    int lLenght;
    	    while ((lLenght = lInput.read(lBuffer)) > 0)
    	    {
    	    	lOutput.write(lBuffer, 0, lLenght);
    	    }
    	    lInput.close();
    	    lOutput.close();
 
    	}
    	catch(Exception e)
    	{
    		Log.out.error("Copying files ", e);
    	}
    	
    }
    
	public static void setTextFeld(Element iRoot, String iText) throws Exception
	{
		XPath lPath = XPathFactory.newInstance().newXPath();  
		
		NodeList lList = (NodeList) lPath.evaluate(".//text[@id='textfeld']", iRoot, XPathConstants.NODESET);
		for (int i=0; i<lList.getLength(); i++)
		{
			Element lElement = (Element) lList.item(i);
   			if (iText.length() == 1 && (iText.endsWith("9") || iText.endsWith("6")))
   			{
   				iText += ".";
   			}
	   		lElement.setTextContent(iText);
		}
	}
	
}
