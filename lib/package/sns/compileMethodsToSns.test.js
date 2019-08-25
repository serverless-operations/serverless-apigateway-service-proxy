'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileMethodsToSns()', () => {
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

  it('should create corresponding resources when sns proxies are given', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: 'myTopic',
            path: 'sns',
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
      sns: {
        name: 'Sns',
        resourceLogicalId: 'ApiGatewayResourceSns'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodSnsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSns' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSnsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:aws:apigateway:${AWS::Region}:sns:path//'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
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

  it('should create corresponding resources when sns proxies are given with cors', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: 'myTopic',
            path: 'sns',
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
      sns: {
        name: 'Sns',
        resourceLogicalId: 'ApiGatewayResourceSns'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodSnsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizerId: undefined,
          AuthorizationScopes: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSns' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSnsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:aws:apigateway:${AWS::Region}:sns:path//'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
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

  it('should return the default template for application/json when one is not given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      topicName: 'myTopic',
      request: {
        template: {
          'application/x-www-form-urlencoded': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getSnsMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Join']
    ).to.be.deep.equal([
      '',
      [
        "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
        {
          'Fn::Sub': [
            'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
            { topicName: 'myTopic' }
          ]
        },
        "')"
      ]
    ])
  })

  it('should return a custom template for application/json when one is given', () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      topicName: 'myTopic',
      request: {
        template: {
          'application/json': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getSnsMethodIntegration(
      httpWithRequestTemplate
    )
    expect(resource.Properties.Integration.RequestTemplates['application/json']).to.be.equal(
      'custom template'
    )
  })

  it('should return the default for application/x-www-form-urlencoded when one is not given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      topicName: 'myTopic',
      request: {
        template: {
          'application/json': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getSnsMethodIntegration(
      httpWithoutRequestTemplate
    )
    expect(
      resource.Properties.Integration.RequestTemplates['application/x-www-form-urlencoded'][
        'Fn::Join'
      ]
    ).to.be.deep.equal([
      '',
      [
        "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
        {
          'Fn::Sub': [
            'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
            { topicName: 'myTopic' }
          ]
        },
        "')"
      ]
    ])
  })

  it('should return a custom template for application/x-www-form-urlencoded when one is given', () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      topicName: 'myTopic',
      request: {
        template: {
          'application/x-www-form-urlencoded': 'custom template'
        }
      },
      auth: {
        authorizationType: 'NONE'
      }
    }
    const resource = serverlessApigatewayServiceProxy.getSnsMethodIntegration(
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
      sns: {
        name: 'Sns',
        resourceLogicalId: 'ApiGatewayResourceSns'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSns()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should create corresponding resources with "CUSTOM" authorization type', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: 'myTopic',
            path: 'sns',
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
      sns: {
        name: 'Sns',
        resourceLogicalId: 'ApiGatewayResourceSns'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodSnsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'CUSTOM',
          AuthorizationScopes: undefined,
          AuthorizerId: { Ref: 'AuthorizerLogicalId' },
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSns' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSnsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:aws:apigateway:${AWS::Region}:sns:path//'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
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
          serviceName: 'sns',
          http: {
            topicName: 'myTopic',
            path: 'sns',
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
      sns: {
        name: 'Sns',
        resourceLogicalId: 'ApiGatewayResourceSns'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodSnsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'COGNITO_USER_POOLS',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSns' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSnsRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:aws:apigateway:${AWS::Region}:sns:path//'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Join': [
                  '',
                  [
                    "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
                    {
                      'Fn::Sub': [
                        'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                        { topicName: 'myTopic' }
                      ]
                    },
                    "')"
                  ]
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
