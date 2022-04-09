import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";

import { Context } from "aws-lambda";

let { BUCKET_NAME } = process.env;

let client = new S3({});

let handler = async (event: S3ObjectPutNotificationEvent, context: Context) => {
  for (const item of event.Records) {
    try {
      console.log(BUCKET_NAME, item.s3.bucket.name);
      let commandPutItem = new GetObjectCommand({
        Bucket: item.s3.bucket.name,
        Key: item.s3.object.key,
      });
      let file = await client.send(commandPutItem);
      console.log(file);
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
