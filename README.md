![serverless](http://public.serverless.com/badges/v3.svg)
[![Build Status](https://travis-ci.org/horike37/serverless-apigateway-service-proxy.svg?branch=master)](https://travis-ci.org/horike37/serverless-apigateway-service-proxy) [![npm version](https://badge.fury.io/js/serverless-apigateway-service-proxy.svg)](https://badge.fury.io/js/serverless-apigateway-service-proxy) [![Coverage Status](https://coveralls.io/repos/github/horike37/serverless-apigateway-service-proxy/badge.svg?branch=master)](https://coveralls.io/github/horike37/serverless-apigateway-service-proxy?branch=master) [![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

# Serverless APIGateway Service Proxy

This Serverless Framework plugin supports the AWS service proxy integration feature of API Gateway. You can directly connect API Gateway to AWS services without Lambda.

## Install

Run `serverless plugin install` in your Serverless project.

```bash
serverless plugin install -n serverless-apigateway-service-proxy
```

## Supported AWS services

Here is a services list which this plugin supports for now. But will expand to other services in the feature.
Please pull request if you are intersted in it.

- Kinesis Streams
- SQS
- S3
- SNS

## How to use

Define settings of the AWS services you want to integrate under `custom > apiGatewayServiceProxies` and run `serverless deploy`.

### Kinesis

Sample syntax for Kinesis proxy in `serverless.yml`.

```yaml
custom:
  apiGatewayServiceProxies:
    - kinesis: # partitionkey is set apigateway requestid by default
        path: /kinesis
        method: post
        streamName: { Ref: 'YourStream' }
        cors: true
    - kinesis:
        path: /kinesis
        method: post
        partitionKey: 'hardcordedkey' # use static partitionkey
        streamName: { Ref: 'YourStream' }
        cors: true
    - kinesis:
        path: /kinesis/{myKey} # use path parameter
        method: post
        partitionKey:
          pathParam: myKey
        streamName: { Ref: 'YourStream' }
        cors: true
    - kinesis:
        path: /kinesis
        method: post
        partitionKey:
          bodyParam: data.myKey # use body parameter
        streamName: { Ref: 'YourStream' }
        cors: true
    - kinesis:
        path: /kinesis
        method: post
        partitionKey:
          queryStringParam: myKey # use query string param
        streamName: { Ref: 'YourStream' }
        cors: true

resources:
  Resources:
    YourStream:
      Type: AWS::Kinesis::Stream
      Properties:
        ShardCount: 1
```

Sample request after deploying.

```bash
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/kinesis -d '{"message": "some data"}'  -H 'Content-Type:application/json'
```

### SQS

Sample syntax for SQS proxy in `serverless.yml`.

```yaml
custom:
  apiGatewayServiceProxies:
    - sqs:
        path: /sqs
        method: post
        queueName: { 'Fn::GetAtt': ['SQSQueue', 'QueueName'] }
        cors: true

resources:
  Resources:
    SQSQueue:
      Type: 'AWS::SQS::Queue'
```

Sample request after deploying.

```bash
curl https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/sqs -d '{"message": "testtest"}' -H 'Content-Type:application/json'
```

#### Customizing request parameters

If you'd like to pass additional data to the integration request, you can do so by including your custom [API Gateway request parameters](https://docs.aws.amazon.com/apigateway/latest/developerguide/request-response-data-mappings.html) in `serverless.yml` like so:

```yml
custom:
  apiGatewayServiceProxies:
    - sqs:
        path: /queue
        method: post
        queueName: !GetAtt MyQueue.QueueName
        cors: true

        requestParameters:
          'integration.request.querystring.MessageAttribute.1.Name': "'cognitoIdentityId'"
          'integration.request.querystring.MessageAttribute.1.Value.StringValue': 'context.identity.cognitoIdentityId'
          'integration.request.querystring.MessageAttribute.1.Value.DataType': "'String'"
          'integration.request.querystring.MessageAttribute.2.Name': "'cognitoAuthenticationProvider'"
          'integration.request.querystring.MessageAttribute.2.Value.StringValue': 'context.identity.cognitoAuthenticationProvider'
          'integration.request.querystring.MessageAttribute.2.Value.DataType': "'String'"
```

### S3

Sample syntax for S3 proxy in `serverless.yml`.

```yaml
custom:
  apiGatewayServiceProxies:
    - s3:
        path: /s3
        method: post
        action: PutObject
        bucket:
          Ref: S3Bucket
        key: static-key.json # use static key
        cors: true

    - s3:
        path: /s3/{myKey} # use path param
        method: get
        action: GetObject
        bucket:
          Ref: S3Bucket
        key:
          pathParam: myKey
        cors: true

    - s3:
        path: /s3
        method: delete
        action: DeleteObject
        bucket:
          Ref: S3Bucket
        key:
          queryStringParam: key # use query string param
        cors: true

resources:
  Resources:
    S3Bucket:
      Type: 'AWS::S3::Bucket'
```

Sample request after deploying.

```bash
curl https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/s3 -d '{"message": "testtest"}' -H 'Content-Type:application/json'
```

#### Customizing request parameters

Similar to the [SQS](#sqs) support, you can customize the default request parameters `serverless.yml` like so:

```yml
custom:
  apiGatewayServiceProxies:
    - s3:
        path: /s3
        method: post
        action: PutObject
        bucket:
          Ref: S3Bucket
        cors: true

        requestParameters:
          # if requestParameters has a 'integration.request.path.object' property you should remove the key setting
          'integration.request.path.object': 'context.requestId'
          'integration.request.header.cache-control': "'public, max-age=31536000, immutable'"
```

### SNS

Sample syntax for SNS proxy in `serverless.yml`.

```yaml
custom:
  apiGatewayServiceProxies:
    - sns:
        path: /sns
        method: post
        topicName: { 'Fn::GetAtt': ['SNSTopic', 'TopicName'] }
        cors: true

resources:
  Resources:
    SNSTopic:
      Type: AWS::SNS::Topic
```

Sample request after deploying.

```bash
curl https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/sns -d '{"message": "testtest"}' -H 'Content-Type:application/json'
```

## Common API Gateway features

### Enabling CORS

To set CORS configurations for your HTTP endpoints, simply modify your event configurations as follows:

```yml
custom:
  apiGatewayServiceProxies:
    - kinesis:
        path: /kinesis
        method: post
        streamName: { Ref: 'YourStream' }
        cors: true
```

Setting cors to true assumes a default configuration which is equivalent to:

```yml
custom:
  apiGatewayServiceProxies:
    - kinesis:
        path: /kinesis
        method: post
        streamName: { Ref: 'YourStream' }
        cors:
          origin: '*'
          headers:
            - Content-Type
            - X-Amz-Date
            - Authorization
            - X-Api-Key
            - X-Amz-Security-Token
            - X-Amz-User-Agent
          allowCredentials: false
```

Configuring the cors property sets Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods,Access-Control-Allow-Credentials headers in the CORS preflight response.
To enable the Access-Control-Max-Age preflight response header, set the maxAge property in the cors object:

```yml
custom:
  apiGatewayServiceProxies:
    - kinesis:
        path: /kinesis
        method: post
        streamName: { Ref: 'YourStream' }
        cors:
          origin: '*'
          maxAge: 86400
```

If you are using CloudFront or another CDN for your API Gateway, you may want to setup a Cache-Control header to allow for OPTIONS request to be cached to avoid the additional hop.

To enable the Cache-Control header on preflight response, set the cacheControl property in the cors object:

```yml
custom:
  apiGatewayServiceProxies:
    - kinesis:
        path: /kinesis
        method: post
        streamName: { Ref: 'YourStream' }
        cors:
          origin: '*'
          headers:
            - Content-Type
            - X-Amz-Date
            - Authorization
            - X-Api-Key
            - X-Amz-Security-Token
            - X-Amz-User-Agent
          allowCredentials: false
          cacheControl: 'max-age=600, s-maxage=600, proxy-revalidate' # Caches on browser and proxy for 10 minutes and doesnt allow proxy to serve out of date content
```

### Adding Authorization

You can pass in any supported authorization type:

```yml
custom:
  apiGatewayServiceProxies:
    - sqs:
        path: /sqs
        method: post
        queueName: { 'Fn::GetAtt': ['SQSQueue', 'QueueName'] }
        cors: true

        # optional - defaults to 'NONE'
        authorizationType: 'AWS_IAM' # can be one of ['NONE', 'AWS_IAM', 'CUSTOM', 'COGNITO_USER_POOLS']

        # when using 'CUSTOM' authorization type, one should specify authorizerId
        # authorizerId: { Ref: 'AuthorizerLogicalId' }
        # when using 'COGNITO_USER_POOLS' authorization type, one can specify a list of authorization scopes
        # authorizationScopes: ['scope1','scope2']

resources:
  Resources:
    SQSQueue:
      Type: 'AWS::SQS::Queue'
```

Source: [AWS::ApiGateway::Method docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-method.html#cfn-apigateway-method-authorizationtype)

### Using a Custom IAM Role

By default, the plugin will generate a role with the required permissions for each service type that is configured.

You can configure your own role by setting the `roleArn` attribute:

```yaml
custom:
  apiGatewayServiceProxies:
    - sqs:
        path: /sqs
        method: post
        queueName: { 'Fn::GetAtt': ['SQSQueue', 'QueueName'] }
        cors: true
        roleArn: # Optional. A default role is created when not configured
          Fn::GetAtt: [CustomS3Role, Arn]

resources:
  Resources:
    SQSQueue:
      Type: 'AWS::SQS::Queue'
    CustomS3Role:
      # Custom Role definition
      Type: 'AWS::IAM::Role'
```

### Customizing API Gateway parameters

The plugin allows one to specify which [parameters the API Gateway method accepts](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-method.html#cfn-apigateway-method-requestparameters).

A common use case is to pass custom data to the integration request:

```yaml
custom:
  apiGatewayServiceProxies:
    - sqs:
        path: /sqs
        method: post
        queueName: { 'Fn::GetAtt': ['SqsQueue', 'QueueName'] }
        cors: true
        acceptParameters:
          'method.request.header.Custom-Header': true
        requestParameters:
          'integration.request.querystring.MessageAttribute.1.Name': "'custom-Header'"
          'integration.request.querystring.MessageAttribute.1.Value.StringValue': 'method.request.header.Custom-Header'
          'integration.request.querystring.MessageAttribute.1.Value.DataType': "'String'"
resources:
  Resources:
    SqsQueue:
      Type: 'AWS::SQS::Queue'
```

Any published SQS message will have the `Custom-Header` value added as a message attribute.

### Customizing request body mapping templates

#### Kinesis

If you'd like to add content types or customize the default templates, you can do so by including your custom [API Gateway request mapping template](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html) in `serverless.yml` like so:

```yml
# Required for using Fn::Sub
plugins:
  - serverless-cloudformation-sub-variables

custom:
  apiGatewayServiceProxies:
    - kinesis:
        path: /kinesis
        method: post
        streamName: { Ref: 'MyStream' }
        request:
          template:
            text/plain:
              Fn::Sub:
                - |
                  #set($msgBody = $util.parseJson($input.body))
                  #set($msgId = $msgBody.MessageId)
                  {
                      "Data": "$util.base64Encode($input.body)",
                      "PartitionKey": "$msgId",
                      "StreamName": "#{MyStreamArn}"
                  }
                - MyStreamArn:
                    Fn::GetAtt: [MyStream, Arn]
```

> It is important that the mapping template will return a valid `application/json` string

Source: [How to connect SNS to Kinesis for cross-account delivery via API Gateway](https://theburningmonk.com/2019/07/how-to-connect-sns-to-kinesis-for-cross-account-delivery-via-api-gateway/)

#### SNS

Similar to the [Kinesis](#kinesis-1) support, you can customize the default request mapping templates in `serverless.yml` like so:

```yml
# Required for using Fn::Sub
plugins:
  - serverless-cloudformation-sub-variables

custom:
  apiGatewayServiceProxies:
    - kinesis:
        path: /sns
        method: post
        topicName: { 'Fn::GetAtt': ['SNSTopic', 'TopicName'] }
        request:
          template:
            application/json:
              Fn::Sub:
                - "Action=Publish&Message=$util.urlEncode('This is a fixed message')&TopicArn=$util.urlEncode('#{MyTopicArn}')"
                - MyTopicArn: { Ref: MyTopic }
```

> It is important that the mapping template will return a valid `application/x-www-form-urlencoded` string

Source: [Connect AWS API Gateway directly to SNS using a service integration](https://www.alexdebrie.com/posts/aws-api-gateway-service-proxy/)
