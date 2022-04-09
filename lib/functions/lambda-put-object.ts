import { PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

import { APIGatewayProxyHandler } from "aws-lambda";
import { nanoid } from "nanoid";

let { BUCKET_NAME } = process.env;

let client = new S3({});

let handler: APIGatewayProxyHandler = async (event, context) => {
  console.log(JSON.stringify(event));
  console.log(JSON.stringify(context));
  try {
    let new_file = {
      id: nanoid(),
      name: uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
      }),
    };
    let commandPutObject = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `new_files/${new_file.id}`,
      Body: JSON.stringify(new_file),
    });
    await client.send(commandPutObject);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: true, payload: new_file }),
    };
  } catch (err) {
    console.error(err);
    let { message } = err as Error;
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: false, error: message }),
    };
  }
};

export { handler };
