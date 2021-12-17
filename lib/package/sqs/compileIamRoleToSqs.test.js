'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileIamRoleToSqs()', () => {
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

  it('should create corresponding resources when kinesis proxies are given', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs1',
            method: 'post',
            queueName: { 'Fn::GetAtt': ['SQSQueue1', 'QueueName'] }
          }
        },
        {
          sqs: {
            path: '/sqs2',
            method: 'post',
            queueName: { 'Fn::GetAtt': ['SQSQueue2', 'QueueName'] }
          }
        },
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            streamName: { Ref: 'KinesisStream' }
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApigatewayToSqsRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: 'apigateway.amazonaws.com'
                },
                Action: 'sts:AssumeRole'
              }
            ]
          },
          Policies: [
            {
              PolicyName: 'apigatewaytosqs',
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
                    Action: ['sqs:SendMessage'],
                    Resource: [
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:sqs:${AWS::Region}:${AWS::AccountId}:${queueName}',
                          { queueName: { 'Fn::GetAtt': ['SQSQueue1', 'QueueName'] } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:sqs:${AWS::Region}:${AWS::AccountId}:${queueName}',
                          { queueName: { 'Fn::GetAtt': ['SQSQueue2', 'QueueName'] } }
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
          kinesis: {
            path: '/sqs',
            method: 'post'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should not create default role if all proxies have a custom role', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs1',
            method: 'post',
            queueName: { 'Fn::GetAtt': ['SQSQueue1', 'QueueName'] },
            roleArn: 'roleArn1'
          }
        },
        {
          sqs: {
            path: '/sqs2',
            method: 'post',
            queueName: { 'Fn::GetAtt': ['SQSQueue2', 'QueueName'] },
            roleArn: 'roleArn2'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToSqs()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
