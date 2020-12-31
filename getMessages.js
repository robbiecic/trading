var AWS = require("aws-sdk");
var config = require("./config/config.json");

// Set the region
AWS.config.update({
  region: config["aws"].region,
  accessKeyId: config["aws"].accessKeyId,
  secretAccessKey: config["aws"].secretAccessKey
});

//getMessages
function getMessages() {
  return new Promise((resolve, reject) => {
    var sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

    //In bound queue
    var params = {
      QueueUrl: "https://sqs.us-east-2.amazonaws.com/123188106252/orders",
      MaxNumberOfMessages: "10"
    };

    sqs.receiveMessage(params, function(err, data) {
      if (err) {
        reject(err, err.stack);
      } else {
        //Get the data from queue
        resolve(data.Messages);
      }
    });
  });
}

//deleteMessages
function deleteMessages(messageId, receiptHandle) {
  var sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
  var params = {
    Entries: [
      {
        Id: messageId,
        ReceiptHandle: receiptHandle
      }
    ],
    QueueUrl: "https://sqs.us-east-2.amazonaws.com/123188106252/orders"
  };
  sqs.deleteMessageBatch(params, function(err, data) {
    if (err) console.log("SQS Message delete failed", err, err.stack);
    // an error occurred
    else console.log("SQS Messaged delete successful", data); // successful response
  });
}

module.exports.getMessages = getMessages;
module.exports.deleteMessages = deleteMessages;
