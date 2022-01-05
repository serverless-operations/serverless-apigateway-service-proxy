const sinon = require('sinon')
const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('sinon-chai'))

const expect = chai.expect

describe('#compileS3ServiceProxy', () => {
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

  it('should call compileIamRoleToS3 and compileMethodsToS3 once', () => {
    const compileIamRoleToS3Stub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileIamRoleToS3'
    )
    const compileMethodsToS3Stub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileMethodsToS3'
    )

    serverlessApigatewayServiceProxy.compileS3ServiceProxy()

    expect(compileIamRoleToS3Stub).to.have.been.calledOnce
    expect(compileMethodsToS3Stub).to.have.been.calledOnce

    serverlessApigatewayServiceProxy.compileIamRoleToS3.restore()
    serverlessApigatewayServiceProxy.compileMethodsToS3.restore()
  })
})
