# Serverless Apigateway Service Proxy(BETA)
The Serverless Framewrok plugin to support AWS service proxy integration of API Gateway. You can connect directly API Gateway with AWS services without Lambda. Currently, support only kinesis stream but will expend the other services.

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
Define something to setting of AWS services you want to integrate with under `custom > apiGatewayServiceProxy` and run `serverless deploy`.

### Kinesis
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
