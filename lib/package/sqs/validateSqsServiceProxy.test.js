'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
const expect = require('chai').expect

describe('#validateSqsServiceProxy()', () => {
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

  it('should validate the "queueName" property', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            path: 'sqs',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateSqsServiceProxy()).to.be.rejectedWith(
      'Missing "queueName" property in SQS Service Proxy'
    )
  })

  it('should validate the "queueName" property if it is string or AWS intrinsic function', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: ['xx', 'yy'],
            path: 'sqs',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateSqsServiceProxy()).to.be.rejectedWith(
      'You can only set "string" or the AWS "Fn::GetAtt" intrinsic function like { Fn::GetAtt: [ "SQSQueueResourceId", "QueueName" ] }} as a queueName property'
    )
  })

  it('should validate the "queueName" property if AWS intrinsic function is correct syntax', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: { xxx: 'sqsStreamResourceId' },
            path: 'sqs',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateSqsServiceProxy()).to.be.rejectedWith(
      'the AWS intrinsic function needs "Fn::GetAtt" like { Fn::GetAtt: [ "SQSQueueResourceId", "QueueName" ] }} as a queueName property'
    )
  })

  it('should not show error if queueName is correct', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: { 'Fn::GetAtt': ['SQSQueueResourceId', 'QueueName'] },
            path: 'sqs',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateSqsServiceProxy()).to.be.fulfilled

    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sqs',
          http: {
            queueName: 'yourQueue',
            path: 'sqs',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateSqsServiceProxy()).to.be.fulfilled
  })
})
