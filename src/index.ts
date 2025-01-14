import axios from "axios";
import crypto from "crypto";
import { CreateSftpUserDto } from "./types";

const SFTPCLOUD_API_URL = process.env.SFTPCLOUD_API_URL!;
const SFTPCLOUD_API_KEY = process.env.SFTPCLOUD_API_KEY!;
const SFTP_SERVER_ID = process.env.SFTP_SERVER_ID!;

export const createSftpUser = async (event: CreateSftpUserDto) => {
  try {
    console.log("Creating SFTP user", event);

    // Generate random username
    const username = `user-${crypto.randomBytes(4).toString("hex")}`;
    const password = crypto.randomBytes(12).toString("hex"); // Generate password

    // Create the user
    const createResponse = await axios.post(
      `${SFTPCLOUD_API_URL}/sftp-instances/${SFTP_SERVER_ID}/sftp-users`,
      {
        username,
      },
      {
        headers: {
          Authorization: `Bearer ${SFTPCLOUD_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const createdUser = createResponse.data;
    console.log("User created:", createdUser);

    // Update the user password
    const updateResponse = await axios.put(
      `${SFTPCLOUD_API_URL}/sftp-users/${createdUser.uuid}`,
      {
        password,
      },
      {
        headers: {
          Authorization: `Bearer ${SFTPCLOUD_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("User password updated:", updateResponse.data);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "SFTP user created successfully",
        user: {
          username,
          password,
          host: "us-east-1.sftpcloud.io", // Replace with your actual host
        },
      }),
    };
  } catch (error: any) {
    console.error("Error creating SFTP user:", error);

    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        message: "Failed to create SFTP user",
        error: error.response?.data || error.message,
      }),
    };
  }
};
