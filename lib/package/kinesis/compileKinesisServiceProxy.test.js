const sinon = require('sinon')
const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

chai.use(require('sinon-chai'))

const expect = chai.expect

describe('#compileKinesisServiceProxy', () => {
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

  it('should call compileIamRoleToKinesis and compileMethodsToKinesis once', () => {
    const compileIamRoleToKinesisStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileIamRoleToKinesis'
    )
    const compileMethodsToKinesisStub = sinon.stub(
      serverlessApigatewayServiceProxy,
      'compileMethodsToKinesis'
    )

    serverlessApigatewayServiceProxy.compileKinesisServiceProxy()

    expect(compileIamRoleToKinesisStub).to.have.been.calledOnce
    expect(compileMethodsToKinesisStub).to.have.been.calledOnce

    serverlessApigatewayServiceProxy.compileIamRoleToKinesis.restore()
    serverlessApigatewayServiceProxy.compileMethodsToKinesis.restore()
  })
})
