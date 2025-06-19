package ch.bergauer.am.vs.pages.geopos;

import ch.bergauer.am.vs.db.DatabaseConfig;

public class OracleDbConf extends DatabaseConfig {

	public OracleDbConf(String arg0) {
		super(arg0);
	}
	
	public String getConnectionURL() {
        return "jdbc:oracle:thin:@"+getHost()+":"+getPort()+":"+getDatabase();
    }

}
