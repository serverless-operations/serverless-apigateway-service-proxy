'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileIamRoleToS3()', () => {
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

  it('should create corresponding resources when S3 proxies are given', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          s3: {
            path: '/s3/v1',
            method: 'post',
            bucket: 'myBucket',
            action: 'PutObject',
            key: 'myKey'
          }
        },
        {
          s3: {
            path: '/s3/v1',
            method: 'get',
            bucket: 'myBucket',
            action: 'GetObject',
            key: 'myKey'
          }
        },
        {
          s3: {
            path: '/s3/v1',
            method: 'delete',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'DeleteObject',
            key: 'myKey'
          }
        },
        {
          s3: {
            path: '/s3/v2',
            method: 'post',
            bucket: 'myBucketV2',
            action: 'PutObject',
            key: 'myKey'
          },
          sqs: {
            path: '/sqs',
            method: 'post'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApigatewayToS3Role: {
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
              PolicyName: 'apigatewaytos3',
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
                    Action: 's3:PutObject*',
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
                          {
                            'Fn::Sub': [
                              'arn:${AWS::Partition}:s3:::${bucket}',
                              {
                                bucket: 'myBucket'
                              }
                            ]
                          },
                          '/*'
                        ]
                      ]
                    }
                  },
                  {
                    Effect: 'Allow',
                    Action: 's3:GetObject*',
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
                          {
                            'Fn::Sub': [
                              'arn:${AWS::Partition}:s3:::${bucket}',
                              {
                                bucket: 'myBucket'
                              }
                            ]
                          },
                          '/*'
                        ]
                      ]
                    }
                  },
                  {
                    Effect: 'Allow',
                    Action: 's3:DeleteObject*',
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
                          {
                            'Fn::GetAtt': ['MyBucket', 'Arn']
                          },
                          '/*'
                        ]
                      ]
                    }
                  },
                  {
                    Effect: 'Allow',
                    Action: 's3:PutObject*',
                    Resource: {
                      'Fn::Join': [
                        '',
                        [
                          {
                            'Fn::Sub': [
                              'arn:${AWS::Partition}:s3:::${bucket}',
                              {
                                bucket: 'myBucketV2'
                              }
                            ]
                          },
                          '/*'
                        ]
                      ]
                    }
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

    serverlessApigatewayServiceProxy.compileIamRoleToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })

  it('should not create default role if all proxies have a custom role', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          s3: {
            path: '/s3/v1',
            method: 'post',
            bucket: 'myBucket',
            action: 'PutObject',
            key: 'myKey',
            roleArn: 'roleArn1'
          }
        },
        {
          s3: {
            path: '/s3/v1',
            method: 'get',
            bucket: 'myBucket',
            action: 'GetObject',
            key: 'myKey',
            roleArn: 'roleArn2'
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToS3()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
