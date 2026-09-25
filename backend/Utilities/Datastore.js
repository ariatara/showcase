import MySQL from "mysql2";

const DatastoreConnection = MySQL.createConnection({
  host: "localhost",
  user: "root",
  password: "lily1921",
  database: "showcase",
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
