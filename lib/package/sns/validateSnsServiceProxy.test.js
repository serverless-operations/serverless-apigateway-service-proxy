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

  it('should throw error if the "topicName" property doesn\'t exist', async () => {
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

  it('should throw error if the "topicName" property is not a string or an AWS intrinsic function', async () => {
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

  it('should throw error if the "topicName" property is missing the AWS intrinsic function "Fn::GetAtt"', async () => {
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

  it('should throw error if the "topicName" property is an intrinsic function "Fn::GetAtt" but specifies a property other than TopicName', async () => {
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
