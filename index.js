require("dotenv").config();
if (
  process.env.ENVIRONMENT !== "PRODUCTION" ||
  process.env.ENVIRONMENT !== "STAGING"
) {
  require("dotenv").config();
}

var { getMessages, deleteMessages } = require("./getMessages.js");
var { havePositions } = require("./havePositions.js");
var { placeOrder } = require("./placeOrder.js");
var { dbConnect } = require("./dbConnect.js");

exports.handler = async event => {
  try {
    con = await dbConnect();
    queue = await getMessages();
    queue_length = queue.length;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }

  //For each queue item
  for (let i = 0; i < queue_length; i++) {
    //Define queue variables
    let messageId = queue[i].MessageId;
    let receiptHandle = queue[i].ReceiptHandle;
    let body = JSON.parse(queue[i].Body);
    let instruction = body.actionType;
    let direction = body.direction;
    let pair = body.pair;
    let priceTarget = body.priceTarget;

    //Do we have open positions that need to be closed?
    if (instruction === "Close") {
      positions = await havePositions();
      //Need to loop through each position then place order accordingly
      for (let i = 0; i < positions.length; i++) {
        let igPosition = positions[i].position.direction;
        if (
          (direction === "Short" && igPosition === "SELL") ||
          (direction === "Long" && igPosition === "BUY")
        ) {
          try {
            orderReiept = await placeOrder(
              con,
              pair,
              "Close",
              positions[i],
              priceTarget
            );
          } catch (error) {
            console.log(error);
            process.exit(1);
          }
        }
      }
    } else if (instruction === "Open") {
      try {
        orderReiept = await placeOrder(
          con,
          pair,
          "Open",
          direction,
          priceTarget
        );
      } catch (error) {
        console.log(error);
        process.exit(1);
      }
    } else {
      process.exit(1); // Just end if the event doesn't match
    }
  }

  return "Finished with trading lambda";
};
