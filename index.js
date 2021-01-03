if (
  process.env.ENVIRONMENT !== "PRODUCTION" ||
  process.env.ENVIRONMENT !== "STAGING"
) {
  require("dotenv").config();
}

var { havePositions } = require("./havePositions.js");
var { placeOrder } = require("./placeOrder.js");
var { dbConnect } = require("./dbConnect.js");

exports.handler = async event => {
  try {
    queue = event["Records"]; //Read in event which will contain SQS details
    queue_length = queue.length;
    con = await dbConnect();
    //For each queue item
    for (let i = 0; i < queue_length; i++) {
      //Define queue variables
      let body = JSON.parse(queue[i].body);
      let instruction = body.actionType;
      let direction = body.direction;
      let pair = body.pair;
      let originalOrderDate = body.orderDateUTC;
      let priceTarget = body.priceTarget;
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
