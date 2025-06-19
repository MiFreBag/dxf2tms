package ch.bergauer.am.vs.pages.geopos;

import java.io.BufferedReader;
import java.io.FileReader;

import org.w3c.dom.Element;

import com.swisstopo.geodesy.reframe_lib.IReframe.AltimetricFrame;
import com.swisstopo.geodesy.reframe_lib.IReframe.PlanimetricFrame;
import com.swisstopo.geodesy.reframe_lib.Reframe;

public class Projection 
{
	public static final String MASSSTAB = "massstab";
	public static final String FORMAT = "format";
	public static final String AUSLEGUNG = "auslegung";
	
	public static String MASSTAB_VALUES[] = new String[] { "200", "500", "1000"  };
	public static String FORMAT_VALUES[] = new String[] { "A4", "A3" };
	public static String AUSLEGUNG_VALUES[] = new String[] { "hoch", "quer" };
	
	public static String DEFAULT_MASSTAB = "500";
	public static String DEFAULT_AUSLEGUNG = "hoch";
	public static String DEFAULT_FORMAT = "A3";
	
	public static final int PRINT_MARGIN = 30; // mm
	
	protected Double mSvgLeft;
	protected Double mSvgTop;
	protected Double mWidth;
	protected Double mHeight;
	protected String mMassstab;
	protected String mAuslegung;
	protected String mFormat;

	// upper y coordinates in LV03 or LV95. This is necessary to flip the y axis for SVG 
	private double YLU = 0; 
	private static final double YLU_LV03 = 256070.0; 
	private static final double YLU_LV95 = 1256069.0; 

	// from INFOFILE
	public Projection(InfoFile iInfoFile, String iPlan) throws Exception
	{
		BufferedReader lReader = new BufferedReader(new FileReader(iInfoFile.getSourceFile(iPlan)));
		String lLine = lReader.readLine();
		lLine = lReader.readLine();
		String[] lColumn = lLine.split(",");
		lReader.close();
		
		// Massstab
        mMassstab = lColumn[4];
        if (mMassstab.equals(""))
        {
        	mMassstab = DEFAULT_MASSTAB;
        }
        mAuslegung = lColumn[5];
        if (mAuslegung.equals(""))
        {
        	mAuslegung = DEFAULT_AUSLEGUNG;
        }
        mFormat = lColumn[6];
        if (mFormat.equals(""))
        {
        	mFormat = DEFAULT_FORMAT;
        }

        String lLeft = lColumn[1];
        String lTop = lColumn[2];
        
        String lSRS = iInfoFile.getSRS(); 
        if (lSRS.equals(InfoFile.LV03))
        {
        	YLU = YLU_LV03;
            if (lLeft.equals("") || lTop.equals(""))
            {
            	lLeft = "683253";
            	lTop = "246390";
            }
        }
        else if (lSRS.equals(InfoFile.LV95))
        {
        	YLU = YLU_LV95;
            if (lLeft.equals("") || lTop.equals(""))
            {
            	lLeft = "2683253";
            	lTop = "1246389";
            }
        }
         
	    mSvgLeft = chToSvgX(Double.parseDouble(lLeft));
        mSvgTop = chToSvgY(Double.parseDouble(lTop));
        
        computeDimension();
	}
	
	// from SVG viewbox
	public Projection(InfoFile iInfoFile, Element iElement) throws Exception
	{
        mMassstab = iElement.getAttribute(MASSSTAB);
        mFormat = iElement.getAttribute(FORMAT);
		mAuslegung = iElement.getAttribute(AUSLEGUNG);
		
		String[] lRect = iElement.getAttribute("region").split(" ");
        mSvgLeft = Double.parseDouble(lRect[0]);
        mSvgTop = Double.parseDouble(lRect[1]);

        String SRS = iInfoFile.getSRS(); 
        if (SRS.equals(InfoFile.LV03))
        {
        	YLU = YLU_LV03;
        }
        else if (SRS.equals(InfoFile.LV95))
        {
        	YLU = YLU_LV95;
        }
        
        computeDimension();
	}
	
	
	public Projection(Double iLeft, Double iTop, String iMassstab, String iAuslegung, String iFormat) throws Exception
	{
        mMassstab = iMassstab;
        mFormat = iFormat;
		mAuslegung = iAuslegung;
		
        mSvgLeft = iLeft;
        mSvgTop = iTop;

        computeDimension();
	}
	
	private void computeDimension()
	{
        Double lMassstab = Double.parseDouble(mMassstab)/1000.0;

		// Format
        Double lWidth = 210.0; // A4 format width in mm
        Double lHeight = 297.0; // A4 format height in mm
         
		if (mFormat.equals("A4"))
		{
			// 210 x 297 mm
			if (mAuslegung.equals("hoch"))
			{
				lWidth = 210.0;
				lHeight = 297.0;
			}
			else
			{
				lWidth = 297.0;
				lHeight = 210.0;
			}
		}
		else
		{
			// 297 x 420
			if (mAuslegung.equals("hoch"))
			{
				lWidth = 297.0;
				lHeight = 420.0;
			}
			else
			{
				lWidth = 420.0;
				lHeight = 297.0;
			}
		}
        
        // subtract 15mm printing margin
		lWidth -= PRINT_MARGIN;
		lHeight -= PRINT_MARGIN;
        
        mWidth = lWidth*lMassstab;
        mHeight = lHeight*lMassstab;
	}
	
