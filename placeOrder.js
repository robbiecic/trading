var IG = require("./node-ig-api");
var { insertLogTable, insertTradingHistoryTable } = require("./dbConnect.js");

//placeOrder
async function placeOrder(
  con,
  pair,
  action,
  position,
  priceTarget,
  originalOrderDate
) {
  return new Promise((resolve, reject) => {
    IG.login(false).then(async () => {
      try {
        if (action === "Close") {
          closeReceipt = await closePosition(position);
          var { tradingBody, logBody } = await getOrderDetails(
            "CLOSE",
            closeReceipt,
            priceTarget,
            originalOrderDate,
            pair
          );
          await log_into_trading_history(con, tradingBody, logBody);
          resolve();
        } else if (action === "Open") {
          openReceipt = await openOrder(position, pair);
          var { tradingBody, logBody } = await getOrderDetails(
            "OPEN",
            openReceipt,
            priceTarget,
            originalOrderDate,
            pair
          );
          await log_into_trading_history(con, tradingBody, logBody);
          resolve();
        } else {
          reject("The trade actions was neither an Open nor a Close");
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Close position
async function closePosition(position) {
  return new Promise(async (resolve, reject) => {
    try {
      let dealID = position.position.dealId;
      close_receipt = await IG.closePosition(dealID);
      console.log("Closed position - ", dealID);
    } catch (error) {
      reject("Error trying to close position with error - " + error);
    }
    if (close_receipt.confirms.dealStatus === "ACCEPTED") {
      console.log("Successfully placed a CLOSE order");
      resolve(close_receipt);
    } else {
      console.log("Close order was not accepted by IG");
      reject("Position could not be closed.");
    }
  });
}

// Open position
async function openOrder(position, pair) {
  return new Promise(async (resolve, reject) => {
    try {
      direction = get_ig_direction(position);
      let ticket = {
        currencyCode: "USD",
        direction: direction,
        epic: get_ig_epic(pair),
        expiry: "-",
        size: process.env.IG_UNITS || 1,
        forceOpen: true,
        orderType: "MARKET",
        level: null,
        limitDistance: null,
        limitLevel: null,
        stopDistance: null,
        stopLevel: null,
        guaranteedStop: false,
        timeInForce: "FILL_OR_KILL",
        //trailingStop: null,
        //trailingStopIncrement: null
      };
      console.log("Order ticket - ", ticket);
      response = await IG.deal(ticket);
      console.log("Successfully placed an OPEN order for ", pair);
      resolve(response);
    } catch (error) {
      reject("Error opening trade - ", error);
    }
  });
}

// Log the closing of an order
async function getOrderDetails(
  direction,
  order,
  priceTarget,
  originalOrderDate,
  pair
) {
  return new Promise((resolve, reject) => {
    try {
      let dealReference =
        direction == "CLOSE"
          ? order.positions.dealReference
          : order.confirms.dealReference;
      let profit = direction == "CLOSE" ? order.confirms.profit : 0.0;
      //Insert into tradingHistory DB first
      let tradingBody = returnTradingBody(
        order.confirms,
        direction,
        profit,
        priceTarget,
        dealReference,
        originalOrderDate,
        pair
      );
      //Insert action into logs DB
      let logBody = returnLogBody(
        "SUCCESS",
        direction + " POSITION",
        order.confirms.date,
        dealReference,
        order.confirms.dealId,
        originalOrderDate,
        pair
      );
      resolve({ tradingBody: tradingBody, logBody: logBody });
    } catch (e) {
      reject(e);
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
          .catch((e) => reject(e));
      })
      .catch((e) => {
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
  dealReference,
  originalOrderDate,
  pair
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
    targetPrice: priceTarget,
    originalOrderDateUTC: originalOrderDate,
    pair: pair,
  };
}

// Get data ready to insert into SQL Audit
function returnLogBody(
  eventStatus,
  eventAction,
  eventDate,
  dealReference,
  dealId,
  originalOrderDate,
  pair
) {
  return {
    eventStatus: eventStatus,
    eventAction: eventAction,
    eventDate: eventDate,
    eventDescription:
      "dealReference = " + dealReference + " | dealID = " + dealId,
    originalOrderDateUTC: originalOrderDate,
    pair: pair,
  };
}

module.exports.placeOrder = placeOrder;
