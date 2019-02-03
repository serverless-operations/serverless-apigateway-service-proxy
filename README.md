![serverless](http://public.serverless.com/badges/v3.svg)

# Serverless ApiGateway Service Proxy(BETA)
This Serverless Framewrok plugin supports the AWS service proxy integration feature of API Gateway. You can directly connect API Gateway to AWS services without Lambda.

## Install
Run `npm install` in your Serverless project.

```
$ npm install --save-dev serverless-apigateway-service-proxy
```
Add the plugin to your serverless.yml file

```yaml
plugins:
  - serverless-apigateway-service-proxy
```

## Supported AWS services
Here is a services list which this plugin supports for now. But will expand to other services in the feature.
Please pull request if you are intersted in it.

- Kinesis Streams
- SQS

## How to use
Define settings of the AWS services you want to integrate under `custom > apiGatewayServiceProxy` and run `serverless deploy`.

### Kinesis
Sample syntax for Kinesis proxy in serverless.yml.
```yaml
custom:
  apiGatewayServiceProxy:
    - kinesis:
        path: /kinesis
        method: post
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
```
curl -XPOST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/kinesis -d '{"Data": "some data","PartitionKey": "some key"}'  -H 'Content-Type:application/json'
```

### SQS

Sample syntax for SQS proxy in serverless.yml.
```yaml
custom:
  apiGatewayServiceProxy:
    - sqs:
        path: /sqs
        method: post
        queueName: {"Fn::GetAtt":[ "SQSQueue", "QueueName" ]}
        cors: true

resources:
  Resources:
    SQSQueue:
      Type: "AWS::SQS::Queue"
```

Sample request after deploying.
```
curl -XPOST https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/sqs -d '{"message": "testtest"}' -H 'Content-Type:application/json'
```
