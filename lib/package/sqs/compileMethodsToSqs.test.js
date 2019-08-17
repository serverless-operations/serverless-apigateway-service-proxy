'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
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

  it('should create corresponding resources when sqs proxies are given', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: 'myQueue',
            path: 'sqs',
            method: 'post'
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

    await expect(serverlessApigatewayServiceProxy.compileMethodsToSqs()).to.be.fulfilled
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Join': [
                '',
                [
                  'arn:aws:apigateway:',
                  { Ref: 'AWS::Region' },
                  ':sqs:path//',
                  { Ref: 'AWS::AccountId' },
                  '/',
                  '"myQueue"'
                ]
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

  it('should create corresponding resources when sqs proxies are given with cors', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: 'myQueue',
            path: 'sqs',
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
      sqs: {
        name: 'sqs',
        resourceLogicalId: 'ApiGatewayResourceSqs'
      }
    }

    await expect(serverlessApigatewayServiceProxy.compileMethodsToSqs()).to.be.fulfilled
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethodsqsPost: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {},
          AuthorizationType: 'NONE',
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceSqs' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            IntegrationHttpMethod: 'POST',
            Type: 'AWS',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn'] },
            Uri: {
              'Fn::Join': [
                '',
                [
                  'arn:aws:apigateway:',
                  { Ref: 'AWS::Region' },
                  ':sqs:path//',
                  { Ref: 'AWS::AccountId' },
                  '/',
                  '"myQueue"'
                ]
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
})
