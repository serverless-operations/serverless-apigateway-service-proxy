'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileMethodsToKinesis()', () => {
  let serverless
  let serverlessApigatewayServiceProxy

  beforeEach(() => {
    serverless = new Serverless()
    serverless.servicePath = true
    serverless.service.service = 'apigw-service-proxy'
    const options = {
      stage: 'dev',
      region: 'us-east-1'
    }
    serverless.setProvider('aws', new AwsProvider(serverless))
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {}
    }
    serverlessApigatewayServiceProxy = new ServerlessApigatewayServiceProxy(serverless, options)
  })

  it('should create corresponding resources when kinesis proxies are given', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            auth: {
              authorizationType: 'NONE'
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecord'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: {},
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 200 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 400 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 500 }
          ]
        }
      }
    })
  })

  it('should create corresponding resources when kinesis proxies are given with cors', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            auth: {
              authorizationType: 'NONE'
            },
            cors: {
              origins: ['*'],
              origin: '*',
              methods: ['OPTIONS', 'POST'],
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              allowCredentials: false
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizerId: undefined,
          AuthorizationScopes: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecord'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
              ResponseModels: {},
              StatusCode: 200
            },
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
              ResponseModels: {},
              StatusCode: 400
            },
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
              ResponseModels: {},
              StatusCode: 500
            }
          ]
        }
      }
    })
  })

  it('should create corresponding resources when kinesis proxies are given with private', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            auth: {
              authorizationType: 'NONE'
            },
            private: true
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizerId: undefined,
          AuthorizationScopes: undefined,
          ApiKeyRequired: true,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecord'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: {},
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: {},
              ResponseModels: {},
              StatusCode: 200
            },
            {
              ResponseParameters: {},
              ResponseModels: {},
              StatusCode: 400
            },
            {
              ResponseParameters: {},
              ResponseModels: {},
              StatusCode: 500
            }
          ]
        }
      }
    })
  })

  it('should return the default template for application/json when one is not given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/bar1',
      streamName: 'myStream',
      method: 'post',
      request: {
        template: {
          'application/x-www-form-urlencoded': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'myStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: '$context.requestId'
      }
    ])
  })

  it('should set path parameter to partitionkey when pathParam is given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/{key1}',
      method: 'post',
      partitionKey: {
        pathParam: 'key1'
      },
      streamName: 'testStream',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'testStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: '$input.params().path.key1'
      }
    ])
  })

  it('should set body parameter to partitionkey when bodyParam is given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo',
      method: 'post',
      partitionKey: {
        bodyParam: 'data.messageId'
      },
      streamName: 'testStream',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'testStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: '$util.parseJson($input.body).data.messageId'
      }
    ])
  })

  it('should set querystring parameter to partitionkey when queryStringParam is given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo?key=xxxxx',
      method: 'post',
      partitionKey: {
        queryStringParam: 'key'
      },
      streamName: 'testStream',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'testStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: '$input.params().querystring.key'
      }
    ])
  })

  it('should set apigateway requestid to partitionkey when no one is given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo',
      method: 'post',
      streamName: 'testStream',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'testStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: '$context.requestId'
      }
    ])
  })

  it('should set specified value to partitionkey when the param is hardcorded', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo',
      method: 'post',
      streamName: 'testStream',
      partitionKey: 'mykey',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'testStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: 'mykey'
      }
    ])
  })

  it('should return a custom request template for application/json when one is given', () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/json': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithRequestTemplate
    )
    expect(resource.Properties.Integration.RequestTemplates['application/json']).to.be.equal(
      'custom template'
    )
  })

  it('should return a custom response template for application/json when one is given', () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      response: {
        template: {
          success: 'success template',
          clientError: 'client error template',
          serverError: 'server error template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithRequestTemplate
    )
    expect(
      resource.Properties.Integration.IntegrationResponses[0].ResponseTemplates['application/json']
    ).to.be.equal('success template')
    expect(
      resource.Properties.Integration.IntegrationResponses[1].ResponseTemplates['application/json']
    ).to.be.equal('client error template')
    expect(
      resource.Properties.Integration.IntegrationResponses[2].ResponseTemplates['application/json']
    ).to.be.equal('server error template')
  })

  it('should return the default for application/x-www-form-urlencoded when one is not given', () => {
    const httpWithoutRequestTemplate = {
      streamName: 'myStream',
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/json': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )
    expect(
      resource.Properties.Integration.RequestTemplates['application/x-www-form-urlencoded'][
        'Fn::Sub'
      ]
    ).to.be.deep.equal([
      '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
      {
        StreamName: 'myStream',
        Data: '$util.base64Encode($input.body)',
        PartitionKey: '$context.requestId'
      }
    ])
  })

  it('should return a custom template for application/x-www-form-urlencoded when one is given', () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/x-www-form-urlencoded': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithRequestTemplate
    )
    expect(
      resource.Properties.Integration.RequestTemplates['application/x-www-form-urlencoded']
    ).to.be.equal('custom template')
  })

  it('should not create corresponding resources when other proxies are given', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: 'myQueue',
            path: 'sqs',
            method: 'post',
            auth: {
              authorizationType: 'NONE'
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should create corresponding resources with "CUSTOM" authorization type', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            auth: {
              authorizationType: 'CUSTOM',
              authorizerId: { Ref: 'AuthorizerLogicalId' }
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'CUSTOM',
          AuthorizationScopes: undefined,
          AuthorizerId: { Ref: 'AuthorizerLogicalId' },
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecord'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: {},
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 200 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 400 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 500 }
          ]
        }
      }
    })
  })

  it('should create corresponding resources with "COGNITO_USER_POOLS" authorization type', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            auth: {
              authorizationType: 'COGNITO_USER_POOLS',
              AuthorizationScopes: ['admin']
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'COGNITO_USER_POOLS',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecord'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: {},
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 200 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 400 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 500 }
          ]
        }
      }
    })
  })

  it('should set Credentials to roleArn when a custom role is configured', () => {
    const http = {
      path: 'foo/bar1',
      method: 'post',
      auth: {
        authorizationType: 'NONE'
      },
      roleArn: 'roleArn'
    }
    const resource = serverlessApigatewayServiceProxy.getKinesisMethodIntegration(http)
    expect(resource.Properties.Integration.Credentials).to.be.equal('roleArn')
  })

  it('should set RequestParameters to acceptParameters when configured', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            auth: {
              authorizationType: 'NONE'
            },
            acceptParameters: { 'method.request.header.Custom-Header': true }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(
      serverless.service.provider.compiledCloudFormationTemplate.Resources
        .ApiGatewayMethodkinesisPost.Properties.RequestParameters
    ).to.be.deep.equal({ 'method.request.header.Custom-Header': true })
  })

  it('should create corresponding resources when kinesis proxies with custome action "PutRecord" are given', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            action: 'PutRecord',
            auth: {
              authorizationType: 'NONE'
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecord'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
                  {
                    StreamName: 'myStream',
                    Data: '$util.base64Encode($input.body)',
                    PartitionKey: '$context.requestId'
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: {},
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 200 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 400 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 500 }
          ]
        }
      }
    })
  })

  it('should create corresponding resources when kinesis proxies with custome action "PutRecords" are given', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
            action: 'PutRecords',
            auth: {
              authorizationType: 'NONE'
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      kinesis: {
        name: 'kinesis',
        resourceLogicalId: 'ApiGatewayResourceKinesis'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:kinesis:action/PutRecords'
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Records":${Records}}',
                  {
                    StreamName: 'myStream',
                    Records: `[
  #foreach($elem in $input.path('$.records'))
      {
        "Data": "$util.base64Encode($elem.data)",
        "PartitionKey": "$elem.partition-key"
      }#if($foreach.hasNext),#end
  #end
]`
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"StreamName":"${StreamName}","Records":${Records}}',
                  {
                    StreamName: 'myStream',
                    Records: `[
  #foreach($elem in $input.path('$.records'))
      {
        "Data": "$util.base64Encode($elem.data)",
        "PartitionKey": "$elem.partition-key"
      }#if($foreach.hasNext),#end
  #end
]`
                  }
                ]
              }
            },
            IntegrationResponses: [
              {
                StatusCode: 200,
                SelectionPattern: 200,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 400,
                SelectionPattern: 400,
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: 500,
                ResponseParameters: {},
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 200 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 400 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 500 }
          ]
        }
      }
    })
  })
})
