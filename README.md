# Serverless Apigateway Service proxy
The Serverless Framewrok plugin to support AWS service proxy integration of API Gateway

## How to use
Define something to setting of AWS services you want to integrate with under `custom > apiGatewayServiceProxy`

### Kinesis
```yaml
custom:
  apiGatewayServiceProxy:
    path: /kinesis/{streamname}
```
