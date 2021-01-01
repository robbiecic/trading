var IG = require("./node-ig-api");
var { insertLogTable, insertTradingHistoryTable } = require("./dbConnect.js");

//placeOrder
async function placeOrder(con, pair, action, position, priceTarget) {
  return new Promise((resolve, reject) => {
    //IG get place order
    IG.login(false)
      .then(() => {
        if (action === "Close") {
          //Get position to sell - Note this only works for a single ticker at this stage
          let dealID = position.position.dealId;
          //Call API to close Position
          IG.closePosition(dealID)
            .then(a => {
              console.log("Closed position - ", dealID);
              let dealStatus = a.confirms.dealStatus;
              if (dealStatus === "ACCEPTED") {
                let dealReference = a.positions.dealReference;
                let dealIdNew = a.confirms.dealId;
                let dateStamp = a.confirms.date;
                let epic = a.confirms.epic;
                let level = a.confirms.level;
                let size = a.confirms.size;
                let direction = a.confirms.direction;
                let profit = a.confirms.profit;
                let description =
                  "dealReference = " +
                  dealReference +
                  " | dealID = " +
                  dealIdNew;

                //Insert into tradingHistory DB first
                let tradingBody = {
                  eventDate: dateStamp,
                  eventAction: "CLOSE",
                  dealID: dealIdNew,
                  dealReference: dealReference,
                  epic: epic,
                  level: level,
                  size: size,
                  direction: direction,
                  profit: profit,
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

                //resolve("SUCCESSFULLY CLOSED POSITION");
              }
            })
            .catch(e => {
              //console.log("e", e);
              //Insert action into DB
              let sql =
                "Insert into auditLogs values (NOW(),'ERROR','CLOSE POSITION','" +
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
        } else if (action === "Open") {
          let direction = "";
          if (position === "Short") {
            direction = "SELL";
          } else {
            direction = "BUY";
          }
          let ticket = {
            currencyCode: "USD",
            direction: direction,
            epic: "CS.D.AUDUSD.MINI.IP", //Hard code epic for AUD/USD for now
            expiry: "-",
            size: "2", //20,000 AUD per point, hard coded size to $20,000 for now which is 2 points (Capital required ~$2k)
            forceOpen: true,
            orderType: "MARKET",
            level: null,
            limitDistance: null,
            limitLevel: null,
            stopDistance: null,
            stopLevel: null,
            guaranteedStop: false,
            timeInForce: "FILL_OR_KILL"
            //trailingStop: null,
            //trailingStopIncrement: null
          };
          IG.deal(ticket)
            .then(response => {
              //console.log(response);
              //Insert into trading history TABLE
              let dateStamp = response.confirms.date;
              let dealIdNew = response.confirms.dealId;
              let dealReference = response.confirms.dealReference;
              let epic = response.confirms.epic;
              let level = response.confirms.level;
              let size = response.confirms.size;
              let direction = response.confirms.direction;
              let profit = 0; //I.e. no profit when opening orders

              sql =
                "Insert into tradingHistory values ('" +
                dateStamp +
                "','OPEN','" +
                dealIdNew +
                "','" +
                dealReference +
                "','" +
                epic +
                "'," +
                level +
                "," +
                size +
                ",'" +
                direction +
                "'," +
                profit +
                ", " +
                priceTarget +
                ");";

              con.query(sql, function(err, sqlData) {
                if (err) {
                  var msg =
                    "SQL ERROR INSERTING INTO tradingHistory TABLE " + err;
                  console.log(msg);
                  resolve("ORDER PLACED");
                } else {
                  resolve("SQL SUCCESS - INSERT OPEN DEAL INTO tradingHistory");
                }
              });
            })
            .catch(error => console.log(error));
        }
      })
      .catch(e => {
        let returnValue = "ERROR CONNECTING TO IG - " + JSON.stringify(e);
        reject(returnValue);
      });
  });
}

module.exports.placeOrder = placeOrder;
