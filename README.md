![serverless](http://public.serverless.com/badges/v3.svg)

# Serverless ApiGateway Service Proxy(BETA)
This Serverless Framewrok plugin supports the AWS service proxy integration feature of API Gateway. You can directly connect API Gateway to AWS services without Lambda. Currently, the plugin only supports Kinesis streams but will expand to other services.

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

## How to use
Define settings of the AWS services you want to integrate under `custom > apiGatewayServiceProxy` and run `serverless deploy`.

### Kinesis
Here is syntax for Kinesis proxy in serverless.yml.
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

Here is a sample request after deploying.
```
curl -XPOST https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/kinesis -d '{"Data": "some data","PartitionKey": "some key"}'  -H 'Content-Type:application/json'

```


