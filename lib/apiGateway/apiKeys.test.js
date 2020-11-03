'use strict'

const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('../index')

describe('#methods()', () => {
  let serverless
  let serverlessApigatewayServiceProxy

  beforeEach(() => {
    serverless = new Serverless()
    const options = {
      stage: 'dev',
      region: 'us-east-1'
    }
    serverless.setProvider('aws', new AwsProvider(serverless))
    serverless.service.provider.apiKeys = ['1234567890']
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {}
    }
    serverlessApigatewayServiceProxy = new ServerlessApigatewayServiceProxy(serverless, options)
    serverlessApigatewayServiceProxy.serverless.service.stepFunctions = {
      stateMachines: {
        first: {}
      }
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayDeploymentLogicalId = 'ApiGatewayDeploymentTest'
  })

  it('should compile api key resource', () =>
    serverlessApigatewayServiceProxy.compileApiKeys().then(() => {
      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getApiKeyLogicalId(1)].Type
      ).to.equal('AWS::ApiGateway::ApiKey')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getApiKeyLogicalId(1)]
          .Properties.Enabled
      ).to.equal(true)

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getApiKeyLogicalId(1)]
          .Properties.Name
      ).to.equal('1234567890')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getApiKeyLogicalId(1)]
          .Properties.StageKeys[0].RestApiId.Ref
      ).to.equal('ApiGatewayRestApi')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getApiKeyLogicalId(1)]
          .Properties.StageKeys[0].StageName
      ).to.equal('dev')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getApiKeyLogicalId(1)]
          .DependsOn
      ).to.equal('ApiGatewayDeploymentTest')
    }))

  it('throw error if apiKey property is not an array', () => {
    serverlessApigatewayServiceProxy.serverless.service.provider.apiKeys = 2
    expect(() => serverlessApigatewayServiceProxy.compileApiKeys()).to.throw(Error)
  })

  it('throw error if an apiKey is not a string', () => {
    serverlessApigatewayServiceProxy.serverless.service.provider.apiKeys = [2]
    expect(() => serverlessApigatewayServiceProxy.compileApiKeys()).to.throw(Error)
  })
})
