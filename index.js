var { getMessages, deleteMessages } = require("./getMessages.js");
var { havePositions } = require("./havePositions.js");
var { placeOrder } = require("./placeOrder.js");
var { dbConnect } = require("./dbConnect.js");
require("dotenv").config();

if (
  process.env.ENVIRONMENT !== "PRODUCTION" ||
  process.env.ENVIRONMENT !== "STAGING"
) {
  require("dotenv").config();
}

exports.handler = event => {
  //Connect to DB before doing anything
  dbConnect("staging")
    .then(con => {
      //Get messages off the queue
      getMessages()
        .then(queue => {
          //For each queue item
          let queueLength = queue.length;

          for (let i = 0; i < queueLength; i++) {
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
              havePositions()
                .then(positions => {
                  //I need to loop through each position then place order accordingly
                  for (let i = 0; i < positions.length; i++) {
                    /* Only close when:
                      if position direction = BUY and direction = Long (BUY = IG SPEAK WHICH MEANS LONG)
                      if position direction = SELL and direction = short
                      */
                    let holdingPosition = positions[i].position.direction;
                    if (
                      (direction === "Short" && holdingPosition === "SELL") ||
                      (direction === "Long" && holdingPosition === "BUY")
                    ) {
                      placeOrder(con, pair, "Close", positions[i], priceTarget)
                        .then(() => {
                          deleteMessages(messageId, receiptHandle);
                        })
                        .catch(() => {
                          deleteMessages(messageId, receiptHandle);
                          console.log("ERROR PLACING ORDER TO CLOSE");
                        });
                    } else {
                      //We are holding but not wanting to sell the ones we have
                      deleteMessages(messageId, receiptHandle);
                    }
                  }
                })

                .catch(e => {
                  //Don't sell, because we are not holding anything
                  console.log(e);
                  //Delete message
                  deleteMessages(messageId, receiptHandle);
                });
            }
            //Open new stock orders if we have capital
            else if (instruction === "Open") {
              placeOrder(con, pair, "Open", direction, priceTarget)
                .then(() => {
                  deleteMessages(messageId, receiptHandle);
                })
                .catch(() => {
                  console.log("ERROR PLACING ORDER TO CLOSE");
                  deleteMessages(messageId, receiptHandle);
                });
            }
          } //End for Loop
        })
        .catch(e => {
          console.log("No messages in the queue to run", e);
          process.exit(0); //Killing app if there are no messages to run
        });
    })
    .catch(e => {
      console.log("CANT CONNECT TO DB - ", e);
    });

  return "Finished with trading lambda";
};
