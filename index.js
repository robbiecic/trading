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

exports.handler = async () => {
  try {
    con = await dbConnect();
    queue = await getMessages();
    queue_length = queue.length;

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
              await placeOrder(con, pair, "Close", positions[i], priceTarget);
            }
          }
        } else if (instruction === "Open") {
          await placeOrder(con, pair, "Open", direction, priceTarget);
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
