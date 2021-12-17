'use strict'

const _ = require('lodash')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

const template = {
  Type: 'AWS::ApiGateway::Method',
  Properties: {
    RequestParameters: {},
    ApiKeyRequired: false,
    ResourceId: { Ref: 'ApiGatewayResourceS3' },
    RestApiId: { Ref: 'ApiGatewayRestApi' },
    Integration: {
      Type: 'AWS',
      Credentials: { 'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn'] },
      Uri: {
        'Fn::Sub': ['arn:${AWS::Partition}:apigateway:${AWS::Region}:s3:path/{bucket}/{object}', {}]
      },
      PassthroughBehavior: 'WHEN_NO_MATCH',
      RequestParameters: {},
      IntegrationResponses: [
        {
          StatusCode: 400,
          SelectionPattern: '4\\d{2}',
          ResponseParameters: {},
          ResponseTemplates: {}
        },
        {
          StatusCode: 500,
          SelectionPattern: '5\\d{2}',
          ResponseParameters: {},
          ResponseTemplates: {}
        },
        {
          StatusCode: 200,
          SelectionPattern: '2\\d{2}',
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

describe('#compileMethodsToS3()', () => {
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

  const testSingleProxy = (opts) => {
    const {
      http,
      logicalId,
      method,
      intMethod,
      requestParams,
      intRequestParams,
      responseParams,
      intResponseParams
    } = opts

    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()

    const diff = {
      Properties: {
        HttpMethod: method,
        AuthorizationType: http.auth.authorizationType,
        AuthorizationScopes: http.auth.authorizationScopes,
        AuthorizerId: http.auth.authorizerId,
        RequestParameters: requestParams,
        Integration: {
          IntegrationHttpMethod: intMethod,
          RequestParameters: intRequestParams,
          IntegrationResponses: [
            {
              StatusCode: 400,
              SelectionPattern: '4\\d{2}',
              ResponseParameters: {},
              ResponseTemplates: {}
            },
            {
              StatusCode: 500,
              SelectionPattern: '5\\d{2}',
              ResponseParameters: {},
              ResponseTemplates: {}
            },
            {
              StatusCode: 200,
              SelectionPattern: '2\\d{2}',
              ResponseParameters: intResponseParams,
              ResponseTemplates: {}
            }
          ]
        }
      }
    }
    const resource = _.merge({}, template, diff)
    const methodResponse = resource.Properties.MethodResponses.find((x) => x.StatusCode === 200)
    methodResponse.ResponseParameters = responseParams

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      [logicalId]: resource
    })
  }

  const testGetObject = (key, keyRequestParam) => {
    const http = {
      path: 's3',
      method: 'get',
      bucket: {
        Ref: 'MyBucket'
      },
      action: 'GetObject',
      key,
      auth: { authorizationType: 'NONE' }
    }

    const requestParams = {}
    if (keyRequestParam.startsWith('method.')) {
      requestParams[keyRequestParam] = true
    }

    const intRequestParams = {
      'integration.request.path.object': keyRequestParam,
      'integration.request.path.bucket': {
        'Fn::Sub': [
          "'${bucket}'",
          {
            bucket: {
              Ref: 'MyBucket'
            }
          }
        ]
      }
    }

    const responseParams = {
      'method.response.header.content-type': true,
      'method.response.header.Content-Type': true
    }

    const intResponseParams = {
      'method.response.header.content-type': 'integration.response.header.content-type',
      'method.response.header.Content-Type': 'integration.response.header.Content-Type'
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethods3Get',
      method: 'GET',
      intMethod: 'GET',
      requestParams,
      intRequestParams,
      responseParams,
      intResponseParams
    })
  }

  it('should create corresponding resources when s3 GetObject proxy is given with a path key', () => {
    testGetObject({ pathParam: 'key' }, 'method.request.path.key')
  })

  it('should create corresponding resources when s3 GetObject proxy is given with a query string key', () => {
    testGetObject({ queryStringParam: 'key' }, 'method.request.querystring.key')
  })

  it('should create corresponding resources when s3 GetObject proxy is given with a static key', () => {
    testGetObject('myKey', "'myKey'")
  })

  const testPutObject = (key, keyRequestParam) => {
    const http = {
      path: 's3',
      method: 'post',
      bucket: {
        Ref: 'MyBucket'
      },
      action: 'PutObject',
      key,
      auth: { authorizationType: 'NONE' }
    }

    const requestParams = {
      'method.request.header.Content-Type': true
    }
    if (keyRequestParam.startsWith('method.')) {
      requestParams[keyRequestParam] = true
    }

    const intRequestParams = {
      'integration.request.path.object': keyRequestParam,
      'integration.request.path.bucket': {
        'Fn::Sub': [
          "'${bucket}'",
          {
            bucket: {
              Ref: 'MyBucket'
            }
          }
        ]
      },
      'integration.request.header.x-amz-acl': "'authenticated-read'",
      'integration.request.header.Content-Type': 'method.request.header.Content-Type'
    }

    const responseParams = {
      'method.response.header.Content-Type': true,
      'method.response.header.Content-Length': true
    }

    const intResponseParams = {
      'method.response.header.Content-Type': 'integration.response.header.Content-Type',
      'method.response.header.Content-Length': 'integration.response.header.Content-Length'
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethods3Post',
      method: 'POST',
      intMethod: 'PUT',
      requestParams,
      intRequestParams,
      responseParams,
      intResponseParams
    })
  }

  it('should create corresponding resources when s3 PutObject proxy is given with a path key', () => {
    testPutObject({ pathParam: 'key' }, 'method.request.path.key')
  })

  it('should create corresponding resources when s3 PutObject proxy is given with a query string key', () => {
    testPutObject({ queryStringParam: 'key' }, 'method.request.querystring.key')
  })

  it('should create corresponding resources when s3 PutObject proxy is given with a static key', () => {
    testPutObject('myKey', "'myKey'")
  })

  const testDeleteObject = (key, keyRequestParam) => {
    const http = {
      path: 's3',
      method: 'delete',
      bucket: {
        Ref: 'MyBucket'
      },
      action: 'DeleteObject',
      key,
      auth: { authorizationType: 'NONE' }
    }

    const requestParams = {}
    if (keyRequestParam.startsWith('method.')) {
      requestParams[keyRequestParam] = true
    }

    const intRequestParams = {
      'integration.request.path.object': keyRequestParam,
      'integration.request.path.bucket': {
        'Fn::Sub': [
          "'${bucket}'",
          {
            bucket: {
              Ref: 'MyBucket'
            }
          }
        ]
      }
    }

    const responseParams = {
      'method.response.header.Content-Type': true,
      'method.response.header.Date': true
    }

    const intResponseParams = {
      'method.response.header.Content-Type': 'integration.response.header.Content-Type',
      'method.response.header.Date': 'integration.response.header.Date'
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethods3Delete',
      method: 'DELETE',
      intMethod: 'DELETE',
      requestParams,
      intRequestParams,
      responseParams,
      intResponseParams
    })
  }

  it('should create corresponding resources when s3 DeleteObject proxy is given with a path key', () => {
    testDeleteObject({ pathParam: 'key' }, 'method.request.path.key')
  })

  it('should create corresponding resources when s3 DeleteObject proxy is given with a query string key', () => {
    testDeleteObject({ queryStringParam: 'key' }, 'method.request.querystring.key')
  })

  it('should create corresponding resources when s3 DeleteObject proxy is given with a static key', () => {
    testDeleteObject('myKey', "'myKey'")
  })

  it('should create corresponding resources when a s3 proxy is given with cors', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http: {
            path: 's3',
            method: 'post',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'PutObject',
            key: {
              pathParam: 'key'
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
            },
            auth: { authorizationType: 'NONE' }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethods3Post: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {
            'method.request.header.Content-Type': true,
            'method.request.path.key': true
          },
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceS3' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            Type: 'AWS',
            IntegrationHttpMethod: 'PUT',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:s3:path/{bucket}/{object}',
                {}
              ]
            },
            PassthroughBehavior: 'WHEN_NO_MATCH',
            RequestParameters: {
              'integration.request.header.Content-Type': 'method.request.header.Content-Type',
              'integration.request.header.x-amz-acl': "'authenticated-read'",
              'integration.request.path.bucket': {
                'Fn::Sub': [
                  "'${bucket}'",
                  {
                    bucket: {
                      Ref: 'MyBucket'
                    }
                  }
                ]
              },
              'integration.request.path.object': 'method.request.path.key'
            },
            IntegrationResponses: [
              {
                StatusCode: 400,
                SelectionPattern: '4\\d{2}',
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: '5\\d{2}',
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              },
              {
                StatusCode: 200,
                SelectionPattern: '2\\d{2}',
                ResponseParameters: {
                  'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                  'method.response.header.Content-Length':
                    'integration.response.header.Content-Length',
                  'method.response.header.Access-Control-Allow-Origin': "'*'"
                },
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
                'method.response.header.Content-Type': true,
                'method.response.header.Content-Length': true
              },
              ResponseModels: {},
              StatusCode: 200
            },
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': true },
              ResponseModels: {},
              StatusCode: 400
            },
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': true },
              ResponseModels: {},
              StatusCode: 500
            }
          ]
        }
      }
    })
  })

  it('should create corresponding resources when a s3 proxy is given with private', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http: {
            path: 's3',
            method: 'post',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'PutObject',
            key: {
              pathParam: 'key'
            },
            private: true,
            auth: { authorizationType: 'NONE' }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethods3Post: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {
            'method.request.header.Content-Type': true,
            'method.request.path.key': true
          },
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: true,
          ResourceId: { Ref: 'ApiGatewayResourceS3' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            Type: 'AWS',
            IntegrationHttpMethod: 'PUT',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:s3:path/{bucket}/{object}',
                {}
              ]
            },
            PassthroughBehavior: 'WHEN_NO_MATCH',
            RequestParameters: {
              'integration.request.header.Content-Type': 'method.request.header.Content-Type',
              'integration.request.header.x-amz-acl': "'authenticated-read'",
              'integration.request.path.bucket': {
                'Fn::Sub': [
                  "'${bucket}'",
                  {
                    bucket: {
                      Ref: 'MyBucket'
                    }
                  }
                ]
              },
              'integration.request.path.object': 'method.request.path.key'
            },
            IntegrationResponses: [
              {
                StatusCode: 400,
                SelectionPattern: '4\\d{2}',
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: '5\\d{2}',
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 200,
                SelectionPattern: '2\\d{2}',
                ResponseParameters: {
                  'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                  'method.response.header.Content-Length':
                    'integration.response.header.Content-Length'
                },
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: {
                'method.response.header.Content-Type': true,
                'method.response.header.Content-Length': true
              },
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

  const testAuthorization = (auth) => {
    const http = {
      path: 's3',
      method: 'get',
      bucket: {
        Ref: 'MyBucket'
      },
      action: 'GetObject',
      key: { pathParam: 'key' },
      auth
    }

    const requestParams = { 'method.request.path.key': true }

    const intRequestParams = {
      'integration.request.path.object': 'method.request.path.key',
      'integration.request.path.bucket': {
        'Fn::Sub': [
          "'${bucket}'",
          {
            bucket: {
              Ref: 'MyBucket'
            }
          }
        ]
      }
    }

    const responseParams = {
      'method.response.header.content-type': true,
      'method.response.header.Content-Type': true
    }

    const intResponseParams = {
      'method.response.header.content-type': 'integration.response.header.content-type',
      'method.response.header.Content-Type': 'integration.response.header.Content-Type'
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethods3Get',
      method: 'GET',
      intMethod: 'GET',
      requestParams,
      intRequestParams,
      responseParams,
      intResponseParams
    })
  }

  it('should create corresponding resources with "NONE" authorization type', () => {
    testAuthorization({ authorizationType: 'NONE' })
  })

  it('should create corresponding resources with "CUSTOM" authorization type', () => {
    testAuthorization({ authorizationType: 'CUSTOM', authorizerId: { Ref: 'AuthorizerLogicalId' } })
  })

  it('should create corresponding resources with "AWS_IAM" authorization type', () => {
    testAuthorization({ authorizationType: 'AWS_IAM' })
  })

  it('should create corresponding resources with "AWS_IAM" authorization type', () => {
    testAuthorization({ authorizationType: 'COGNITO_USER_POOLS', authorizationScopes: ['admin'] })
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
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  const testRequestParameters = (requestParametersOverride) => {
    const http = {
      path: 's3',
      method: 'post',
      bucket: {
        Ref: 'MyBucket'
      },
      action: 'PutObject',
      auth: { authorizationType: 'NONE' },
      requestParameters: requestParametersOverride
    }

    const requestParams = {
      'method.request.header.Content-Type': true
    }

    const intRequestParams = {
      'integration.request.path.bucket': {
        'Fn::Sub': [
          "'${bucket}'",
          {
            bucket: {
              Ref: 'MyBucket'
            }
          }
        ]
      },
      'integration.request.header.x-amz-acl': "'authenticated-read'",
      'integration.request.header.Content-Type': 'method.request.header.Content-Type'
    }

    const responseParams = {
      'method.response.header.Content-Type': true,
      'method.response.header.Content-Length': true
    }

    const intResponseParams = {
      'method.response.header.Content-Type': 'integration.response.header.Content-Type',
      'method.response.header.Content-Length': 'integration.response.header.Content-Length'
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethods3Post',
      method: 'POST',
      intMethod: 'PUT',
      requestParams: requestParams,
      intRequestParams: _.merge(intRequestParams, requestParametersOverride),
      responseParams,
      intResponseParams
    })
  }

  it('should add custom request parameters mapping', () => {
    testRequestParameters({ 'integration.request.path.object': 'context.requestId' })
  })

  it('should set Credentials to roleArn when a custom role is configured', () => {
    const http = {
      path: 's3',
      method: 'post',
      bucket: {
        Ref: 'MyBucket'
      },
      action: 'PutObject',
      auth: { authorizationType: 'NONE' },
      roleArn: 'roleArn'
    }
    const resource = serverlessApigatewayServiceProxy.getS3MethodIntegration(http)
    expect(resource.Properties.Integration.Credentials).to.be.equal('roleArn')
  })

  it('should set RequestParameters to acceptParameters when configured', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http: {
            path: 's3',
            method: 'post',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'PutObject',
            key: {
              pathParam: 'key'
            },
            cors: true,
            auth: { authorizationType: 'NONE' },
            acceptParameters: { 'method.request.header.Custom-Header': false }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()

    expect(
      serverless.service.provider.compiledCloudFormationTemplate.Resources.ApiGatewayMethods3Post
        .Properties.RequestParameters
    ).to.be.deep.equal({
      'method.request.header.Custom-Header': false,
      'method.request.header.Content-Type': true,
      'method.request.path.key': true
    })
  })

  it('should create corresponding resources when s3 GetObject proxy is given with path override', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http: {
            path: '/{folder}/{item}',
            method: 'get',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'GetObject',
            key: {
              pathParam: 'item'
            },
            pathOverride: '{folder}/{item}.xml',
            auth: { authorizationType: 'NONE' },
            requestParameters: {
              'integration.request.path.folder': 'method.request.path.folder',
              'integration.request.path.item': 'method.request.path.item'
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      '/{folder}/{item}': {
        name: 'po',
        resourceLogicalId: 'ApiGatewayPathOverrideS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodpoGet: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'GET',
          RequestParameters: {
            'method.request.path.folder': true,
            'method.request.path.item': true
          },
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayPathOverrideS3' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            Type: 'AWS',
            IntegrationHttpMethod: 'GET',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:s3:path/{bucket}/{folder}/{item}.xml',
                {}
              ]
            },
            PassthroughBehavior: 'WHEN_NO_MATCH',
            RequestParameters: {
              'integration.request.path.bucket': {
                'Fn::Sub': [
                  "'${bucket}'",
                  {
                    bucket: {
                      Ref: 'MyBucket'
                    }
                  }
                ]
              },
              'integration.request.path.object': 'method.request.path.item',
              'integration.request.path.folder': 'method.request.path.folder',
              'integration.request.path.item': 'method.request.path.item'
            },
            IntegrationResponses: [
              {
                StatusCode: 400,
                SelectionPattern: '4\\d{2}',
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: '5\\d{2}',
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 200,
                SelectionPattern: '2\\d{2}',
                ResponseParameters: {
                  'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                  'method.response.header.content-type': 'integration.response.header.content-type'
                },
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: {
                'method.response.header.Content-Type': true,
                'method.response.header.content-type': true
              },
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

  it('should create corresponding resources when s3 GetObject proxy is given with a greedy path override', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http: {
            path: '/{myPath+}',
            method: 'get',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'GetObject',
            key: {
              pathParam: 'myPath'
            },
            pathOverride: '{myPath}.xml',
            auth: { authorizationType: 'NONE' },
            requestParameters: {
              'integration.request.path.myPath': 'method.request.path.myPath'
            }
          }
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      '/{myPath+}': {
        name: 'greedyPath',
        resourceLogicalId: 'ApiGatewayPathOverrideS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodgreedyPathGet: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'GET',
          RequestParameters: {
            'method.request.path.myPath': true
          },
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayPathOverrideS3' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            Type: 'AWS',
            IntegrationHttpMethod: 'GET',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn'] },
            Uri: {
              'Fn::Sub': [
                'arn:${AWS::Partition}:apigateway:${AWS::Region}:s3:path/{bucket}/{myPath}.xml',
                {}
              ]
            },
            PassthroughBehavior: 'WHEN_NO_MATCH',
            RequestParameters: {
              'integration.request.path.bucket': {
                'Fn::Sub': [
                  "'${bucket}'",
                  {
                    bucket: {
                      Ref: 'MyBucket'
                    }
                  }
                ]
              },
              'integration.request.path.object': 'method.request.path.myPath',
              'integration.request.path.myPath': 'method.request.path.myPath'
            },
            IntegrationResponses: [
              {
                StatusCode: 400,
                SelectionPattern: '4\\d{2}',
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: '5\\d{2}',
                ResponseParameters: {},
                ResponseTemplates: {}
              },
              {
                StatusCode: 200,
                SelectionPattern: '2\\d{2}',
                ResponseParameters: {
                  'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                  'method.response.header.content-type': 'integration.response.header.content-type'
                },
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: {
                'method.response.header.Content-Type': true,
                'method.response.header.content-type': true
              },
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
})
