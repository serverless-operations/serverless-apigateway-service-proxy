'use strict'

const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

describe('#validateS3ServiceProxy()', () => {
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

  const genEvent = (key, value, ...missing) => {
    const proxy = {
      serviceName: 's3',
      http: {
        action: 'GetObject',
        bucket: 'myBucket',
        key: 'myKey',
        path: 's3',
        method: 'post'
      }
    }

    proxy.http[key] = value
    missing.forEach((k) => delete proxy.http[k])
    return proxy
  }

  const shouldError = (key, value) => {
    serverlessApigatewayServiceProxy.validated = {
      events: [genEvent(key, value)]
    }

    expect(() => serverlessApigatewayServiceProxy.validateS3ServiceProxy()).throws(
      serverless.classes.Error
    )
  }

  const shouldSuceed = (key, value) => {
    serverlessApigatewayServiceProxy.validated = {
      events: [genEvent(key, value)]
    }

    serverlessApigatewayServiceProxy.validateS3ServiceProxy()
  }

  it('should error if the "bucket" property is missing', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [genEvent(null, null, 'bucket')]
    }

    expect(() => serverlessApigatewayServiceProxy.validateS3ServiceProxy()).throws(
      serverless.classes.Error
    )
  })

  it('should succeed if the "bucket" property is string or AWS Ref function', () => {
    shouldSuceed('bucket', 'x')
    shouldSuceed('bucket', { Ref: 'x' })
  })

  it('should error if the "bucket" property if AWS Ref function is invalid', () => {
    shouldError('bucket', { xxx: 's3Bucket' })
    shouldError('bucket', { Ref: ['s3Bucket', 'Arn'] })
    shouldError('bucket', ['xx', 'yy'])
    shouldError('bucket', { 'Fn::GetAtt': ['x', 'Arn'] })
  })

  it('should error if the "action" property is missing', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [genEvent(null, null, 'action')]
    }

    expect(() => serverlessApigatewayServiceProxy.validateS3ServiceProxy()).throws(
      serverless.classes.Error
    )
  })

  it('should error if the "action" property is not one of the allowed values', () => {
    shouldError('action', ['x']) // arrays
    shouldError('action', { Ref: 'x' }) // object
    shouldError('action', 'ListObjects') // invalid actions
  })

  it('should succeed if the "action" property is one of the allowed values', () => {
    shouldSuceed('action', 'GetObject')
    shouldSuceed('action', 'PutObject')
    shouldSuceed('action', 'DeleteObject')
  })

  it('should error the "key" property is missing', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [genEvent(null, null, 'key')]
    }

    expect(() => serverlessApigatewayServiceProxy.validateS3ServiceProxy()).throws(
      serverless.classes.Error
    )
  })

  it('should succeed if the "key" property is string or valid object', () => {
    shouldSuceed('key', 'myKey')
    shouldSuceed('key', { pathParam: 'myKey' })
    shouldSuceed('key', { queryStringParam: 'myKey' })
  })

  it('should error if the "key" property specifies both pathParam and queryStringParam', () => {
    shouldError('key', { pathParam: 'myKey', queryStringParam: 'myKey' })
  })

  it('should error if the "key" property is not a string or valid object', () => {
    shouldError('key', ['x'])
    shouldError('key', { param: 'myKey' })
  })
})
