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

  it('should reject an invalid proxies', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Invalid APIG proxy "xxxxx". This plugin supported Proxies are: kinesis, sqs, s3, sns.'
    )
  })

  it('should throw an error if http proxy type is not an object', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: 'xxxx'
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Missing or invalid "path" property in kinesis proxy'
    )
  })

  it('should validate the "path" property', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            method: 'post'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Missing or invalid "path" property in kinesis proxy'
    )
  })

  it('should validate the "method" property', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis'
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Missing or invalid "method" property in kinesis proxy'
    )
  })

  it('should validate the "method" property if it set unsupported method', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Invalid APIG method "xxxx" in AWS service proxy. AWS supported methods are: get, post, put, patch, options, head, delete, any.'
    )
  })

  it('should validate the events object syntax method is case insensitive', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
  })

  it('should process cors defaults', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

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
  })

  it('should throw if cors headers are not an array', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'CORS header values must be provided as an array. Please check the docs for more info.'
    )
  })

  it('should throw if both cors origin and origins properties are set', () => {
    serverlessApigatewayServiceProxy.serverless.service.custom = {
      apiGatewayServiceProxies: [
        {
          kinesis: {
            path: '/kinesis',
            method: 'post',
            cors: {
              origins: ['acme.com'],
              origin: '*'
            }
          }
        }
      ]
    }

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'You can only use "origin" or "origins", but not both at the same time to configure CORS. Please check the docs for more info.'
    )
  })

  it('should process cors options', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

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
  })

  it('should merge all preflight cors options for a path', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

    expect(json.corsPreflight['users/{id}'].methods).to.deep.equal(['OPTIONS', 'DELETE', 'PUT'])
    expect(json.corsPreflight.users.origins).to.deep.equal([
      'http://example2.com',
      'http://example.com'
    ])
    expect(json.corsPreflight['users/{id}'].headers).to.deep.equal(['TestHeader2', 'TestHeader'])
    expect(json.corsPreflight.users.maxAge).to.equal(86400)
    expect(json.corsPreflight.users.cacheControl).to.equal(
      'max-age=600, s-maxage=600, proxy-revalidate'
    )
    expect(json.corsPreflight.users.allowCredentials).to.equal(true)
    expect(json.corsPreflight['users/{id}'].allowCredentials).to.equal(false)
  })

  it('should throw an error if the maxAge is not a positive integer', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'maxAge should be an integer over 0'
    )
  })

  it('should handle explicit methods', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

    expect(json.events[0].http.cors.methods).to.deep.equal(['POST', 'OPTIONS'])
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Invalid "authorizationType" property in kinesis proxy'
    )
  })

  it('should validate the "authorizationType" property if set to unsupported type', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Invalid APIG authorization type "AUTH_TYPE" in AWS service proxy. AWS supported types are: NONE, AWS_IAM, CUSTOM, COGNITO_USER_POOLS.'
    )
  })

  it('should validate "authorizationType" is set to "CUSTOM" when the "authorizerId" property is set', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      "Expecting 'CUSTOM' authorization type when 'authorizerId' is set in service kinesis"
    )
  })

  it('should validate the "authorizationScopes" property', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'Invalid "authorizationScopes" property in kinesis proxy'
    )
  })

  it('should validate "authorizationType" is set to "COGNITO_USER_POOLS" when the "authorizationScopes" property is set', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      "Expecting 'COGNITO_USER_POOLS' authorization type when 'authorizationScopes' is set in service kinesis"
    )
  })

  it('should use "NONE" authorization type when not setting auth properties', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

    expect(json.events[0].http.auth).to.deep.equal({ authorizationType: 'NONE' })
  })

  it('should handle "CUSTOM" authorizationType', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

    expect(json.events[0].http.auth).to.deep.equal({
      authorizationType: 'CUSTOM',
      authorizerId: { Ref: 'SomeAuthorizerId' }
    })
  })

  it('should handle "COGNITO_USER_POOLS" authorizationType', () => {
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

    const json = serverlessApigatewayServiceProxy.validateServiceProxies()

    expect(json.events[0].http.auth).to.deep.equal({
      authorizationType: 'COGNITO_USER_POOLS',
      authorizationScopes: ['editor', 'owner']
    })
  })

  it('should validate requestParameters only used for sqs', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'requestParameters property is only valid for "sqs" service proxy'
    )
  })

  it('should validate requestParameters is a string to string mapping', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
      serverless.classes.Error,
      'requestParameters property must be a string to string mapping'
    )
  })

  it('should allow valid requestParameters property', () => {
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

    expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
  })
})
