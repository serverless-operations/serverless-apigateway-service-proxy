const sinon = require('sinon')
const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('../../index')

chai.use(require('sinon-chai'))

const expect = chai.expect

describe('#compileEventBridgeServiceProxy', () => {
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

  it('should call compileIamRoleToEventBridge and compileMethodsToEventBridge once', () => {
    const compileIamRoleToEventBridgeStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileIamRoleToEventBridge'
    )
    const compileMethodsToEventBridgeStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileMethodsToEventBridge'
    )

    serverlessApigatewayServiceProxy.compileEventBridgeServiceProxy()

    expect(compileIamRoleToEventBridgeStub).to.have.been.calledOnce
    expect(compileMethodsToEventBridgeStub).to.have.been.calledOnce

    serverlessApigatewayServiceProxy.compileIamRoleToEventBridge.restore()
    serverlessApigatewayServiceProxy.compileMethodsToEventBridge.restore()
  })
})
