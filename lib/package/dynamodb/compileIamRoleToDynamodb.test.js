'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#compileIamRoleToDynamodb()', () => {
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

  it('should create corresponding resources when Dynamodb proxies are given', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          dynamodb: {
            path: '/dynamodb/v1',
            tableName: { Ref: 'mytable' },
            method: 'post',
            action: 'PutItem',
            hashKey: {
              pathParam: 'id',
              attributeType: 'S'
            }
          }
        },
        {
          dynamodb: {
            path: '/dynamodb/v1',
            tableName: 'mytable',
            method: 'get',
            action: 'GetItem',
            hashKey: {
              queryStringParam: 'id'
            }
          }
        },
        {
          dynamodb: {
            path: '/dynamodb/v1',
            tableName: 'mytable',
            method: 'delete',
            action: 'DeleteItem',
            hashKey: {
              queryStringParam: 'id'
            }
          }
        }
      ]
    }

    serverlessApigatewayServiceProxy.compileIamRoleToDynamodb()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApigatewayToDynamodbRole: {
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
              PolicyName: 'apigatewaytodynamodb',
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
                    Action: 'dynamodb:PutItem',
                    Resource: {
                      'Fn::Sub': [
                        'arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tableName}',
                        {
                          tableName: { Ref: 'mytable' }
                        }
                      ]
                    }
                  },
                  {
                    Effect: 'Allow',
                    Action: 'dynamodb:GetItem',
                    Resource: {
                      'Fn::Sub': [
                        'arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tableName}',
                        {
                          tableName: 'mytable'
                        }
                      ]
                    }
                  },
                  {
                    Effect: 'Allow',
                    Action: 'dynamodb:DeleteItem',
                    Resource: {
                      'Fn::Sub': [
                        'arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tableName}',
                        {
                          tableName: 'mytable'
                        }
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

    serverlessApigatewayServiceProxy.compileIamRoleToDynamodb()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
  })
})
