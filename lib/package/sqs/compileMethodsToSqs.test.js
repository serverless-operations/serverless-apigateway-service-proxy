'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileMethodsToSqs()', () => {
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
    serverless.service.provider.compiledCloudFormationTemplate = { Resources: {} }
    serverlessApigatewayServiceProxy = new ServerlessApigatewayServiceProxy(serverless, options)
  })

  it('should create corresponding resources when sqs proxies are given', () => {
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
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: { 'application/json': '{statusCode:200}' },
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

  it('should create corresponding resources when sqs proxies are given with cors', () => {
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
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: { 'application/json': '{statusCode:200}' },
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

  it('should create corresponding resources when sqs proxies are given with private', () => {
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
            },
            private: true
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: true,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: { 'application/json': '{statusCode:200}' },
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

  it('should not create corresponding resources when other proxies are given', () => {
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
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should create corresponding resources with "CUSTOM" authorization type', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: 'myQueue',
            path: 'sqs',
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
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'CUSTOM',
          AuthorizationScopes: undefined,
          AuthorizerId: { Ref: 'AuthorizerLogicalId' },
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: { 'application/json': '{statusCode:200}' },
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
          serviceName: 'sqs',
          http: {
            queueName: 'myQueue',
            path: 'sqs',
            method: 'post',
            auth: {
              authorizationType: 'COGNITO_USER_POOLS',
              authorizationScopes: ['admin']
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'COGNITO_USER_POOLS',
          AuthorizationScopes: ['admin'],
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: { 'application/json': '{statusCode:200}' },
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

  it('should add additional requestParameters', () => {
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
            },
            requestParameters: { key1: 'value1', key2: 'value2' }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body',
              key1: 'value1',
              key2: 'value2'
            },
            RequestTemplates: { 'application/json': '{statusCode:200}' },
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
      queueName: 'myQueue',
      path: 'sqs',
      method: 'post',
      auth: { authorizationType: 'NONE' },
      roleArn: 'roleArn'
    }

    const resource = serverlessApigatewayServiceProxy.getSqsMethodIntegration(http)
    expect(resource.Properties.Integration.Credentials).to.be.equal('roleArn')
  })

  it('should set RequestParameters to acceptParameters when configured', () => {
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
            },
            acceptParameters: { 'method.request.header.Custom-Header': true }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSqs()

    expect(
      serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayMethodsqsPost
        .Properties.RequestParameters
    ).to.be.deep.equal({ 'method.request.header.Custom-Header': true })
  })
})
