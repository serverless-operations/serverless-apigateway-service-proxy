'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('../../index')

const expect = require('chai').expect

describe('#compileMethodsToEventBridge()', () => {
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

  it('should create corresponding resources when eventbridge proxies are given', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'eventbridge',
          http: {
            eventBusName: 'myEventBusName',
            source: 'myEventSource',
            path: 'eventbridge',
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodeventbridgePost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceEventBridge' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToEventBridgeRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:events:action/PutEvents'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
              'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBusName',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBusName',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
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

  it('should create corresponding resources when eventbridge proxies are given with cors', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'eventbridge',
          http: {
            eventBusName: 'myEventBus',
            source: 'myEventSource',
            path: 'eventbridge',
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodeventbridgePost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizerId: undefined,
          AuthorizationScopes: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceEventBridge' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToEventBridgeRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:events:action/PutEvents'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
              'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
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

  it('should create corresponding resources when eventbridge proxies are given with private', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'eventbridge',
          http: {
            eventBusName: 'myEventBus',
            source: 'myEventSource',
            path: 'eventbridge',
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodeventbridgePost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          AuthorizerId: undefined,
          AuthorizationScopes: undefined,
          ApiKeyRequired: true,
          ResourceId: { Ref: 'ApiGatewayResourceEventBridge' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToEventBridgeRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:events:action/PutEvents'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
              'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
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

  it('should return the default template for application/json when defaultType is not given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/bar1',
      eventBusName: 'myEventBus',
      source: 'myEventSource',
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

    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'myEventBus',
        Detail: '$util.escapeJavaScript($input.body)',
        DetailType: '$context.requestId',
        Source: 'myEventSource'
      }
    ])
  })

  it('should set event source and detailType when given as both path parameters', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/{param1}/{param2}',
      method: 'post',
      detailType: {
        pathParam: 'param1'
      },
      source: {
        pathParam: 'param2'
      },
      eventBusName: 'testEventBus',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'testEventBus',
        Detail: '$util.escapeJavaScript($input.body)',
        DetailType: '$input.params().path.param1',
        Source: '$input.params().path.param2'
      }
    ])
  })

  it('should set querystring parameters to detailType and source when queryStringParams are given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo?param1=xxxxx&param2=yyyyy',
      method: 'post',
      detailType: {
        queryStringParam: 'param1'
      },
      source: {
        queryStringParam: 'param2'
      },
      eventBusName: 'testEventBus',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'testEventBus',
        Detail: '$util.escapeJavaScript($input.body)',
        DetailType: '$input.params().querystring.param1',
        Source: '$input.params().querystring.param2'
      }
    ])
  })

  it('should set source and detailType to empty strings when detailType is not given', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo',
      method: 'post',
      eventBusName: 'eventBus',
      source: 'myEventSource',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'eventBus',
        Detail: '$util.escapeJavaScript($input.body)',
        DetailType: '$context.requestId',
        Source: 'myEventSource'
      }
    ])
  })

  it('should set specified value to source and detailType when the params are hardcorded', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo',
      method: 'post',
      eventBusName: 'myEventBus',
      detailType: 'myDetailType',
      source: 'mySource',
      auth: {
        authorizationType: 'NONE'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'myEventBus',
        Detail: '$util.escapeJavaScript($input.body)',
        DetailType: 'myDetailType',
        Source: 'mySource'
      }
    ])
  })

  it('should return a custom template for application/json when one is given', () => {
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
    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithRequestTemplate
    )
    expect(resource.Properties.Integration.RequestTemplates['application/json']).to.be.equal(
      'custom template'
    )
  })

  it('should return the default for application/x-www-form-urlencoded when one is given', () => {
    const httpWithoutRequestTemplate = {
      eventBusName: 'myEventBus',
      source: 'myEventSource',
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
    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )
    expect(
      resource.Properties.Integration.RequestTemplates['application/x-www-form-urlencoded'][
        'Fn::Sub'
      ]
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'myEventBus',
        Detail: '$util.escapeJavaScript($input.body)',
        DetailType: '$context.requestId',
        Source: 'myEventSource'
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
    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should create corresponding resources with "CUSTOM" authorization type', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'eventbridge',
          http: {
            eventBusName: 'myEventBus',
            source: 'myEventSource',
            path: 'eventbridge',
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodeventbridgePost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'CUSTOM',
          AuthorizationScopes: undefined,
          AuthorizerId: { Ref: 'AuthorizerLogicalId' },
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceEventBridge' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToEventBridgeRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:events:action/PutEvents'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
              'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
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
          serviceName: 'eventbridge',
          http: {
            eventBusName: 'myEventBus',
            source: 'myEventSource',
            path: 'eventbridge',
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodeventbridgePost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'COGNITO_USER_POOLS',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceEventBridge' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToEventBridgeRole', 'Arn'] },
            Uri: {
              'Fn::Sub': 'arn:${AWS::Partition}:apigateway:${AWS::Region}:events:action/PutEvents'
            },
            PassthroughBehavior: 'NEVER',
            RequestParameters: {
              'integration.request.header.Content-Type': "'application/x-amz-json-1.1'",
              'integration.request.header.X-Amz-Target': "'AWSEvents.PutEvents'"
            },
            RequestTemplates: {
              'application/json': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
                  }
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Sub': [
                  '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
                  {
                    EventBusName: 'myEventBus',
                    Detail: '$util.escapeJavaScript($input.body)',
                    DetailType: '$context.requestId',
                    Source: 'myEventSource'
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
    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(http)
    expect(resource.Properties.Integration.Credentials).to.be.equal('roleArn')
  })

  it('should set RequestParameters to acceptParameters when configured', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'eventbridge',
          http: {
            eventBusName: 'myEventBus',
            path: 'eventbridge',
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
      eventbridge: {
        name: 'eventbridge',
        resourceLogicalId: 'ApiGatewayResourceEventBridge'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToEventBridge()

    expect(
      serverless.service.provider.compiledCloudFormationTemplate.Resources
        .ApiGatewayMethodeventbridgePost.Properties.RequestParameters
    ).to.be.deep.equal({ 'method.request.header.Custom-Header': true })
  })

  it('should set detail when detail is provided as bodyParam', () => {
    const httpWithoutRequestTemplate = {
      path: 'foo',
      method: 'post',
      eventBusName: 'myEventBus',
      detailType: 'myDetailType',
      source: 'myEventSource',
      detail: {
        bodyParam: 'data.detail'
      }
    }

    const resource = serverlessApigatewayServiceProxy.getEventBridgeMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Sub']
    ).to.be.deep.equal([
      '{"Entries":[{"Detail": "${Detail}","DetailType": "${DetailType}","EventBusName": "${EventBusName}","Source": "${Source}"}]}',
      {
        EventBusName: 'myEventBus',
        Detail: '$util.escapeJavaScript($util.parseJson($input.body).data.detail)',
        DetailType: 'myDetailType',
        Source: 'myEventSource'
      }
    ])
  })
})
