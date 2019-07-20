'use strict'

const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./index')

describe('#getAllServiceProxies()', () => {
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
    serverlessApigatewayServiceProxy = new ServerlessApigatewayServiceProxy(serverless, options)
  })

  it('should return this plugin configutration', () => {
    serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post'
          }
        }
      ]
    }

    expect(serverlessApigatewayServiceProxy.getAllServiceProxies()).to.deep.equal([
      {
        kinesis: {
          path: '/kinesis',
          method: 'post'
        }
      }
    ])
  })

  it('should return empty if no configuration', () => {
    expect(serverlessApigatewayServiceProxy.getAllServiceProxies()).to.be.empty
  })
})
