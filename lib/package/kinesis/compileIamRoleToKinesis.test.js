'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileIamRoleToKinesis()', () => {
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
          kinesis: {
            path: '/kinesis1',
            method: 'post',
            streamName: { Ref: 'KinesisStream1' }
          }
        },
        {
          kinesis: {
            path: '/kinesis2',
            method: 'post',
            streamName: { Ref: 'KinesisStream2' }
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

    serverlessApigatewayServiceProxy.compileIamRoleToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApigatewayToKinesisRole: {
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
              PolicyName: 'apigatewaytokinesis',
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
                    Action: ['kinesis:PutRecord', 'kinesis:PutRecords'],
                    Resource: [
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:kinesis:${AWS::Region}:${AWS::AccountId}:stream/${streamName}',
                          { streamName: { Ref: 'KinesisStream1' } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:${AWS::Partition}:kinesis:${AWS::Region}:${AWS::AccountId}:stream/${streamName}',
                          { streamName: { Ref: 'KinesisStream2' } }
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

    serverlessApigatewayServiceProxy.compileIamRoleToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should not create default role if all proxies have a custom role', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis1',
            method: 'post',
            streamName: { Ref: 'KinesisStream1' },
            roleArn: 'roleArn1'
          }
        },
        {
          kinesis: {
            path: '/kinesis2',
            method: 'post',
            streamName: { Ref: 'KinesisStream2' },
            roleArn: 'roleArn2'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToKinesis()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
