'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('../../index')

const expect = require('chai').expect

describe('#compileIamRoleToEventBridge()', () => {
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

  it('should create corresponding resources when eventbridge proxies are given', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          eventbridge: {
            path: '/eventbridge1',
            method: 'post',
            eventBusName: { Ref: 'EventBus1' }
          }
        },
        {
          eventbridge: {
            path: '/eventbridge2',
            method: 'post',
            eventBusName: { Ref: 'EventBus2' }
          }
        },
        {
          sqs: {
            path: '/sqs',
            method: 'post',
            queueName: 'MyQueue'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApigatewayToEventBridgeRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'apigateway.amazonaws.com' },
                Action: 'sts:AssumeRole'
              }
            ]
          },
          Policies: [
            {
              PolicyName: 'apigatewaytoeventbridge',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                    Resource: '*'
                  },
                  {
                    Effect: 'Allow',
                    Action: ['events:PutEvents'],
                    Resource: [
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:event-bus/${eventBusName}',
                          { eventBusName: { Ref: 'EventBus1' } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:event-bus/${eventBusName}',
                          { eventBusName: { Ref: 'EventBus2' } }
                        ]
                      }
                    ]
                  }
                ]
              }
            }
          ]
        }
      }
    })
  })

  it('should not create corresponding resources when other proxies are given', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs',
            method: 'post'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should not create default role if all proxies have a custom role', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          eventbridge: {
            path: '/eventbridge1',
            method: 'post',
            eventBusName: { Ref: 'EventBus1' },
            roleArn: 'roleArn1'
          }
        },
        {
          eventbridge: {
            path: '/eventbridge2',
            method: 'post',
            eventBusName: { Ref: 'EventBus2' },
            roleArn: 'roleArn2'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToEventBridge()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
