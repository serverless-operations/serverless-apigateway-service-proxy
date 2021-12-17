const sinon = require('sinon')
const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('sinon-chai'))

const expect = chai.expect

describe('#compileSnsServiceProxy', () => {
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

  it('should call compileIamRoleToSns and compileMethodsToSns once', () => {
    const compileIamRoleToSnsStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileIamRoleToSns'
    )
    const compileMethodsToSnsStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileMethodsToSns'
    )

    serverlessApigatewayServiceProxy.compileSnsServiceProxy()

    expect(compileIamRoleToSnsStub).to.have.been.calledOnce
    expect(compileMethodsToSnsStub).to.have.been.calledOnce

    serverlessApigatewayServiceProxy.compileIamRoleToSns.restore()
    serverlessApigatewayServiceProxy.compileMethodsToSns.restore()
  })
})
