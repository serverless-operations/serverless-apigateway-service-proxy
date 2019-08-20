'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
const expect = require('chai').expect

describe('#validateSnsServiceProxy()', () => {
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

  it('should validate the "topicName" property existence', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            path: 'sns',
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateSnsServiceProxy()).to.throw(
      serverless.classes.Error
    )
  })

  it('should validate the "topicName" property if it is string or AWS intrinsic function', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: ['xx', 'yy'],
            path: 'sns',
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateSnsServiceProxy()).to.throw(
      serverless.classes.Error
    )
  })

  it('should validate the "topicName" property that AWS intrinsic function is correct syntax', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: { xxx: 'SNSResourceId' },
            path: 'sns',
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateSnsServiceProxy()).to.throw(
      serverless.classes.Error
    )
  })

  it('should validate the "topicName" property if wrong AWS intrinsic function is specified', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: { 'Fn::GetAtt': ['SNSResourceId', 'Arn'] },
            path: 'sns',
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateSnsServiceProxy()).to.throw(
      serverless.classes.Error
    )
  })

  it('should not show error if topicName is valid string', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: 'someTopicName',
            path: 'sns',
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateSnsServiceProxy()).to.not.throw()
  })

  it('should not show error if topicName is valid intrinsic function', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'sns',
          http: {
            topicName: { 'Fn::GetAtt': ['SNSResourceId', 'TopicName'] },
            path: 'sns',
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateSnsServiceProxy()).to.not.throw()
  })
})
