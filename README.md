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

### Customizing request body mapping templates

If you'd like to add content types or customize the default templates, you can do so by including your custom [API Gateway request mapping template](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html) in `serverless.yml` like so:

```yml
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
Source: [How to connect SNS to Kinesis for cross-account delivery via API Gateway](https://theburningmonk.com/2019/07/how-to-connect-sns-to-kinesis-for-cross-account-delivery-via-api-gateway/)
