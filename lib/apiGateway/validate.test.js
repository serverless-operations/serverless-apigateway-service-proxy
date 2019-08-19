'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ServerlessApigatewayServiceProxy = require('./../index')

chai.use(require('chai-as-promised'))
const expect = require('chai').expect

describe('#validateServiceProxies()', () => {
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

  it('should reject an invalid proxies', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          xxxxx: {
            path: '/kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Invalid APIG proxy "xxxxx". This plugin supported Proxies are: kinesis, sqs, s3.'
    )
  })

  it('should throw an error if http proxy type is not an object', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: 'xxxx'
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Missing or invalid "path" property in kinesis proxy'
    )
  })

  it('should validate the "path" property', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Missing or invalid "path" property in kinesis proxy'
    )
  })

  it('should validate the "method" property', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Missing or invalid "method" property in kinesis proxy'
    )
  })

  it('should validate the "method" property if it set unsupported method', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'xxxx'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Invalid APIG method "xxxx" in AWS service proxy. AWS supported methods are: get, post, put, patch, options, head, delete, any.'
    )
  })

  it('should validate the events object syntax method is case insensitive', async () => {
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
            method: 'POST'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled
  })

  it('should process cors defaults', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            cors: true
          }
        }
      ]
    }
    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json).to.deep.equal({
          events: [
            {
              serviceName: 'kinesis',
              http: {
                path: 'kinesis',
                auth: {
                  authorizationType: 'NONE'
                },
                method: 'post',
                cors: {
                  origins: ['*'],
                  origin: '*',
                  methods: ['OPTIONS', 'POST'],
                  headers: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                    'X-Amz-User-Agent'
                  ],
                  allowCredentials: false
                }
              }
            }
          ],
          corsPreflight: {
            kinesis: {
              headers: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'X-Amz-Security-Token',
                'X-Amz-User-Agent'
              ],
              methods: ['OPTIONS', 'POST'],
              origins: ['*'],
              origin: '*',
              allowCredentials: false
            }
          }
        })
      }
    )
  })

  it('should throw if cors headers are not an array', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            cors: {
              headers: true
            }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'CORS header values must be provided as an array. Please check the docs for more info.'
    )
  })

  it('should process cors options', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            cors: {
              headers: ['X-Foo-Bar'],
              origins: ['acme.com'],
              methods: ['POST', 'OPTIONS'],
              maxAge: 86400,
              cacheControl: 'max-age=600, s-maxage=600, proxy-revalidate'
            }
          }
        }
      ]
    }
    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json).to.deep.equal({
          events: [
            {
              serviceName: 'kinesis',
              http: {
                path: 'kinesis',
                method: 'post',
                auth: {
                  authorizationType: 'NONE'
                },
                cors: {
                  headers: ['X-Foo-Bar'],
                  origins: ['acme.com'],
                  methods: ['POST', 'OPTIONS'],
                  maxAge: 86400,
                  cacheControl: 'max-age=600, s-maxage=600, proxy-revalidate',
                  allowCredentials: false
                }
              }
            }
          ],
          corsPreflight: {
            kinesis: {
              cacheControl: 'max-age=600, s-maxage=600, proxy-revalidate',
              headers: ['X-Foo-Bar'],
              methods: ['POST', 'OPTIONS'],
              origins: ['acme.com'],
              origin: '*',
              allowCredentials: false,
              maxAge: 86400
            }
          }
        })
      }
    )
  })

  it('should merge all preflight cors options for a path', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/users',
            method: 'get',
            cors: {
              origins: ['http://example.com'],
              allowCredentials: true,
              maxAge: 10000,
              cacheControl: 'max-age=600, s-maxage=600, proxy-revalidate'
            }
          }
        },
        {
          kinesis: {
            method: 'POST',
            path: 'users',
            cors: {
              origins: ['http://example2.com'],
              maxAge: 86400
            }
          }
        },
        {
          kinesis: {
            method: 'PUT',
            path: 'users/{id}',
            cors: {
              headers: ['TestHeader']
            }
          }
        },
        {
          kinesis: {
            method: 'DELETE',
            path: 'users/{id}',
            cors: {
              headers: ['TestHeader2']
            }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json.corsPreflight['users/{id}'].methods).to.deep.equal(['OPTIONS', 'DELETE', 'PUT'])
        expect(json.corsPreflight.users.origins).to.deep.equal([
          'http://example2.com',
          'http://example.com'
        ])
        expect(json.corsPreflight['users/{id}'].headers).to.deep.equal([
          'TestHeader2',
          'TestHeader'
        ])
        expect(json.corsPreflight.users.maxAge).to.equal(86400)
        expect(json.corsPreflight.users.cacheControl).to.equal(
          'max-age=600, s-maxage=600, proxy-revalidate'
        )
        expect(json.corsPreflight.users.allowCredentials).to.equal(true)
        expect(json.corsPreflight['users/{id}'].allowCredentials).to.equal(false)
      }
    )
  })

  it('should throw an error if the maxAge is not a positive integer', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            method: 'POST',
            path: '/foo/bar',
            cors: {
              origin: '*',
              maxAge: -1
            }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'maxAge should be an integer over 0'
    )
  })

  it('should handle explicit methods', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            method: 'POST',
            path: '/foo/bar',
            cors: {
              methods: ['POST']
            }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json.events[0].http.cors.methods).to.deep.equal(['POST', 'OPTIONS'])
      }
    )
  })

  it('should validate the "authorizationType" property', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationType: [],
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Invalid "authorizationType" property in kinesis proxy'
    )
  })

  it('should validate the "authorizationType" property if set to unsupported type', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationType: 'AUTH_TYPE',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Invalid APIG authorization type "AUTH_TYPE" in AWS service proxy. AWS supported types are: NONE, AWS_IAM, CUSTOM, COGNITO_USER_POOLS.'
    )
  })

  it('should validate "authorizationType" is set to "CUSTOM" when the "authorizerId" property is set', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationType: 'NONE',
            authorizerId: { Ref: 'SomeAuthorizerId' },
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      "Expecting 'CUSTOM' authorization type when 'authorizerId' is set in service kinesis"
    )
  })

  it('should validate the "authorizationScopes" property', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationScopes: '',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'Invalid "authorizationScopes" property in kinesis proxy'
    )
  })

  it('should validate "authorizationType" is set to "COGNITO_USER_POOLS" when the "authorizationScopes" property is set', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationType: 'NONE',
            authorizationScopes: ['editor', 'owner'],
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      "Expecting 'COGNITO_USER_POOLS' authorization type when 'authorizationScopes' is set in service kinesis"
    )
  })

  it('should use "NONE" authorization type when not setting auth properties', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json.events[0].http.auth).to.deep.equal({ authorizationType: 'NONE' })
      }
    )
  })

  it('should handle "CUSTOM" authorizationType', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationType: 'CUSTOM',
            authorizerId: { Ref: 'SomeAuthorizerId' },
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json.events[0].http.auth).to.deep.equal({
          authorizationType: 'CUSTOM',
          authorizerId: { Ref: 'SomeAuthorizerId' }
        })
      }
    )
  })

  it('should handle "COGNITO_USER_POOLS" authorizationType', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            authorizationType: 'COGNITO_USER_POOLS',
            authorizationScopes: ['editor', 'owner'],
            method: 'post'
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled.then(
      (json) => {
        expect(json.events[0].http.auth).to.deep.equal({
          authorizationType: 'COGNITO_USER_POOLS',
          authorizationScopes: ['editor', 'owner']
        })
      }
    )
  })

  it('should validate requestParameters only used for sqs', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            requestParameters: { key: 'value' }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'requestParameters property is only valid for "sqs" service proxy'
    )
  })

  it('should validate requestParameters is a string to string mapping', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs',
            method: 'post',
            requestParameters: { key1: 'value', key2: [] }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.rejectedWith(
      'requestParameters property must be a string to string mapping'
    )
  })

  it('should allow valid requestParameters property', async () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          sqs: {
            path: '/sqs',
            method: 'post',
            requestParameters: { key1: 'value', key2: 'value2' }
          }
        }
      ]
    }

    await expect(serverlessApigatewayServiceProxy.validateServiceProxies()).to.be.fulfilled
  })
})
