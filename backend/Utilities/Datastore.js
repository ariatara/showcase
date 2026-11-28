import MySQL from "mysql2";

export const createDatastoreConnection = () => MySQL.createConnection({
  host: "localhost",
  user: "root",
  password: "lily1921",
  database: "showcase",
});

const DatastoreConnection = createDatastoreConnection();

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
