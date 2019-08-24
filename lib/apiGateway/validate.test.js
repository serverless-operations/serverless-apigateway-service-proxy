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

  describe('common properties', () => {
    it('should throw if an invalid proxy type is given', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            xxxxx: {
              path: '/kinesis',
              method: 'post',
              streamName: 'streamName'
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
        'child "kinesis" fails because ["kinesis" must be an object]'
      )
    })

    it('should throw if "path" property is missing', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              method: 'post',
              streamName: 'streamName'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "path" fails because ["path" is required]]'
      )
    })

    it('should throw if "method" property is missing', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "method" fails because ["method" is required]]'
      )
    })

    it('should throw if "method" property is set to unsupported method', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'xxxx',
              streamName: 'streamName'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "method" fails because ["method" must be one of [get, post, put, patch, options, head, delete, any]]]'
      )
    })

    it('should allow case insensitive usage of method property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'post',
              streamName: 'streamName'
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
              streamName: 'streamName',
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
              streamName: 'streamName',
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
              streamName: 'streamName',
              cors: {
                headers: true
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "cors" fails because ["cors" must be a boolean, child "headers" fails because ["headers" must be an array]]]'
      )
    })

    it('should throw if both cors origin and origins properties are set', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'post',
              streamName: 'streamName',
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
        'child "kinesis" fails because [child "cors" fails because ["cors" must be a boolean, "cors" can have "origin" or "origins" but not both]]'
      )
    })

    it('should process cors options', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              method: 'post',
              streamName: 'streamName',
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
              streamName: 'streamName',
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
              streamName: 'streamName',
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
              streamName: 'streamName',
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
              streamName: 'streamName',
              cors: {
                headers: ['TestHeader']
              }
            }
          },
          {
            kinesis: {
              method: 'DELETE',
              path: 'users/{id}',
              streamName: 'streamName',
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
              streamName: 'streamName',
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
        'child "kinesis" fails because [child "cors" fails because ["cors" must be a boolean, child "maxAge" fails because ["maxAge" must be larger than or equal to 1]]]'
      )
    })

    it('should handle explicit methods', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              method: 'POST',
              path: '/foo/bar',
              streamName: 'streamName',
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

    it('should throw if "authorizationType" is not a string', async () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              authorizationType: [],
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "authorizationType" fails because ["authorizationType" must be a string]]'
      )
    })

    it('should throw if "authorizationType" is set to an unsupported string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              authorizationType: 'AUTH_TYPE',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "authorizationType" fails because ["authorizationType" must be one of [NONE, AWS_IAM, CUSTOM, COGNITO_USER_POOLS]]]'
      )
    })

    it('should throw if "authorizationType" is not set to "CUSTOM" when the "authorizerId" property is set', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              authorizationType: 'NONE',
              authorizerId: { Ref: 'SomeAuthorizerId' },
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "authorizationType" fails because ["authorizationType" must be one of [CUSTOM]]]'
      )
    })

    it('should throw if "authorizationScopes" is not an array', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              authorizationScopes: '',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "authorizationScopes" fails because ["authorizationScopes" must be an array]]'
      )
    })

    it('should throw if "authorizationType" is not set to "COGNITO_USER_POOLS" when the "authorizationScopes" property is set', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              authorizationType: 'NONE',
              authorizationScopes: ['editor', 'owner'],
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "authorizationType" fails because ["authorizationType" must be one of [COGNITO_USER_POOLS]]]'
      )
    })

    it('should default to "NONE" authorization type when authorizationType not set', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post'
            }
          }
        ]
      }

      const json = serverlessApigatewayServiceProxy.validateServiceProxies()

      expect(json.events[0].http.auth).to.deep.equal({ authorizationType: 'NONE' })
    })

    it('should process "CUSTOM" authorizationType', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
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

    it('should process "COGNITO_USER_POOLS" authorizationType', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
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

    const proxiesToTest = [
      { proxy: 'kinesis', props: { streamName: 'streamName' } },
      { proxy: 's3', props: {} },
      { proxy: 'sns', props: {} }
    ]
    proxiesToTest.forEach(({ proxy, props }) => {
      it(`should throw if requestParameters is set for ${proxy}`, () => {
        serverlessApigatewayServiceProxy.serverless.service.custom = {
          apiGatewayServiceProxies: [
            {
              [proxy]: Object.assign(
                {
                  path: `/${proxy}`,
                  method: 'post',
                  requestParameters: { key: 'value' }
                },
                props
              )
            }
          ]
        }

        expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
          serverless.classes.Error,
          `child "${proxy}" fails because ["requestParameters" is not allowed]`
        )
      })
    })
  })

  describe('kinesis', () => {
    it('should throw if kinesis service is missing the "streamName" property', () => {
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

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "streamName" fails because ["streamName" is required]]'
      )
    })

    it('should throw if "streamName" is not a string or an AWS intrinsic "Ref" function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: ['xx', 'yy'],
              path: '/kinesis',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "streamName" fails because ["streamName" must be a string, "streamName" must be an object]]'
      )
    })

    it('should throw if "streamName" is set to an object that is not an AWS intrinsic Ref function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: { xxx: 'KinesisStreamResourceId' },
              path: 'kinesis',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "kinesis" fails because [child "streamName" fails because ["streamName" must be a string, child "Ref" fails because ["Ref" is required]]]'
      )
    })

    it('should not throw error if streamName is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post'
            }
          }
        ]
      }

      serverlessApigatewayServiceProxy.validateServiceProxies()
    })

    it('should not throw error if streamName is an AWS intrinsic Ref function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: { Ref: 'KinesisStreamResourceId' },
              path: 'kinesis',
              method: 'post'
            }
          }
        ]
      }

      serverlessApigatewayServiceProxy.validateServiceProxies()
    })
  })

  describe('sqs', () => {
    it('should throw if requestParameters is not a string to string', () => {
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
        'child "sqs" fails because [child "requestParameters" fails because [child "key2" fails because ["key2" must be a string]]]'
      )
    })

    it('should allow requestParameters to be a string to string mapping', () => {
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
})
