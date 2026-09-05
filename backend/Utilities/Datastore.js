import MySQL from "mysql2";

const DatastoreConnection = MySQL.createConnection({
  host: "localhost",
  user: "root",
  password: "rdPa$$w0rd@@",
  database: "uttoron",
});

DatastoreConnection.connect(function (error) {
  if (error) {
    console.log(`Database connection failed: ${error}`);
  } else {
    console.log(
      `Database connection to ${DatastoreConnection.config.database} successful`
    );
  }
});

export default DatastoreConnection;
