# User Management Application

## Overview

This application provides user management capabilities through an API built with AWS Lambda, API Gateway, and DynamoDB. It supports operations such as creating, retrieving, updating, and deleting users, as well as handling user profile pictures and likes.

## Technologies

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: AWS Lambda functions
- **Database**: AWS DynamoDB
- **API Management**: AWS API Gateway
- **File Storage**: AWS S3
- **Notifications Queue**: AWS SQS

## Getting Started

### Prerequisites

- AWS Account
- AWS CLI configured with your credentials
- Node.js and npm installed
- AWS CDK installed

### Setup

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Deploy the Application**

   Ensure you have AWS CDK installed. Navigate to the project directory and run:

   ```bash
   npm install -g aws-cdk
   ```

   Deploy the infrastructure using CDK:

   ```bash
   cdk deploy
   ```

   This will deploy the necessary Lambda functions, API Gateway, DynamoDB tables, S3 bucket, and SQS queue.

3. **Configure API URL**

   After deployment, find the API URL in the CloudFormation outputs or AWS API Gateway console. Update the `API_BASE_URL` in `index.html` with the provided URL.

### Usage

1. **View User**

   - **Endpoint**: `GET /{userId}`
   - **Description**: Retrieve user details.
   - **Example**: `GET /12345` will retrieve details for user with ID `12345`.

2. **Upload Profile Picture**

   - **Endpoint**: `PUT /{userId}/updateProfilePicture`
   - **Description**: Upload a profile picture for a user.
   - **Parameters**: `userId` (path parameter), `image file` (in the request body).

3. **View All Users**

   - **Endpoint**: `GET /users`
   - **Description**: List all user IDs stored in DynamoDB.

4. **Create User**

   - **Endpoint**: `POST /`
   - **Description**: Add a new user.
   - **Request Body**: JSON object containing user details (e.g., name, email, age, address).

5. **Delete User**

   - **Endpoint**: `DELETE /{userId}`
   - **Description**: Remove a user based on `userId`.
   - **Example**: `DELETE /12345` will delete the user with ID `12345`.

6. **Like Profile Picture**

   - **Endpoint**: `POST /like`
   - **Description**: Like a user's profile picture.
   - **Request Body**: JSON object containing `profilePictureUserId` and `likerUserId`.

7. **View Likes for Profile Picture**

   - **Endpoint**: `GET /{userId}/likes`
   - **Description**: Retrieve likes for a specific user's profile picture.

8. **Check Messages**

   - **Endpoint**: `GET /{userId}/messages`
   - **Description**: Get notifications of like and unlike of profile pictures.

## Lambda Functions

- **Create User**: Handles `POST` requests to create a new user.
- **Get User**: Handles `GET` requests to retrieve user details.
- **Update User Profile Picture**: Handles `PUT` requests to upload a profile picture.
- **Delete User**: Handles `DELETE` requests to remove a user.
- **Get All Users**: Handles `GET` requests to list all user IDs.
- **Like Profile Picture**: Handles `POST` requests to like a profile picture.
- **Get Likes for Profile Picture**: Handles `GET` requests to retrieve likes for a profile picture.
- **Check Messages**: Handles `GET` requests to check messages from the SQS queue.
- **Serve Static Content**: Serves static content from the root.

## API Gateway Configuration

The API Gateway is configured with the following endpoints:

- `POST /`: Create a new user.
- `GET /{userId}`: Retrieve user details.
- `DELETE /{userId}`: Delete a user.
- `PUT /{userId}/updateProfilePicture`: Update the profile picture for a user.
- `GET /users`: List all user IDs.
- `POST /like`: Like a profile picture.
- `GET /{userId}/likes`: Retrieve likes for a profile picture.
- `GET /{userId}/messages`: Check messages related to likes.
- `GET /`: Serve static content (e.g., `index.html`).

### DynamoDB Tables

- **Users Table**:
  - **Table Name**: `stav-shlomit-users-table`
  - **Primary Key**: `userId` (string)

- **Likes Table**:
  - **Table Name**: `stav-shlomit-likes-table`
  - **Primary Key**: `profilePictureUserId` (string)
  - **Sort Key**: `likerUserId` (string)

### S3 Bucket

- **Bucket Name**: `stav-shlomit-profile-pictures`
- **Purpose**: Stores user profile pictures.

### SQS Queue

- **Queue Name**: `stav-shlomit-likes-queue`
- **Purpose**: Handles notifications of likes and unlikes of profile pictures.

## Notes

- Ensure that your Lambda functions have the necessary permissions to access DynamoDB and S3.
- You may need to adjust IAM roles and policies based on your application's requirements.
- The `index.html` file is your frontend interface, where you interact with the API through the provided tabs.