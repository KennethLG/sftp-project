import AWS from "aws-sdk";
import axios from "axios";
import crypto from "crypto";

const S3 = new AWS.S3();
const SFTPCLOUD_API_URL = "https://api.sftpcloud.io/v1";
const SFTPCLOUD_API_KEY = process.env.SFTPCLOUD_API_KEY!;
const SFTP_SERVER_ID = process.env.SFTP_SERVER_ID!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

export const handler = async (event: any) => {
  try {
    const email = event.email;
    if (!email) {
      throw new Error("Email is required.");
    }

    // Generate folder name in S3 based on email
    const folderName = email.replace("@", "_at_");
    const folderKey = `${folderName}/`;

    // Check if the folder exists in S3
    try {
      await S3.headObject({ Bucket: BUCKET_NAME, Key: folderKey }).promise();
      console.log("Folder already exists in S3:", folderKey);
    } catch (error: any) {
      if (error.code === "NotFound") {
        // Create the folder in S3 if it doesn't exist
        console.log("Creating new folder in S3:", folderKey);
        await S3.putObject({
          Bucket: BUCKET_NAME,
          Key: folderKey,
        }).promise();
      } else {
        throw new Error(`Error checking folder in S3: ${error.message}`);
      }
    }

    // Generate random username and password
    const username = `user-${crypto.randomBytes(4).toString("hex")}`;
    const password = crypto.randomBytes(12).toString("hex");

    // Create a new SFTP user linked to the unique folder
    const response = await axios.post(
      `${SFTPCLOUD_API_URL}/sftp-instances/${SFTP_SERVER_ID}/sftp-users`,
      {
        username,
        password,
        root_directory: folderKey, // Restrict access to this folder
      },
      {
        headers: {
          Authorization: `Bearer ${SFTPCLOUD_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("SFTP user created successfully:", response.data);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "SFTP user created successfully",
        sftp: {
          host: "us-east-1.sftpcloud.io", // Update with actual SFTP host if different
          username,
          password,
        },
        s3Folder: `${BUCKET_NAME}/${folderKey}`,
      }),
    };
  } catch (error: any) {
    console.error("Error handling request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
