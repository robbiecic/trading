var IG = require("./node-ig-api");
var { insertLogTable, insertTradingHistoryTable } = require("./dbConnect.js");

//placeOrder
function addStopLimit(con, position, priceTarget) {
  return new Promise((resolve, reject) => {
    //IG get place order
    IG.login(false)
      .then(() => {
        //Get deal to update
        //let dealID = position.position.dealId;
        let dealID = position;
        //Set Stop Limit as Price Target
        let ticket = { limitLevel: priceTarget };
        //Call API to edit Position
        IG.editPosition(position, ticket)
          .then(a => {
            if (a.dealStatus === "REJECTED") {
              console.log("Adding Limit Level Failed for ", dealID);
              reject("error");
            } else {
              console.log("Updated position - ", dealID);
              let description =
                "dealReference = " +
                a.dealReference +
                " | dealID = " +
                dealIdNew;

              //Insert into tradingHistory DB first
              let tradingBody = {
                eventDate: "",
                eventAction: "UPDATE",
                dealID: dealID,
                dealReference: a.dealReference,
                epic: a.epic,
                level: priceTarget,
                size: a.size,
                direction: a.direction,
                profit: 0,
                targetPrice: priceTarget
              };

              //Insert action into logs DB
              let logBody = {
                eventStatus: "SUCCESS",
                eventAction: "CLOSE POSITION",
                eventDate: dateStamp,
                eventDescription: description
              };

              //Insert into trading history then logging table
              insertTradingHistoryTable(con, tradingBody)
                .then(() => {
                  insertLogTable(con, logBody)
                    .then(() => resolve("Finished inserting into DB"))
                    .catch(e => reject(e));
                })
                .catch(e => reject(e));
            }
          })
          .catch(e => {
            console.log("e", e);
            //Insert action into DB
            let sql =
              "Insert into auditLogs values (NOW(),'ERROR','UPDATE POSITION','" +
              e.body.errorCode +
              "')";
            con.query(sql, function(err, sqlData) {
              if (err) {
                var msg = "SQL ERROR INSERTING INTO LOG TABLE " + err;
                console.log(msg);
                reject(msg);
              } else {
                resolve("SQL SUCCESS - INSERT CLOSE DEAL INTO LOG DB");
              }
            });
          });
      })
      .catch(e => {
        let returnValue = "ERROR CONNECTING TO IG - " + e;
        reject(returnValue);
      });
  });
}

module.exports.addStopLimit = addStopLimit;
