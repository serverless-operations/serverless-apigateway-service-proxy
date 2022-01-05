'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileIamRoleToSns()', () => {
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

  it('should create corresponding resources', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sns: {
            path: '/sns1',
            method: 'post',
            topicName: { 'Fn::GetAtt': ['SNSTopic1', 'TopicName'] }
          }
        },
        {
          sns: {
            path: '/sns2',
            method: 'post',
            topicName: { 'Fn::GetAtt': ['SNSTopic2', 'TopicName'] }
          }
        },
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            streamName: { Ref: 'KinesisStream' }
          }
        },
        {
          sqs: {
            path: '/sqs',
            method: 'post',
            queueName: { 'Fn::GetAtt': ['SQSQueue', 'QueueName'] }
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApigatewayToSnsRole: {
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
              PolicyName: 'apigatewaytosns',
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
                    Action: ['sns:Publish'],
                    Resource: [
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                          { topicName: { 'Fn::GetAtt': ['SNSTopic1', 'TopicName'] } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                          { topicName: { 'Fn::GetAtt': ['SNSTopic2', 'TopicName'] } }
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
            path: '/kinesis',
            method: 'post'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should not create default role if all proxies have a custom role', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sns: {
            path: '/sns1',
            method: 'post',
            topicName: { 'Fn::GetAtt': ['SNSTopic1', 'TopicName'] },
            roleArn: 'roleArn1'
          }
        },
        {
          sns: {
            path: '/sns2',
            method: 'post',
            topicName: { 'Fn::GetAtt': ['SNSTopic2', 'TopicName'] },
            roleArn: 'roleArn2'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToSns()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
