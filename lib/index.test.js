'use strict'

const sinon = require('sinon')
const chai = require('chai')
const BbPromise = require('bluebird')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./index')

chai.use(require('chai-as-promised'))
chai.use(require('sinon-chai'))

const expect = chai.expect

describe('#index()', () => {
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

  describe('#constructor()', () => {
    it('should have hooks', () => expect(serverlessApigatewayServiceProxy.hooks).to.be.not.empty)

    it('should set the provider variable to an instance of AwsProvider', () =>
      expect(serverlessApigatewayServiceProxy.provider).to.be.instanceof(AwsProvider))

    it('should have access to the serverless instance', () =>
      expect(serverlessApigatewayServiceProxy.serverless).to.deep.equal(serverless))

    it('should set the options variable', () =>
      expect(serverlessApigatewayServiceProxy.options).to.deep.equal({
        stage: 'dev',
        region: 'us-east-1'
      }))

    it('should set the region variable', () =>
      expect(serverlessApigatewayServiceProxy.region).to.be.equal('us-east-1'))

    it('should set the stage variable', () =>
      expect(serverlessApigatewayServiceProxy.stage).to.be.equal('dev'))

    it('should run package:compileEvents in order', async () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'post'
            }
          },
          {
            sqs: {
              path: '/sqs',
              method: 'post'
            }
          },
          {
            s3: {
              path: '/s3',
              method: 'post'
            }
          },
          {
            sns: {
              path: '/sns',
              method: 'post'
            }
          }
        ]
      }

      const validateServiceProxiesStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'validateServiceProxies')
        .returns(BbPromise.resolve())
      const compileRestApiStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileRestApi')
        .returns(BbPromise.resolve())
      const compileResourcesStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileResources')
        .returns(BbPromise.resolve())
      const compileCorsStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileCors')
        .returns(BbPromise.resolve())
      const compileKinesisServiceProxyStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileKinesisServiceProxy')
        .returns(BbPromise.resolve())
      const compileSqsServiceProxyStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileSqsServiceProxy')
        .returns(BbPromise.resolve())
      const compileS3ServiceProxyStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileS3ServiceProxy')
        .returns(BbPromise.resolve())
      const compileSnsServiceProxyStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileSnsServiceProxy')
        .returns(BbPromise.resolve())
      const mergeDeploymentStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'mergeDeployment')
        .returns(BbPromise.resolve())

      await expect(
        serverlessApigatewayServiceProxy.hooks['package:compileEvents']()
      ).to.be.fulfilled.then(() => {
        expect(validateServiceProxiesStub.calledOnce).to.be.equal(true)
        expect(compileRestApiStub.calledOnce).to.be.equal(true)
        expect(compileResourcesStub.calledOnce).to.be.equal(true)
        expect(compileCorsStub.calledOnce).to.be.equal(true)
        expect(compileKinesisServiceProxyStub.calledOnce).to.be.equal(true)
        expect(compileSqsServiceProxyStub.calledOnce).to.be.equal(true)
        expect(compileS3ServiceProxyStub.calledOnce).to.be.equal(true)
        expect(compileSnsServiceProxyStub.calledOnce).to.be.equal(true)
        expect(mergeDeploymentStub.calledOnce).to.be.equal(true)
      })

      serverlessApigatewayServiceProxy.validateServiceProxies.restore()
      serverlessApigatewayServiceProxy.compileRestApi.restore()
      serverlessApigatewayServiceProxy.compileResources.restore()
      serverlessApigatewayServiceProxy.compileCors.restore()
      serverlessApigatewayServiceProxy.compileKinesisServiceProxy.restore()
      serverlessApigatewayServiceProxy.compileSqsServiceProxy.restore()
      serverlessApigatewayServiceProxy.compileS3ServiceProxy.restore()
      serverlessApigatewayServiceProxy.compileSnsServiceProxy.restore()
      serverlessApigatewayServiceProxy.mergeDeployment.restore()
    })

    it('should not run package:compileEvents if no plugin setting', async () => {
      const validateServiceProxiesStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'validateServiceProxies')
        .returns(BbPromise.resolve())
      const compileRestApiStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileRestApi')
        .returns(BbPromise.resolve())
      const compileResourcesStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileResources')
        .returns(BbPromise.resolve())
      const compileCorsStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileCors')
        .returns(BbPromise.resolve())
      const compileKinesisServiceProxyStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileKinesisServiceProxy')
        .returns(BbPromise.resolve())
      const compileSqsServiceProxyStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileSqsServiceProxy')
        .returns(BbPromise.resolve())
      const mergeDeploymentStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'mergeDeployment')
        .returns(BbPromise.resolve())

      await expect(
        serverlessApigatewayServiceProxy.hooks['package:compileEvents']()
      ).to.be.fulfilled.then(() => {
        expect(validateServiceProxiesStub.notCalled).to.be.equal(true)
        expect(compileRestApiStub.notCalled).to.be.equal(true)
        expect(compileResourcesStub.notCalled).to.be.equal(true)
        expect(compileCorsStub.notCalled).to.be.equal(true)
        expect(compileKinesisServiceProxyStub.notCalled).to.be.equal(true)
        expect(compileSqsServiceProxyStub.notCalled).to.be.equal(true)
        expect(mergeDeploymentStub.notCalled).to.be.equal(true)
      })

      serverlessApigatewayServiceProxy.validateServiceProxies.restore()
      serverlessApigatewayServiceProxy.compileRestApi.restore()
      serverlessApigatewayServiceProxy.compileResources.restore()
      serverlessApigatewayServiceProxy.compileCors.restore()
      serverlessApigatewayServiceProxy.compileKinesisServiceProxy.restore()
      serverlessApigatewayServiceProxy.compileSqsServiceProxy.restore()
      serverlessApigatewayServiceProxy.mergeDeployment.restore()
    })

    it('should run after:deploy:deploy in order', async () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'post'
            }
          },
          {
            sqs: {
              path: '/sqs',
              method: 'post'
            }
          }
        ]
      }

      const getStackInfoStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'getStackInfo')
        .returns(BbPromise.resolve())
      const displayStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'display')
        .returns(BbPromise.resolve())

      await expect(
        serverlessApigatewayServiceProxy.hooks['after:deploy:deploy']()
      ).to.be.fulfilled.then(() => {
        expect(getStackInfoStub.calledOnce).to.be.equal(true)
        expect(displayStub.calledOnce).to.be.equal(true)
      })

      serverlessApigatewayServiceProxy.getStackInfo.restore()
      serverlessApigatewayServiceProxy.display.restore()
    })

    it('should not run after:deploy:deploy if no plugin setting', async () => {
      const getStackInfoStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'getStackInfo')
        .returns(BbPromise.resolve())
      const displayStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'display')
        .returns(BbPromise.resolve())

      await expect(
        serverlessApigatewayServiceProxy.hooks['after:deploy:deploy']()
      ).to.be.fulfilled.then(() => {
        expect(getStackInfoStub.notCalled).to.be.equal(true)
        expect(displayStub.notCalled).to.be.equal(true)
      })

      serverlessApigatewayServiceProxy.getStackInfo.restore()
      serverlessApigatewayServiceProxy.display.restore()
    })
  })

  describe('#mergeDeployment()', () => {
    it('should set Dependson resource if core has http events', async () => {
      const compileDeploymentStub = sinon
        .stub(serverlessApigatewayServiceProxy, 'compileDeployment')
        .returns(BbPromise.resolve())
      serverlessApigatewayServiceProxy.apiGatewayMethodLogicalIds = 'apiResource'
      serverless.service.provider.compiledCloudFormationTemplate.Resources = {
        api: {
          Type: 'AWS::ApiGateway::Deployment',
          DependsOn: ['method-dependency1', 'method-dependency2']
        }
      }

      await expect(serverlessApigatewayServiceProxy.mergeDeployment()).to.be.fulfilled.then(() => {
        expect(
          serverless.service.provider.compiledCloudFormationTemplate.Resources.api.DependsOn
        ).to.deep.equal(['method-dependency1', 'method-dependency2', 'apiResource'])
        expect(compileDeploymentStub.notCalled).to.be.equal(true)
      })
      serverlessApigatewayServiceProxy.compileDeployment.restore()
    })

    it('should create deployment resource if core do not have any http events', async () => {
      serverlessApigatewayServiceProxy.apiGatewayMethodLogicalIds = 'apiResource'
      serverlessApigatewayServiceProxy.serverless.instanceId = 'xxx'

      await expect(serverlessApigatewayServiceProxy.mergeDeployment()).to.be.fulfilled.then(() => {
        expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
          ApiGatewayDeploymentxxx: {
            Type: 'AWS::ApiGateway::Deployment',
            Properties: {
              RestApiId: { Ref: 'ApiGatewayRestApi' },
              StageName: 'dev',
              Description: undefined
            },
            DependsOn: 'apiResource'
          }
        })
      })
    })
  })
})
