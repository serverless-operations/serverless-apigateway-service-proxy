'use strict'

const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('../index')

describe('#compileUsagePlan()', () => {
  let serverless
  let serverlessApigatewayServiceProxy

  beforeEach(() => {
    serverless = new Serverless()
    const options = {
      stage: 'dev',
      region: 'us-east-1'
    }
    serverless.service.service = 'first-service'
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
    serverlessApigatewayServiceProxy.apiGatewayDeploymentLogicalId = 'ApiGatewayDeploymentTest'
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
  })

  it('should compile default usage plan resource', () => {
    serverless.service.provider.apiKeys = ['1234567890']
    return serverlessApigatewayServiceProxy.compileUsagePlan().then(() => {
      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()].Type
      ).to.equal('AWS::ApiGateway::UsagePlan')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .DependsOn
      ).to.equal('ApiGatewayDeploymentTest')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.ApiStages[0].ApiId.Ref
      ).to.equal('ApiGatewayRestApi')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.ApiStages[0].Stage
      ).to.equal('dev')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.Description
      ).to.equal('Usage plan for first-service dev stage')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.UsagePlanName
      ).to.equal('first-service-dev')
    })
  })

  it('should compile custom usage plan resource', () => {
    serverless.service.provider.usagePlan = {
      quota: {
        limit: 500,
        offset: 10,
        period: 'MONTH'
      },
      throttle: {
        burstLimit: 200,
        rateLimit: 100
      }
    }

    return serverlessApigatewayServiceProxy.compileUsagePlan().then(() => {
      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()].Type
      ).to.equal('AWS::ApiGateway::UsagePlan')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .DependsOn
      ).to.equal('ApiGatewayDeploymentTest')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.ApiStages[0].ApiId.Ref
      ).to.equal('ApiGatewayRestApi')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.ApiStages[0].Stage
      ).to.equal('dev')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.Description
      ).to.equal('Usage plan for first-service dev stage')

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.Quota
      ).to.deep.equal({
        Limit: 500,
        Offset: 10,
        Period: 'MONTH'
      })

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.Throttle
      ).to.deep.equal({
        BurstLimit: 200,
        RateLimit: 100
      })

      expect(
        serverlessApigatewayServiceProxy.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[serverlessApigatewayServiceProxy.provider.naming.getUsagePlanLogicalId()]
          .Properties.UsagePlanName
      ).to.equal('first-service-dev')
    })
  })
})
