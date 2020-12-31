var mysql = require("mysql");
var config = require("./config/config.json");

function dbConnect(environment) {
  return new Promise((resolve, reject) => {
    let host = config[environment].dbName;
    let user = process.env.DB_USER;
    let password = process.env.DB_PASSWORD;
    let schema = config[environment].schema;
    let port = config[environment].port;

    //Create connection to mySQL
    var con = mysql.createConnection({
      host: host,
      user: user,
      password: password,
      database: schema,
      port: port
    });
    //Connect to DB
    con.connect(function(err) {
      if (err) reject(err);
      else {
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
        var msg = "SQL ERROR INSERTING INTO LOG TABLE " + err;
        console.log(msg);
        reject(msg);
      } else {
        var msg = "SQL SUCCESS - INSERT CLOSE DEAL INTO LOG DB";
        console.log(msg);
        resolve(msg);
      }
    });
  });
}

function insertTradingHistoryTable(con, body) {
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
        var msg = "SQL ERROR INSERTING INTO tradingHistory TABLE " + err;
        console.log(msg);
        reject(msg);
      } else {
        var msg = "SQL SUCCESS - INSERT CLOSE DEAL INTO LOG DB";
        console.log(msg);
        resolve(msg);
      }
    });
  });
}

//Export functions we want used elsewhere
module.exports.dbConnect = dbConnect;
module.exports.dbEndConnection = dbEndConnection;
module.exports.insertLogTable = insertLogTable;
module.exports.insertTradingHistoryTable = insertTradingHistoryTable;
