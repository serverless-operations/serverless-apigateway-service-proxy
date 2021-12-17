'use strict'

const expect = require('chai').expect
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./index')

describe('#utils()', () => {
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

  describe('#getAllServiceProxies()', () => {
    it('should return this plugin configutration', () => {
      serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'post'
            }
          }
        ]
      }

      expect(serverlessApigatewayServiceProxy.getAllServiceProxies()).to.deep.equal([
        {
          kinesis: {
            path: '/kinesis',
            method: 'post'
          }
        }
      ])
    })

    it('should return empty if no configuration', () => {
      expect(serverlessApigatewayServiceProxy.getAllServiceProxies()).to.be.empty
    })
  })

  describe('#getServiceName()', () => {
    it('should return corresponding service name', () => {
      expect(
        serverlessApigatewayServiceProxy.getServiceName({
          kinesis: {
            path: '/kinesis',
            method: 'post'
          }
        })
      ).to.be.equal('kinesis')
    })
  })

  describe('#addCors', () => {
    it('should not add cors if cors property is undefined', () => {
      const http = {}
      const integrationResponse = {}

      serverlessApigatewayServiceProxy.addCors(http, integrationResponse)

      expect(integrationResponse).to.deep.equal({})
    })

    it('should add cors if cors origin is set', () => {
      const http = { cors: { origin: '*' } }
      const integrationResponse = { IntegrationResponses: [{ ResponseParameters: {} }] }

      serverlessApigatewayServiceProxy.addCors(http, integrationResponse)

      expect(integrationResponse).to.deep.equal({
        IntegrationResponses: [
          { ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" } }
        ]
      })
    })

    it('should add cors if cors origins are set', () => {
      const http = { cors: { origins: ['localhost', 'www.example.com'] } }
      const integrationResponse = { IntegrationResponses: [{ ResponseParameters: {} }] }

      serverlessApigatewayServiceProxy.addCors(http, integrationResponse)

      expect(integrationResponse).to.deep.equal({
        IntegrationResponses: [
          {
            ResponseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'localhost,www.example.com'"
            }
          }
        ]
      })
    })
  })

  describe('#shouldCreateDefaultRole()', () => {
    it("should return true when a service doesn't define a custom role", () => {
      serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis1',
              method: 'post',
              roleArn: 'roleArn'
            },
            kinesis: {
              path: '/kinesis2',
              method: 'post'
            }
          }
        ]
      }

      expect(serverlessApigatewayServiceProxy.shouldCreateDefaultRole('kinesis')).to.be.equal(true)
    })

    it('should return false when all services define a custom role', () => {
      serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis1',
              method: 'post',
              roleArn: 'roleArn1'
            },
            kinesis: {
              path: '/kinesis2',
              method: 'post',
              roleArn: 'roleArn2'
            }
          }
        ]
      }

      expect(serverlessApigatewayServiceProxy.shouldCreateDefaultRole('kinesis')).to.be.equal(false)
    })

    it('should return false when no relevant services are defined', () => {
      serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: '/sqs',
              method: 'post'
            }
          }
        ]
      }

      expect(serverlessApigatewayServiceProxy.shouldCreateDefaultRole('kinesis')).to.be.equal(false)
    })
  })
})
