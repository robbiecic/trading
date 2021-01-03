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
    // queue = await getMessages();
    queue = event["Records"];
    console.log(queue);
    queue_length = queue.length;
    con = await dbConnect();
    //For each queue item
    for (let i = 0; i < queue_length; i++) {
      //Define queue variables
      let messageId = queue[i].MessageId;
      let receiptHandle = queue[i].ReceiptHandle;
      let body = JSON.parse(queue[i].body);
      let instruction = body.actionType;
      let direction = body.direction;
      let pair = body.pair;
      let originalOrderDate = body.orderDateUTC;
      let priceTarget = body.priceTarget;
      // Remove message from queue once we've read in the data
      // Regardless if the order is placed or not, we only want to try once
      deleteMessages(messageId, receiptHandle);
      try {
        if (instruction === "Close") {
          //Need to loop through each position then place order accordingly
          positions = await havePositions();
          for (let i = 0; i < positions.length; i++) {
            let igPosition = positions[i].position.direction;
            if (
              (direction === "Short" && igPosition === "SELL") ||
              (direction === "Long" && igPosition === "BUY")
            ) {
              await placeOrder(
                con,
                pair,
                "Close",
                positions[i],
                priceTarget,
                originalOrderDate
              );
            }
          }
        } else if (instruction === "Open") {
          await placeOrder(
            con,
            pair,
            "Open",
            direction,
            priceTarget,
            originalOrderDate
          );
        }
      } catch (error) {
        console.log(error);
      }
    }
  } catch (error) {
    console.log(error);
    return error;
  }

  return "success";
};
