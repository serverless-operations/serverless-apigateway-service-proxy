'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
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

  it('should create corresponding resources when kinesis proxies are given', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post'
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

    await expect(serverlessApigatewayServiceProxy.compileMethodsToKinesis()).to.be.fulfilled

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Join': [
                '',
                ['arn:aws:apigateway:', { Ref: 'AWS::Region' }, ':kinesis:action/PutRecord']
              ]
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Join': [
                  '',
                  [
                    '{',
                    '"StreamName": "',
                    '"myStream"',
                    '",',
                    '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
                    '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
                    '}'
                  ]
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Join': [
                  '',
                  [
                    '{',
                    '"StreamName": "',
                    '"myStream"',
                    '",',
                    '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
                    '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
                    '}'
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
              }
            ]
          },
          MethodResponses: [
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 200 },
            { ResponseParameters: {}, ResponseModels: {}, StatusCode: 400 }
          ]
        }
      }
    })
  })

  it('should create corresponding resources when kinesis proxies are given with cors', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post',
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

    await expect(serverlessApigatewayServiceProxy.compileMethodsToKinesis()).to.be.fulfilled

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodkinesisPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceKinesis' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn'] },
            Uri: {
              'Fn::Join': [
                '',
                ['arn:aws:apigateway:', { Ref: 'AWS::Region' }, ':kinesis:action/PutRecord']
              ]
            },
            PassthroughBehavior: 'NEVER',
            RequestTemplates: {
              'application/json': {
                'Fn::Join': [
                  '',
                  [
                    '{',
                    '"StreamName": "',
                    '"myStream"',
                    '",',
                    '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
                    '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
                    '}'
                  ]
                ]
              },
              'application/x-www-form-urlencoded': {
                'Fn::Join': [
                  '',
                  [
                    '{',
                    '"StreamName": "',
                    '"myStream"',
                    '",',
                    '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
                    '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
                    '}'
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
            }
          ]
        }
      }
    })
  })

  it('should return the default template for application/json when one is not given', async () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/x-www-form-urlencoded': 'custom template'
        }
      }
    }

    const resource = await serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )

    expect(
      resource.Properties.Integration.RequestTemplates['application/json']['Fn::Join']
    ).to.be.deep.equal([
      '',
      [
        '{',
        '"StreamName": "',
        '"undefined"',
        '",',
        '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
        '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
        '}'
      ]
    ])
  })

  it('should return a custom template for application/json when one is given', async () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/json': 'custom template'
        }
      }
    }
    const resource = await serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithRequestTemplate
    )
    expect(resource.Properties.Integration.RequestTemplates['application/json']).to.be.equal(
      'custom template'
    )
  })

  it('should return the default for application/x-www-form-urlencoded when one is not given', async () => {
    const httpWithoutRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/json': 'custom template'
        }
      }
    }
    const resource = await serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithoutRequestTemplate
    )
    expect(
      resource.Properties.Integration.RequestTemplates['application/x-www-form-urlencoded'][
        'Fn::Join'
      ]
    ).to.be.deep.equal([
      '',
      [
        '{',
        '"StreamName": "',
        '"undefined"',
        '",',
        '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
        '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
        '}'
      ]
    ])
  })

  it('should return a custom template for application/x-www-form-urlencoded when one is given', async () => {
    const httpWithRequestTemplate = {
      path: 'foo/bar1',
      method: 'post',
      request: {
        template: {
          'application/x-www-form-urlencoded': 'custom template'
        }
      }
    }
    const resource = await serverlessApigatewayServiceProxy.getKinesisMethodIntegration(
      httpWithRequestTemplate
    )
    expect(
      resource.Properties.Integration.RequestTemplates['application/x-www-form-urlencoded']
    ).to.be.equal('custom template')
  })

  it('should not create corresponding resources when other proxies are given', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            streamName: 'myStream',
            path: 'kinesis',
            method: 'post'
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

    await expect(serverlessApigatewayServiceProxy.compileMethodsToKinesis()).to.be.fulfilled
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
