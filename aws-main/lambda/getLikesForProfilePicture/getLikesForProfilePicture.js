const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const LIKES_TABLE = 'stav-shlomit-likes-table';

exports.handler = async (event) => {
    const { userId } = event.pathParameters; // Extract userId from the path parameters

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'userId is required.' }),
        };
    }

    try {
        // Query the LIKES_TABLE for all likes related to the specified profile picture userId
        const params = {
            TableName: LIKES_TABLE,
            KeyConditionExpression: 'profilePictureUserId = :profilePictureUserId',
            ExpressionAttributeValues: {
                ':profilePictureUserId': userId,
            },
        };

        const result = await dynamoDb.query(params).promise();

        if (result.Items.length > 0) {
            // Return the list of user IDs who liked the profile picture
            return {
                statusCode: 200,
                body: JSON.stringify(result.Items.map(item => item.likerUserId)),
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No likes found for this profile picture.' }),
            };
        }
    } catch (error) {
        console.error('Error fetching likes:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};
