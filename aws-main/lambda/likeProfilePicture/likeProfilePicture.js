const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

const USERS_TABLE = process.env.USERS_TABLE_NAME || 'stav-shlomit-users-table';
const LIKES_TABLE = process.env.LIKES_TABLE_NAME || 'stav-shlomit-likes-table';
const LIKES_QUEUE_URL = process.env.LIKES_QUEUE_URL;

exports.handler = async (event) => {
    const { userId, profilePictureUserId } = JSON.parse(event.body);
    
    if (!userId || !profilePictureUserId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'userId and profilePictureUserId are required.' }),
        };
    }

    try {
        // Check if the user has a profile picture
        const user = await dynamoDb.get({
            TableName: USERS_TABLE,
            Key: { userId: profilePictureUserId }
        }).promise();

        if (!user.Item || !user.Item.profilePictureUrl) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'User does not have a profile picture.' }),
            };
        }

        // Check if the like already exists
        const likeCheck = await dynamoDb.get({
            TableName: LIKES_TABLE,
            Key: { profilePictureUserId, likerUserId: userId }
        }).promise();

        let message;
        if (likeCheck.Item) {
            // If like exists, remove it
            await dynamoDb.delete({
                TableName: LIKES_TABLE,
                Key: { profilePictureUserId, likerUserId: userId }
            }).promise();

            message = 'Like removed successfully.';
        } else {
            // If like does not exist, add it
            await dynamoDb.put({
                TableName: LIKES_TABLE,
                Item: { profilePictureUserId, likerUserId: userId },
            }).promise();

            message = 'Like added successfully.';
        }

        // Send a message to the SQS queue
        await sqs.sendMessage({
            QueueUrl: LIKES_QUEUE_URL,
            MessageBody: JSON.stringify({
                userId,
                profilePictureUserId,
                action: likeCheck.Item ? 'unliked' : 'liked'
            }),
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message }),
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
