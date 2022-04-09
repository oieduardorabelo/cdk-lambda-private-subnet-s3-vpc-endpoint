import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

export class LambdaPrivateS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    let bucket = new cdk.aws_s3.Bucket(this, "Bucket");

    let vpc = new cdk.aws_ec2.Vpc(this, "Vpc", {
      cidr: "10.0.0.0/16",
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "isolated",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    let s3Endpoint = vpc.addGatewayEndpoint("S3Endpoint", {
      service: cdk.aws_ec2.GatewayVpcEndpointAwsService.S3,
    });

    let lambdaPutObject = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "LambdaPutObject",
      {
        entry: "./lib/functions/lambda-put-object.ts",
        environment: {
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          BUCKET_NAME: bucket.bucketName,
        },
        vpc,
        vpcSubnets: {
          subnets: vpc.isolatedSubnets,
        },
      }
    );
    bucket.grantWrite(lambdaPutObject);
    s3Endpoint.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ["s3:PutObject"],
        resources: [bucket.bucketArn, bucket.arnForObjects("new_files/*")],
        effect: cdk.aws_iam.Effect.ALLOW,
        conditions: {
          StringEquals: {
            "aws:PrincipalArn": lambdaPutObject.role?.roleArn,
          },
        },
      })
    );

    let api = new cdk.aws_apigateway.RestApi(this, "ApiGateway");
    api.root
      .addResource("api")
      .addResource("generate_file")
      .addMethod(
        "POST",
        new cdk.aws_apigateway.LambdaIntegration(lambdaPutObject)
      );

    let lambdaNotificationPutObject = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "LambdaNotificationPutObject",
      {
        entry: "./lib/functions/lambda-notification-put-object.ts",
        environment: {
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          BUCKET_NAME: bucket.bucketName,
        },
        vpc,
        vpcSubnets: {
          subnets: vpc.isolatedSubnets,
        },
      }
    );
    s3Endpoint.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [
          bucket.bucketArn,
          bucket.arnForObjects("new_files/*"),
          bucket.arnForObjects("enriched_files/*"),
        ],
        effect: cdk.aws_iam.Effect.ALLOW,
        conditions: {
          StringEquals: {
            "aws:PrincipalArn": lambdaNotificationPutObject.role?.roleArn,
          },
        },
      })
    );
    bucket.grantReadWrite(lambdaNotificationPutObject);
    bucket.addEventNotification(
      cdk.aws_s3.EventType.OBJECT_CREATED_PUT,
      new cdk.aws_s3_notifications.LambdaDestination(
        lambdaNotificationPutObject
      ),
      {
        prefix: "new_files/",
      }
    );

    new cdk.CfnOutput(this, "BucketArn", {
      value: bucket.bucketArn,
      exportName: "BucketArn",
    });
    new cdk.CfnOutput(this, "LambdaPutObjectIamRoleArn", {
      value: lambdaPutObject.role?.roleArn as string,
      exportName: "LambdaPutObjectIamRoleArn",
    });
  }
}
