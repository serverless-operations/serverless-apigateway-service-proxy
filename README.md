![serverless](http://public.serverless.com/badges/v3.svg)
[![Build Status](https://travis-ci.org/horike37/serverless-apigateway-service-proxy.svg?branch=master)](https://travis-ci.org/horike37/serverless-apigateway-service-proxy) [![npm version](https://badge.fury.io/js/serverless-apigateway-service-proxy.svg)](https://badge.fury.io/js/serverless-apigateway-service-proxy) [![Coverage Status](https://coveralls.io/repos/github/horike37/serverless-apigateway-service-proxy/badge.svg?branch=master)](https://coveralls.io/github/horike37/serverless-apigateway-service-proxy?branch=master) [![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

# Serverless APIGateway Service Proxy(BETA)
This Serverless Framewrok plugin supports the AWS service proxy integration feature of API Gateway. You can directly connect API Gateway to AWS services without Lambda.

## Install
Run `servelress plugin install` in your Serverless project.

```
$ serverless plugin install -n serverless-apigateway-service-proxy
```

## Supported AWS services
Here is a services list which this plugin supports for now. But will expand to other services in the feature.
Please pull request if you are intersted in it.

- Kinesis Streams
- SQS

## How to use
Define settings of the AWS services you want to integrate under `custom > apiGatewayServiceProxies` and run `serverless deploy`.

### Kinesis
Sample syntax for Kinesis proxy in serverless.yml.
```yaml
custom:
  apiGatewayServiceProxies:
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
  apiGatewayServiceProxies:
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
