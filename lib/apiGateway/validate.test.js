'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../index')

chai.use(require('chai-as-promised'))
const expect = require('chai').expect

describe('#validateServiceProxies()', () => {
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

  it('should reject an invalid proxies', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          xxxxx: {
            path: '/kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Invalid APIG proxy "xxxxx". This plugin supported Proxies are: kinesis, sqs.'
    )
  })
})
