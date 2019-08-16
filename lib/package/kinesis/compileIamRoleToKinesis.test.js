'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
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

  it('should create corresponding resources when kinesis proxies are given', async () => {
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

    await expect(serverlessApigatewayServiceProxy.compileIamRoleToKinesis()).to.be.fulfilled
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
                    Action: ['kinesis:PutRecord'],
                    Resource: [
                      {
                        'Fn::Sub': [
                          'arn:aws:kinesis:${AWS::Region}:${AWS::AccountId}:stream/${streamName}',
                          { streamName: { Ref: 'KinesisStream1' } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:aws:kinesis:${AWS::Region}:${AWS::AccountId}:stream/${streamName}',
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

  it('should not create corresponding resources when other proxies are given', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.compileIamRoleToKinesis()).to.be.fulfilled
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
