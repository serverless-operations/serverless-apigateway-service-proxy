const sinon = require('sinon')
const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('sinon-chai'))

const expect = chai.expect

describe('#compileSqsServiceProxy', () => {
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

  it('should call compileIamRoleToSqs and compileMethodsToSqs once', () => {
    const compileIamRoleToSqsStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileIamRoleToSqs'
    )
    const compileMethodsToSqsStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileMethodsToSqs'
    )

    serverlessApigatewayServiceProxy.compileSqsServiceProxy()

    expect(compileIamRoleToSqsStub).to.have.been.calledOnce
    expect(compileMethodsToSqsStub).to.have.been.calledOnce

    serverlessApigatewayServiceProxy.compileIamRoleToSqs.restore()
    serverlessApigatewayServiceProxy.compileMethodsToSqs.restore()
  })
})
