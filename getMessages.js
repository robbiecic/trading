var AWS = require("aws-sdk");

const ordersQueue =
	"https://sqs.ap-southeast-2.amazonaws.com/023075176548/orders";

// Set the region
AWS.config.update({
	region: process.env.AWS_REGION_NAME,
	accessKeyId: process.env.ROBERT_AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.ROBERT_AWS_SECRET_ACCESS_KEY
});

//getMessages
async function getMessages() {
	return new Promise((resolve, reject) => {
		var sqs = new AWS.SQS({apiVersion: "2012-11-05"});

		//In bound queue
		var params = {
			QueueUrl: ordersQueue,
			MaxNumberOfMessages: "10"
		};

		sqs.receiveMessage(params, function(err, data) {
			if (err) {
				// Reject with zero records
				reject(0);
			} else {
				//Get the data from queue
				resolve(data.Messages);
			}
		});
	});
}

//deleteMessages
function deleteMessages(messageId, receiptHandle) {
	var sqs = new AWS.SQS({apiVersion: "2012-11-05"});
	var params = {
		Entries: [
			{
				Id: messageId,
				ReceiptHandle: receiptHandle
			}
		],
		QueueUrl: ordersQueue
	};
	sqs.deleteMessageBatch(params, function(err, data) {
		if (err) console.log("SQS Message delete failed", err, err.stack);
		// an error occurred
		else console.log("SQS Messaged delete successful", data); // successful response
	});
}

module.exports.getMessages = getMessages;
module.exports.deleteMessages = deleteMessages;
