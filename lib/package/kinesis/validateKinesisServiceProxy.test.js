'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('chai-as-promised'))
const expect = require('chai').expect

describe('#validateKinesisServiceProxy()', () => {
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

  it('should validate the "streamName" property', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            path: 'kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateKinesisServiceProxy()).to.be.rejectedWith(
      'Missing "streamName" property in Kinesis Service Proxy'
    )
  })

  it('should validate the "streamName" property if it is string or AWS intrinsic function', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: ['xx', 'yy'],
            path: 'kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateKinesisServiceProxy()).to.be.rejectedWith(
      'You can only set "string" or the AWS intrinsic function "Ref" like { Ref: \'KinesisStreamResourceId\' } as a streamName property'
    )
  })

  it('should validate the "streamName" property if AWS intrinsic function is correct syntax', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: { xxx: 'KinesisStreamResourceId' },
            path: 'kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateKinesisServiceProxy()).to.be.rejectedWith(
      'the AWS intrinsic function need "Ref" property like { Ref: \'KinesisStreamResourceId\' } as a streamName'
    )
  })

  it('should not show error if streamName is correct', async () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: { Ref: 'KinesisStreamResourceId' },
            path: 'kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateKinesisServiceProxy()).to.be.fulfilled

    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'kinesis',
          http: {
            streamName: 'yourStream',
            path: 'kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateKinesisServiceProxy()).to.be.fulfilled
  })
})