	private Double chToSvgY(Double iYcoordinate)
	{
		return YLU - iYcoordinate;
	}
	private Double chToSvgX(Double iXcoordinate)
	{
		return iXcoordinate;
	}
	
	public Double svgToChY(Double iYcoordinate)
	{
		return YLU - iYcoordinate;
	}
	public Double svgToChX(Double iXcoordinate)
	{
		return iXcoordinate;
	}

	
	// convert coordiantes assuming the Hintergrundbild has origin 0,0. This would not be necessary if IE could handle the  
	// reqion in CH coordinates as a viewbox
	public Double chToViewboxX(Double iXcoordinate)
	{
		return chToSvgX(iXcoordinate) - mSvgLeft;
	}
	public Double chToViewboxY(Double iYcoordinate)
	{
		return chToSvgY(iYcoordinate) - mSvgTop; 
	}

	public Double viewboxToChX(Double iXcoordinate)
	{
		return svgToChX(iXcoordinate + mSvgLeft);
	}
	public Double viewboxToChY(Double iYcoordinate)
	{
		return svgToChY(iYcoordinate + mSvgTop); 
	}
	
	public void setPositionSvg(Double iSvgLeft, Double iSvgTop)
	{
        mSvgLeft = iSvgLeft;
        mSvgTop = iSvgTop;
	}
	
	public void setPositionCH(Double iChLeft, Double iChTop)
	{
        mSvgLeft = chToSvgX(iChLeft);
        mSvgTop = chToSvgY(iChTop);
	}
	

	public String getRegion()
	{
		return mSvgLeft +" "+ mSvgTop +" "+ mWidth +" "+ mHeight;
	}
	
	public String getViewbox(Projection iLageProjection)
	{
		return (mSvgLeft-iLageProjection.mSvgLeft) +" "+ (mSvgTop-iLageProjection.mSvgTop) +" "+ mWidth +" "+ mHeight;
	}

	
	public boolean canFit(Projection iProjection)
	{
		return iProjection.mWidth <=  mWidth && iProjection.mHeight <= mHeight;
	}
	
	public void fit(Projection iProjection)
	{
		mSvgLeft = Math.min(Math.max(mSvgLeft, iProjection.mSvgLeft), iProjection.mSvgLeft + iProjection.mWidth-mWidth);
		mSvgTop = Math.min(Math.max(mSvgTop, iProjection.mSvgTop), iProjection.mSvgTop + iProjection.mHeight-mHeight);
	}
	
	//
	// LV95 conversion
	//
	
	public void toLV95(Reframe iReframe)
	{
    	YLU = YLU_LV03;
		double[] lInput = new double[] { svgToChX(mSvgLeft), svgToChY(mSvgTop) };
		double[] lOutput = iReframe.ComputeReframe(lInput, PlanimetricFrame.LV03_Military, PlanimetricFrame.LV95, AltimetricFrame.Ellipsoid, AltimetricFrame.Ellipsoid);
    	YLU = YLU_LV95;
	    mSvgLeft = chToSvgX(lOutput[0]);
        mSvgTop = chToSvgY(lOutput[1]);
	}
	
	/*
	public void toLV95(Reframe iReframe, Element iObject)
	{
    	YLU = YLU_LV95;
		String lTransform = iObject.getAttribute("transform");
		lTransform = lTransform.substring(7,lTransform.length()-1);
		String[] lMatrix = lTransform.split(" ");
		double[] lInput = new double[] { svgToChX(Double.parseDouble(lMatrix[4])), svgToChY(Double.parseDouble(lMatrix[5])) };
		double[] lOutput = iReframe.ComputeReframe(lInput, PlanimetricFrame.LV03_Military, PlanimetricFrame.LV95, AltimetricFrame.Ellipsoid, AltimetricFrame.Ellipsoid);
    	YLU = YLU_LV95;
		lMatrix[4] = String.format("%.6f", chToSvgX(lOutput[0]));
		lMatrix[5] = String.format("%.6f", chToSvgX(lOutput[1]));
		iObject.setAttribute("transform", "matrix("  + lMatrix[0] + " " +  lMatrix[1] + " " 
			 									     + lMatrix[2] + " " +  lMatrix[3] + " " 
			 									     + lMatrix[4] + " " +  lMatrix[5] + ")");
	}
	*/

	public void centerObject(Element iObject)
	{
		String lTransform = iObject.getAttribute("transform");
		lTransform = lTransform.substring(7,lTransform.length()-1);
		String[] lMatrix = lTransform.split(" ");
		
		double lX = Double.parseDouble(lMatrix[4]);
		double lY = Double.parseDouble(lMatrix[5]);

		if (lX <= 0 || lX >= mWidth)
		{
			lMatrix[4] = String.format("%.6f", mWidth/2);
		}

		if (lY <= 0 || lY >= mHeight)
		{
			lMatrix[5] = String.format("%.6f", mHeight/2);
		}
		
		
		iObject.setAttribute("class", "object");  // the removes "unpositioned"
		iObject.setAttribute("transform", "matrix(" + lMatrix[0] + " " +  lMatrix[1] + " " 
			 									     + lMatrix[2] + " " +  lMatrix[3] + " " 
			 									     + lMatrix[4] + " " +  lMatrix[5] + ")");
		
	}
	
	
}
