var IG = require("./node-ig-api");
var { insertLogTable, insertTradingHistoryTable } = require("./dbConnect.js");

// Close position
async function closePosition(position, con) {
  return new Promise(async (resolve, reject) => {
    try {
      let dealID = position.position.dealId;
      close_receipt = await IG.closePosition(dealID);
      console.log("Closed position - ", dealID);
    } catch (error) {
      reject("Error trying to close position with error - " + error);
    }
    if (close_receipt.confirms.dealStatus === "ACCEPTED") {
      //Insert into tradingHistory DB first
      let tradingBody = returnTradingBody(
        close_receipt.confirms,
        "CLOSE",
        close_receipt.confirms.profit,
        priceTarget,
        close_receipt.positions.dealReference
      );

      //Insert action into logs DB
      let logBody = returnLogBody(
        "SUCCESS",
        "CLOSE POSITION",
        close_receipt.confirms.date,
        close_receipt.positions.dealReference,
        close_receipt.confirms.dealId
      );
      await log_into_trading_history(con, tradingBody, logBody);
      resolve();
    } else {
      reject("Position could not be closed.");
    }
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

// Get data ready to insert into SQL
function returnTradingBody(
  data,
  eventAction,
  profit,
  priceTarget,
  dealReference
) {
  return {
    eventDate: data.date,
    eventAction: eventAction,
    dealID: data.dealId,
    dealReference: dealReference,
    epic: data.epic,
    level: data.level,
    size: data.size,
    direction: data.direction,
    profit: profit, //0 when opening orders
    targetPrice: priceTarget
  };
}

// Get data ready to insert into SQL Audit
function returnLogBody(
  eventStatus,
  eventAction,
  eventDate,
  dealReference,
  dealId
) {
  return {
    eventStatus: eventStatus,
    eventAction: eventAction,
    eventDate: eventDate,
    eventDescription:
      "dealReference = " + dealReference + " | dealID = " + dealId
  };
}

// Open position
async function openOrder(position, con, priceTarget, pair) {
  return new Promise(async (resolve, reject) => {
    try {
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
      response = await IG.deal(ticket);
      let tradingBody = returnTradingBody(
        response.confirms,
        "OPEN",
        0,
        priceTarget,
        response.confirms.dealReference
      );
      //Insert action into logs DB
      let logBody = returnLogBody(
        "SUCCESS",
        "OPEN POSITION",
        response.confirms.date,
        response.confirms.dealReference,
        response.confirms.dealId
      );
      await log_into_trading_history(con, tradingBody, logBody);
      resolve();
    } catch (error) {
      reject("Error opening trade - ", error);
    }
  });
}

//placeOrder
async function placeOrder(con, pair, action, position, priceTarget) {
  return new Promise((resolve, reject) => {
    IG.login(false).then(async () => {
      try {
        if (action === "Close") {
          await closePosition(position, con);
          resolve();
        } else if (action === "Open") {
          await openOrder(position, con, priceTarget, pair);
          resolve();
        } else {
          reject("Not Open nor Close");
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports.placeOrder = placeOrder;
