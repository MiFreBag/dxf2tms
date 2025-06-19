package ch.bergauer.am.vs.pages.geopos;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

import ch.bergauer.am.vs.config.VsConfig;
import ch.bergauer.am.vs.util.Log;

public class OracleDbMgr 
{
    private static final String VALIDATION_SQL_QUERY = "SELECT 1 FROM DBMGR.POLYKNOTEN";
    
    private static final String CLASSDRIVER = "oracle.jdbc.driver.OracleDriver";
    
    private static HashMap<String, OracleDbMgr> mManagers = new HashMap<String, OracleDbMgr>();

    private BlockingQueue<Connection> mConnections = new ArrayBlockingQueue<Connection>(100);
    private String mConnectionUrl = null;
    private String mHost, mUser, mPass, mDatabase;
    private int mPort;

    private OracleDbMgr(OracleDbConf pConfig) {
        
        mConnectionUrl = pConfig.getConnectionURL();
        
        mHost = pConfig.getHost();
        mPort = pConfig.getPort();
        
        mUser = pConfig.getUser();
        mPass = pConfig.getPassword();
        mDatabase = pConfig.getDatabase();
        
        try 
        {
            Class.forName(CLASSDRIVER);
        } 
        catch (Exception e) 
        {
            Log.out.error("Error loading database driver: "+CLASSDRIVER, e);
        }
    }
    
    
    public static synchronized OracleDbMgr getInstance(OracleDbConf pConfig)
    {
        OracleDbMgr lManager = mManagers.get( pConfig.getConnectionURL() );
        if(lManager == null) {
            lManager = new OracleDbMgr(pConfig);
            mManagers.put(pConfig.getConnectionURL(), lManager);
        }
        return lManager;
    }
    
    
    public static String getTablename(String iKey)
    {
        String lName = VsConfig.getProperty(iKey);
        if(lName == null) {
            lName = iKey.replace("table.", "");
            lName = lName.replaceAll("\\.", "_");
            Log.out.error("Property '"+iKey+"' is not configured in vsconfig.xml, creating default: "+lName);
        }
        return lName;
    }
    
    
    public Connection getConnection()
    {
        Connection c = mConnections.poll();
        
        if(c != null) {
            c = checkConnection(c);
        }
        
        if(c == null) {
            c = createConnection();
        }
        
        return c;
    }
    
    public int getConnectionPoolSize() {
        return mConnections.size();
    }
    
    public void releaseConnection(Connection iConnection)
    {
        if(iConnection != null) {
        	mConnections.add(iConnection);
        }
    }
    
    public void closeConnection(Connection iConnection)
    {
        try {
            iConnection.close();
            Log.out.debug("Connection "+mDatabase+" closed. Pool size: "+mConnections.size());
        } catch (Exception e) {
            Log.out.warn("Could not close connection "+mDatabase+". ", e);
        }
    }


    /**
     * @return a new connection or <tt>null</tt> if it could not be created.
     */
    private Connection createConnection() {
        Connection c = null; 
        try {
            if(isReachable()) {
            	Class.forName(CLASSDRIVER);
                c = DriverManager.getConnection(mConnectionUrl, mUser, mPass);
                Log.out.debug("Successfully connected to " + mConnectionUrl);
            }
        } catch (Exception e) {
          Log.out.error("Unable to connect to " + mConnectionUrl, e);
          c = null;
        }
        return c;
    }
    
    
    /**
     * Checks if iConnection is valid.
     * @param iConnection the connection to check
     * @return the verified connection or <tt>null</tt> if it was invalid.
     */
    private Connection checkConnection(Connection iConnection) {
       if (iConnection != null) {
           Statement stmt = null;
           try {
               stmt = iConnection.createStatement();
               stmt.executeQuery(VALIDATION_SQL_QUERY);
               stmt.close();
           }
           catch (SQLException e) {
               Log.out.warn("Connection is invalid. ("+e.getMessage()+")");
               iConnection = null;
           }
       }
       return iConnection;
    }
    
    
    /**
     * Check if the database on the Host pHost is reachable.
     * @return <tt>true</tt> if the DB is reachable, <tt>false</tt> otherwise
     */
    public boolean isReachable() {
        try {
            // check if the target host:port can be connected.
            Socket socket = new Socket();
            socket.connect(new InetSocketAddress(mHost, mPort), 2000);
            if(socket.isConnected()) {
                socket.close();
                socket = null;
                return true;
            }
        } catch (Exception e) {
            Log.out.warn("Port "+mPort+" on "+mHost+" is not reachable.");
        }
        return false;
    }
}