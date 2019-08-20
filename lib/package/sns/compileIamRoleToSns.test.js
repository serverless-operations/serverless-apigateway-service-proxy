'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
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

  it('should create corresponding resources', async () => {
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
                          'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
                          { topicName: { 'Fn::GetAtt': ['SNSTopic1', 'TopicName'] } }
                        ]
                      },
                      {
                        'Fn::Sub': [
                          'arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}',
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

  it('should not create corresponding resources when other proxies are given', async () => {
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
})
