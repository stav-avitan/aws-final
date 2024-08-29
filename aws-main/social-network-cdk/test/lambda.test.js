const AWSMock = require('aws-sdk-mock');
const { v4: uuidv4 } = require('uuid');
const createUser = require('../../lambda/createUser/createUser');
const getUser = require('../../lambda/getUser/getUser');
const deleteUser = require('../../lambda/deleteUser/deleteUser');

describe('User API Integration Tests', () => {
  let userId; // Variable to store the created user's ID
  const nonExistentUserId = 'non-existent-id'; // A constant for testing non-existent users

  beforeAll(() => {
    // Mock DynamoDB put operation
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
      userId = uuidv4(); // Generate a new UUID for the user
      callback(null, {});
    });

    // Mock DynamoDB get operation
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
      if (params.Key.userId === userId) {
        callback(null, { Item: { userId, name: 'John Doe' } });
      } else {
        callback(null, {}); // Simulate non-existent user by returning an empty object
      }
    });

    // Mock DynamoDB delete operation
    AWSMock.mock('DynamoDB.DocumentClient', 'delete', (params, callback) => {
      if (params.Key.userId === userId) {
        callback(null, {});
      } else {
        callback(null, {}); // Simulate non-existent user delete by returning an empty object
      }
    });
  });

  afterAll(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
  });

  it('should create a user and return 201 status with userId', async () => {
    const event = {
      body: JSON.stringify({ name: 'John Doe' }),
    };

    const result = await createUser.handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toHaveProperty('userId');
    expect(body.name).toBe('John Doe');

    // Save the userId for subsequent tests
    userId = body.userId;
  });

  it('should return 200 and the user data if userId exists', async () => {
    const event = {
      pathParameters: {
        userId,
      },
    };

    const result = await getUser.handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe(userId);
    expect(body.name).toBe('John Doe');
  });

  it('should return 404 if the user does not exist', async () => {
    const event = {
      pathParameters: {
        userId: nonExistentUserId,
      },
    };

    const result = await getUser.handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('User not found');
  });

  it('should delete the user and return 200 status', async () => {
    const event = {
      pathParameters: {
        userId,
      },
    };

    const result = await deleteUser.handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('User deleted successfully');
    expect(body.userId).toBe(userId);
  });

  it('should return 404 when trying to delete a non-existent user', async () => {
    const event = {
      pathParameters: {
        userId: nonExistentUserId,
      },
    };

    const result = await deleteUser.handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('User not found');
  });
});
