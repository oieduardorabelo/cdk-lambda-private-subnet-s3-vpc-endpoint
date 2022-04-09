import { GetObjectCommand, PutObjectCommand, S3 } from "@aws-sdk/client-s3";

import { Context } from "aws-lambda";

let client = new S3({});

let handler = async (event: S3ObjectPutNotificationEvent, context: Context) => {
  for (const item of event.Records) {
    try {
      let commandGetObject = new GetObjectCommand({
        Bucket: item.s3.bucket.name,
        Key: item.s3.object.key,
      });
      let { Body: readable } = await client.send(commandGetObject);
      let body: string = await new Promise((res, rej) => {
        let chunks: Buffer[] = [];
        readable.on("readable", () => {
          let chunk: Buffer;
          while ((chunk = readable.read()) !== null) {
            chunks.push(chunk);
          }
        });
        readable.on("end", () => {
          res(chunks.join(""));
        });
        readable.on("error", (err: Error) => {
          rej(err);
        });
      });

      let json = JSON.parse(body);
      json.enriched = true;
      json.enriched_timestamp = Date.now();

      let commandPutObject = new PutObjectCommand({
        Bucket: item.s3.bucket.name,
        Key: `enriched_files/${json.id}`,
        Body: JSON.stringify(json),
      });
      await client.send(commandPutObject);
    } catch (err) {
      console.error(err);
    }
  }
};

export { handler };

interface S3ObjectPutNotificationEvent {
  Records: Record[];
}

interface Record {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  userIdentity: UserIdentity;
  requestParameters: RequestParameters;
  responseElements: ResponseElements;
  s3: S3Bucket;
}

interface UserIdentity {
  principalId: string;
}

interface RequestParameters {
  sourceIPAddress: string;
}

interface ResponseElements {
  "x-amz-request-id": string;
  "x-amz-id-2": string;
}

interface S3Bucket {
  s3SchemaVersion: string;
  configurationId: string;
  bucket: Bucket;
  object: Object;
}

interface Bucket {
  name: string;
  ownerIdentity: OwnerIdentity;
  arn: string;
}

interface OwnerIdentity {
  principalId: string;
}

interface Object {
  key: string;
  size: number;
  eTag: string;
  sequencer: string;
}
