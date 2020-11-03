'use strict'

const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('../index')

describe('#compileUsagePlanKeys()', () => {
  let serverless
  let serverlessApigatewayServiceProxy

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1'
    }
    serverless = new Serverless()
    serverless.setProvider('aws', new AwsProvider(serverless, options))
    serverless.service.service = 'first-service'
    serverless.service.provider = {
      name: 'aws',
      apiKeys: ['1234567890']
    }
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {},
      Outputs: {}
    }
    serverlessApigatewayServiceProxy = new ServerlessApigatewayServiceProxy(serverless, options)
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayDeploymentLogicalId = 'ApiGatewayDeploymentTest'
    serverlessApigatewayServiceProxy.apiGatewayUsagePlanLogicalId = 'UsagePlan'
  })

  it('should compile usage plan key resource', () =>
    serverlessApigatewayServiceProxy.compileUsagePlanKeys().then(() => {
      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanKeyLogicalId(1)]
          .Type
      ).to.equal('AWS::ApiGateway::UsagePlanKey')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanKeyLogicalId(1)]
          .Properties.KeyId.Ref
      ).to.equal('ApiGatewayApiKey1')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanKeyLogicalId(1)]
          .Properties.KeyType
      ).to.equal('API_KEY')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanKeyLogicalId(1)]
          .Properties.UsagePlanId.Ref
      ).to.equal('UsagePlan')
    }))

  it('throw error if apiKey property is not an array', () => {
    serverlessApigatewayServiceProxy.serverless.service.provider.apiKeys = 2
    expect(() => serverlessApigatewayServiceProxy.compileUsagePlanKeys()).to.throw(Error)
  })

  it('throw error if an apiKey is not a string', () => {
    serverlessApigatewayServiceProxy.serverless.service.provider.apiKeys = [2]
    expect(() => serverlessApigatewayServiceProxy.compileUsagePlanKeys()).to.throw(Error)
  })
})
