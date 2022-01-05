'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
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
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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

  it('should return a custom request template for application/json when one is given', () => {
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
            request: {
              template: {
                'application/json': '##This template is just a comment'
              }
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: { 'application/json': '##This template is just a comment' },
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

  it('should return a custom request template for application/json when one is given and not include custom request querystring parameters if provided', () => {
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
            requestParameters: {
              'integration.request.header.x-my-custom-header': "'foobar'",
              'integration.request.querystring.MessageAttribute.1.Name': "'cognitoIdentityId'",
              'integration.request.querystring.MessageAttribute.1.Value.StringValue':
                'context.identity.cognitoIdentityId',
              'integration.request.querystring.MessageAttribute.1.Value.DataType': "'String'",
              'integration.request.querystring.MessageAttribute.2.Name':
                "'cognitoAuthenticationProvider'",
              'integration.request.querystring.MessageAttribute.2.Value.StringValue':
                'context.identity.cognitoAuthenticationProvider',
              'integration.request.querystring.MessageAttribute.2.Value.DataType': "'String'"
            },
            request: {
              template: {
                'application/json': '##This template is just a comment'
              }
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'",
              'integration.request.header.x-my-custom-header': "'foobar'"
            },
            RequestTemplates: { 'application/json': '##This template is just a comment' },
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

  it('should return a custom request template for application/json when custom request querystring parameters are provided and no custom request template is provided', () => {
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
            requestParameters: {
              'integration.request.header.x-my-custom-header': "'foobar'",
              'integration.request.querystring.MessageAttribute.1.Name': "'cognitoIdentityId'",
              'integration.request.querystring.MessageAttribute.1.Value.StringValue':
                'context.identity.cognitoIdentityId',
              'integration.request.querystring.MessageAttribute.1.Value.DataType': "'String'",
              'integration.request.querystring.MessageAttribute.2.Name':
                "'cognitoAuthenticationProvider'",
              'integration.request.querystring.MessageAttribute.2.Value.StringValue':
                'context.identity.cognitoAuthenticationProvider',
              'integration.request.querystring.MessageAttribute.2.Value.DataType': "'String'"
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
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
                {
                  queueName: 'myQueue'
                }
              ]
            },
            RequestParameters: {
              'integration.request.header.x-my-custom-header': "'foobar'",
              'integration.request.querystring.Action': "'SendMessage'",
              'integration.request.querystring.MessageAttribute.1.Name': "'cognitoIdentityId'",
              'integration.request.querystring.MessageAttribute.1.Value.DataType': "'String'",
              'integration.request.querystring.MessageAttribute.1.Value.StringValue':
                'context.identity.cognitoIdentityId',
              'integration.request.querystring.MessageAttribute.2.Name':
                "'cognitoAuthenticationProvider'",
              'integration.request.querystring.MessageAttribute.2.Value.DataType': "'String'",
              'integration.request.querystring.MessageAttribute.2.Value.StringValue':
                'context.identity.cognitoAuthenticationProvider',
              'integration.request.querystring.MessageBody': 'method.request.body'
            },
            RequestTemplates: {
              'application/json': '{statusCode:200}'
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

  it('should throw error if simplified response template uses an unsupported key', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs',
            method: 'post',
            queueName: 'queueName',
            response: {
              template: {
                test: 'test template'
              }
            }
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'child "sqs" fails because [child "response" fails because [child "template" fails because ["test" is not allowed], "response" must be an array]]'
    )
  })

  it('should throw error if complex response template uses an unsupported key', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs',
            method: 'post',
            queueName: 'queueName',
            response: [
              {
                test: 'test'
              }
            ]
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'child "sqs" fails because [child "response" fails because ["response" must be an object, "response" at position 0 fails because ["test" is not allowed]]]'
    )
  })

  it('should transform simplified integration responses', () => {
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
            response: {
              template: {
                success: 'success template',
                clientError: 'client error template',
                serverError: 'server error template'
              }
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

    expect(
      serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayMethodsqsPost
        .Properties.Integration.IntegrationResponses
    ).to.be.deep.equal([
      {
        StatusCode: 200,
        SelectionPattern: 200,
        ResponseParameters: {},
        ResponseTemplates: {
          'application/json': 'success template'
        }
      },
      {
        StatusCode: 400,
        SelectionPattern: 400,
        ResponseParameters: {},
        ResponseTemplates: {
          'application/json': 'client error template'
        }
      },
      {
        StatusCode: 500,
        SelectionPattern: 500,
        ResponseParameters: {},
        ResponseTemplates: {
          'application/json': 'server error template'
        }
      }
    ])
  })

  it('should transform complex integration responses', () => {
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
            response: [
              {
                statusCode: 200,
                responseTemplates: {
                  'text/plain': 'ok'
                }
              },
              {
                statusCode: 400,
                selectionPattern: '4\\d{2}',
                responseParameters: {
                  a: 'b'
                }
              },
              {
                statusCode: 500
              }
            ]
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
        .Properties.Integration.IntegrationResponses
    ).to.be.deep.equal([
      {
        StatusCode: 200,
        SelectionPattern: 200,
        ResponseParameters: {},
        ResponseTemplates: {
          'text/plain': 'ok'
        }
      },
      {
        StatusCode: 400,
        SelectionPattern: '4\\d{2}',
        ResponseParameters: {
          a: 'b'
        },
        ResponseTemplates: {}
      },
      {
        StatusCode: 500,
        SelectionPattern: 500,
        ResponseParameters: {},
        ResponseTemplates: {}
      }
    ])
  })
})
