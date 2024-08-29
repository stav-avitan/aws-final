const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const sqs = new AWS.SQS();

const QUEUE_URL = process.env.LIKES_QUEUE_URL;

exports.handler = async (event) => {
    const userId = event.pathParameters.userId;

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'userId is required.' }),
        };
    }

    try {
        // Receive messages from the SQS queue
        const params = {
            QueueUrl: QUEUE_URL,
            MaxNumberOfMessages: 10,  // Max is 10
            VisibilityTimeout: 30,    // Time to keep message invisible for other consumers
            WaitTimeSeconds: 0        // Wait time for receiving messages, set to 0 for immediate response
        };

        const data = await sqs.receiveMessage(params).promise();

        if (!data.Messages || data.Messages.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No messages found in the queue.' }),
            };
        }

        // Filter messages by userId
        const filteredMessages = data.Messages.filter(message => {
            const body = JSON.parse(message.Body);
            return body.profilePictureUserId === userId;
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `${filteredMessages.length} message(s) found for userId ${userId}.`,
                messages: filteredMessages.map(msg => JSON.parse(msg.Body)),
            }),
        };

    } catch (error) {
        console.error('Error retrieving messages from SQS:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
