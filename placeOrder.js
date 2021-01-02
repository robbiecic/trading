var IG = require("./node-ig-api");
var { insertLogTable, insertTradingHistoryTable } = require("./dbConnect.js");

// Close position
async function closePosition(position, con) {
  return new Promise(async (resolve, reject) => {
    let dealID = position.position.dealId;
    close_receipt = IG.closePosition(dealID);
    console.log("Closed position - ", dealID);
    if (close_receipt.confirms.dealStatus === "ACCEPTED") {
      //Insert into tradingHistory DB first
      let tradingBody = {
        eventDate: close_receipt.confirms.date,
        eventAction: "CLOSE",
        dealID: close_receipt.confirms.dealId,
        dealReference: close_receipt.positions.dealReference,
        epic: close_receipt.confirms.epic,
        level: close_receipt.confirms.level,
        size: close_receipt.confirms.size,
        direction: close_receipt.confirms.direction,
        profit: close_receipt.confirms.profit,
        targetPrice: priceTarget
      };
      //Insert action into logs DB
      let logBody = {
        eventStatus: "SUCCESS",
        eventAction: "CLOSE POSITION",
        eventDate: close_receipt.confirms.date,
        eventDescription:
          "dealReference = " +
          close_receipt.positions.dealReference +
          " | dealID = " +
          close_receipt.confirms.dealId
      };
      await log_into_trading_history(con, tradingBody, logBody);
      resolve();
    } else {
      reject("Position could not be closed.");
    }
  });
}

// For every open and close, log event into DB
async function log_into_trading_history(con, tradingBody, logBody) {
  return new Promise((resolve, reject) => {
    //Insert into trading history then logging table
    insertTradingHistoryTable(con, tradingBody)
      .then(() => {
        insertLogTable(con, logBody)
          .then(() => resolve())
          .catch(e => reject(e));
      })
      .catch(e => {
        reject(e);
      });
  });
}

// Translate our definitions into IG definitions
function get_ig_direction(position) {
  if (position == "Short") {
    return "SELL";
  } else {
    return "BUY";
  }
}

// Get IG EPIC idea
function get_ig_epic(pair) {
  if (pair == "AUD/USD") {
    return "CS.D.AUDUSD.MINI.IP";
  } else if (pair == "EUR/USD") {
    return "CS.D.EURUSD.MINI.IP";
  } else return null;
}

// Open position
async function openOrder(position, con, priceTarget, pair) {
  return new Promise(async (resolve, reject) => {
    direction = get_ig_direction(position);
    let ticket = {
      currencyCode: "USD",
      direction: direction,
      epic: get_ig_epic(pair),
      expiry: "-",
      size: process.env.IG_UNITS,
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
      .then(async response => {
        //console.log(response);
        let tradingBody = {
          eventDate: response.confirms.date,
          eventAction: "OPEN",
          dealID: response.confirms.dealId,
          dealReference: response.confirms.dealReference,
          epic: response.confirms.epic,
          level: response.confirms.level,
          size: response.confirms.size,
          direction: response.confirms.direction,
          profit: 0, //I.e. no profit when opening orders
          targetPrice: priceTarget
        };
        //Insert action into logs DB
        let logBody = {
          eventStatus: "SUCCESS",
          eventAction: "OPEN POSITION",
          eventDate: response.confirms.date,
          eventDescription:
            "dealReference = " +
            response.confirms.dealReference +
            " | dealID = " +
            response.confirms.dealId
        };
        await log_into_trading_history(con, tradingBody, logBody);
        resolve();
      })
      .catch(error => {
        reject("Error opening trade - ", error);
      });
  });
}

//placeOrder
async function placeOrder(con, pair, action, position, priceTarget) {
  return new Promise((resolve, reject) => {
    //IG get place order
    IG.login(false).then(async () => {
      if (action === "Close") {
        try {
          await closePosition(position, con);
          resolve();
        } catch (error) {
          reject(error);
        }
      } else if (action === "Open") {
        try {
          await openOrder(position, con, priceTarget, pair);
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        reject("Not Open nor Close");
      }
    });
  });
}

module.exports.placeOrder = placeOrder;
