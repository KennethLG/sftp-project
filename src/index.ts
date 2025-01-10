import AWS from "aws-sdk";
import crypto from "crypto";
import { CreateSftpUserDto } from "./types";

const BUCKET_NAME = process.env.BUCKET_NAME as string;
const SFTP_HOST = process.env.SFTP_HOST as string;

console.log("BUCKET_NAME", BUCKET_NAME);
console.log("SFTP_HOST", SFTP_HOST);

const s3 = new AWS.S3();

type Event = CreateSftpUserDto;

export const createSftpUser = async (event: Event) => {
  try {
    console.log("Creating SFTP user", event);
    let email: string;
    try {
      email = event.email;
    } catch (error) {
      const message = "Invalid request body";
      console.error(message, error);
      throw new Error(message);
    }

    const folderName = email.replace("@", "_at_");
    const folderKey = `${folderName}/`;

    try {
      await s3.headObject({ Bucket: BUCKET_NAME, Key: folderKey }).promise();
    } catch (error: any) {
      console.error(error);
      if (error.code === "NotFound") {
        await s3.putObject({ Bucket: BUCKET_NAME, Key: folderKey }).promise();
      } else {
        throw new Error(`Error checking folder existence: ${error.message}`);
      }
    }

    const username = `user-${crypto.randomBytes(4).toString("hex")}`;
    const password = crypto.randomBytes(8).toString("hex");
    const s3Folder = `${BUCKET_NAME}/${folderKey}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        sftp: {
          host: SFTP_HOST,
          username,
          password,
        },
        s3Folder,
      }),
    };
  } catch (error: any) {
    console.error("Error creating SFTP user", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
