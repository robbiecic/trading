var mysql = require("mysql");

async function dbConnect() {
  return new Promise((resolve, reject) => {
    //Create connection to mySQL
    var con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_SCHEMA,
      port: process.env.DB_PORT
    });
    //Connect to DB
    con.connect(function(err) {
      if (err) {
        console.log("Could not connect to mySQL database");
        throw err;
      } else {
        console.log("Connected to mySQL database successfully.");
        resolve(con);
      }
    });
  });
}

function dbEndConnection(con) {
  con.end();
  return 1;
}

function log_error_audit(table_name, error) {
  if (error == null) error = "";
  let sql =
    "Insert into " +
    table_name +
    " values (NOW(),'ERROR','CLOSE POSITION','" +
    error.body +
    "')";
  con.query(sql, function(err, sqlData) {
    if (err) {
      console.log(
        "An error occured but could not inserted into " +
          table_name +
          " table with error - " +
          error
      );
    } else {
      console.log(
        "Error happened, written into " + table_name + " table " + error
      );
    }
  });
}

function insertLogTable(con, body) {
  return new Promise((resolve, reject) => {
    //Insert action into logs DB
    let sql =
      "Insert into auditLogs values ('" +
      body.eventDate +
      "','" +
      body.eventStatus +
      "','" +
      body.eventAction +
      "','" +
      body.eventDescription +
      "')";
    con.query(sql, function(err, sqlData) {
      if (err) {
        log_error_audit("tradingHistory", err);
        reject();
      } else {
        console.log("SQL SUCCESS - INSERT CLOSE DEAL INTO auditLogs DB");
        resolve();
      }
    });
  });
}

async function insertTradingHistoryTable(con, body) {
  return new Promise((resolve, reject) => {
    //Insert into trading history
    sql =
      "Insert into tradingHistory values ('" +
      body.eventDate +
      "','" +
      body.eventAction +
      "','" +
      body.dealID +
      "','" +
      body.dealReference +
      "','" +
      body.epic +
      "'," +
      body.level +
      "," +
      body.size +
      ",'" +
      body.direction +
      "'," +
      body.profit +
      ", " +
      body.targetPrice +
      ");";

    con.query(sql, function(err, sqlData) {
      if (err) {
        log_error_audit("tradingHistory", err);
        reject(err);
      } else {
        console.log("SQL SUCCESS - INSERT CLOSE DEAL INTO tradingHistory DB");
        resolve();
      }
    });
  });
}

//Export functions we want used elsewhere
module.exports.dbConnect = dbConnect;
module.exports.dbEndConnection = dbEndConnection;
module.exports.insertLogTable = insertLogTable;
module.exports.insertTradingHistoryTable = insertTradingHistoryTable;
