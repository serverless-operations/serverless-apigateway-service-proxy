'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
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

  it('should create corresponding resources when kinesis proxies are given', async () => {
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

    await expect(serverlessApigatewayServiceProxy.compileIamRoleToSqs()).to.be.fulfilled
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
                          'arn:aws:sqs:${AWS::Region}:${AWS::AccountId}:${queueName}',
                          { queueName: { 'Fn::GetAtt': ['SQSQueue1', 'QueueName'] } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:aws:sqs:${AWS::Region}:${AWS::AccountId}:${queueName}',
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

  it('should not create corresponding resources when other proxies are given', async () => {
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

    await expect(serverlessApigatewayServiceProxy.compileIamRoleToSqs()).to.be.fulfilled
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
