'use strict'

const chai = require('chai')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
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
        'Invalid APIG proxy "xxxxx". This plugin supported Proxies are: kinesis, sqs, s3, sns, dynamodb, eventbridge.'
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
              method: 'POST',
              queueName: 'queueName'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should work if "private" property is missing', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'POST'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should work if "private" property is true', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'POST',
              private: true
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should work if "private" property is false', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'POST',
              private: false
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw if "private" property is set to unsupported type', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'POST',
              private: 'xxxxx'
            }
          }
        ]
      }
      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "private" fails because ["private" must be a boolean]]'
      )
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

    it('should throw if "authorizationType" is not a string', () => {
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

    it('should throw if "authorizationType" is not set to "CUSTOM" or "COGNITO_USER_POOLS" when the "authorizerId" property is set', () => {
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
        'child "kinesis" fails because [child "authorizationType" fails because ["authorizationType" must be one of [CUSTOM, COGNITO_USER_POOLS]]]'
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
              authorizerId: { Ref: 'SomeAuthorizerId' },
              authorizationScopes: ['editor', 'owner'],
              method: 'post'
            }
          }
        ]
      }

      const json = serverlessApigatewayServiceProxy.validateServiceProxies()

      expect(json.events[0].http.auth).to.deep.equal({
        authorizationType: 'COGNITO_USER_POOLS',
        authorizerId: { Ref: 'SomeAuthorizerId' },
        authorizationScopes: ['editor', 'owner']
      })
    })

    it('should throw if "roleArn" is not a string or an AWS intrinsic "Fn::GetAtt" function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              roleArn: []
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "roleArn" fails because ["roleArn" must be a string, "roleArn" must be an object]]'
      )
    })

    it('should throw if "roleArn" is an AWS intrinsic function other than "Fn::GetAtt"', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              roleArn: { Ref: 'KinesisCustomRoleId' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        `child "kinesis" fails because [child "roleArn" fails because ["roleArn" must be a string, "roleArn" must be in the format "{ 'Fn::GetAtt': ['<ResourceId>', 'Arn'] }"]]`
      )
    })

    it('should throw if "roleArn" is an AWS intrinsic "Fn::GetAtt" function for an attribute other than Arn', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              roleArn: { 'Fn::GetAtt': ['KinesisCustomRoleId', 'RoleId'] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        `child "kinesis" fails because [child "roleArn" fails because ["roleArn" must be a string, "roleArn" must be in the format "{ 'Fn::GetAtt': ['<ResourceId>', 'Arn'] }"]]`
      )
    })

    it('should not throw error if "roleArn" is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              roleArn: 'roleArn'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if "roleArn" is valid intrinsic function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              roleArn: { 'Fn::GetAtt': ['KinesisCustomRoleId', 'Arn'] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw if "acceptParameters" is not a string to boolean mapping', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              acceptParameters: {
                'method.request.header.customHeader1': 'this is not a boolean',
                'method.request.header.customHeader2': 1000
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "acceptParameters" fails because [child "method.request.header.customHeader1" fails because ["method.request.header.customHeader1" must be a boolean]]'
      )
    })

    it('should not throw if "acceptParameters" is a string to boolean mapping', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              path: '/kinesis',
              streamName: 'streamName',
              method: 'post',
              acceptParameters: {
                'method.request.header.customHeader1': true,
                'method.request.header.customHeader2': false
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    const proxiesToTest = [
      { proxy: 'kinesis', props: { streamName: 'streamName' } },
      { proxy: 'sns', props: { topicName: 'topicName' } }
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

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
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

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if partitionKey is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              partitionKey: 'partitionKey'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if partitionKey is a pathParam', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              partitionKey: { pathParam: 'partitionKey' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if partitionKey is a queryStringParam', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              partitionKey: { queryStringParam: 'partitionKey' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if partitionKey is a bodyParam', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              partitionKey: { bodyParam: 'partitionKey' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if partitionKey is not a string or an object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              partitionKey: []
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "partitionKey" fails because ["partitionKey" must be a string, "partitionKey" must be an object]]'
      )
    })

    it('should throw error if partitionKey is not a valid param', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              partitionKey: { xxx: 'partitionKey' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "partitionKey" fails because ["partitionKey" must be a string, "xxx" is not allowed, "partitionKey" must contain at least one of [pathParam, queryStringParam, bodyParam]]]'
      )
    })

    it('should throw error if request is missing the template property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              request: { xxx: { 'application/json': 'mappingTemplate' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "request" fails because [child "template" fails because ["template" is required]]]'
      )
    })

    it('should throw error if request is not a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              request: { template: [] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "request" fails because [child "template" fails because ["template" must be an object]]]'
      )
    })

    it('should not throw error if request is a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              request: { template: { 'application/json': 'mappingTemplate' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if action is not "PutRecord" and "PutRecords"', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            kinesis: {
              streamName: 'yourStream',
              path: 'kinesis',
              method: 'post',
              action: 'xxxxxx',
              request: { template: [] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "kinesis" fails because [child "action" fails because ["action" must be one of [PutRecord, PutRecords]]]'
      )
    })
  })

  describe('s3', () => {
    const getProxy = (key, value, ...missing) => {
      const proxy = {
        action: 'GetObject',
        bucket: 'myBucket',
        key: 'myKey',
        path: 's3',
        method: 'post'
      }

      if (key) {
        proxy[key] = value
      }

      missing.forEach((k) => delete proxy[k])
      return proxy
    }

    const shouldError = (message, key, value, ...missing) => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            s3: getProxy(key, value, ...missing)
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        message
      )
    }

    const shouldSucceed = (key, value, ...missing) => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            s3: getProxy(key, value, ...missing)
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw(
        serverless.classes.Error
      )
    }

    it('should error if the "bucket" property is missing', () => {
      shouldError(
        'child "s3" fails because [child "bucket" fails because ["bucket" is required]]',
        null,
        null,
        'bucket'
      )
    })

    it('should succeed if the "bucket" property is string or AWS Ref function', () => {
      shouldSucceed('bucket', 'x')
      shouldSucceed('bucket', { Ref: 'x' })
    })

    it('should error if the "bucket" property if AWS Ref function is invalid', () => {
      shouldError(
        'child "s3" fails because [child "bucket" fails because ["bucket" must be a string, child "Ref" fails because ["Ref" is required]]]',
        'bucket',
        { xxx: 's3Bucket' }
      )
      shouldError(
        'child "s3" fails because [child "bucket" fails because ["bucket" must be a string, child "Ref" fails because ["Ref" must be a string]]]',
        'bucket',
        { Ref: ['s3Bucket', 'Arn'] }
      )
      shouldError(
        'child "s3" fails because [child "bucket" fails because ["bucket" must be a string, "bucket" must be an object]]',
        'bucket',
        ['xx', 'yy']
      )
      shouldError(
        'child "s3" fails because [child "bucket" fails because ["bucket" must be a string, child "Ref" fails because ["Ref" is required]]]',
        'bucket',
        { 'Fn::GetAtt': ['x', 'Arn'] }
      )
    })

    it('should error if the "action" property is missing', () => {
      shouldError(
        'child "s3" fails because [child "action" fails because ["action" is required]]',
        null,
        null,
        'action'
      )
    })

    it('should error if the "action" property is not one of the allowed values', () => {
      shouldError(
        'child "s3" fails because [child "action" fails because ["action" must be a string]]',
        'action',
        ['x']
      ) // arrays
      shouldError(
        'child "s3" fails because [child "action" fails because ["action" must be a string]]',
        'action',
        { Ref: 'x' }
      ) // object
      shouldError(
        'child "s3" fails because [child "action" fails because ["action" must be one of [GetObject, PutObject, DeleteObject]]]',
        'action',
        'ListObjects'
      ) // invalid actions
    })

    it('should succeed if the "action" property is one of the allowed values', () => {
      shouldSucceed('action', 'GetObject')
      shouldSucceed('action', 'PutObject')
      shouldSucceed('action', 'DeleteObject')
    })

    it('should error the "key" property is missing', () => {
      shouldError(
        'child "s3" fails because [child "key" fails because ["key" is required]]',
        null,
        null,
        'key'
      )
    })

    it('should succeed if the "key" property is string or valid object', () => {
      shouldSucceed('key', 'myKey')
      shouldSucceed('key', { pathParam: 'myKey' })
      shouldSucceed('key', { queryStringParam: 'myKey' })
    })

    it('should error if the "key" property specifies both pathParam and queryStringParam', () => {
      shouldError(
        'child "s3" fails because [child "key" fails because ["key" must be a string, key must contain "pathParam" or "queryStringParam" but not both]]',
        'key',
        { pathParam: 'myKey', queryStringParam: 'myKey' }
      )
    })

    it('should error if the "key" property is not a string or valid object', () => {
      shouldError(
        'child "s3" fails because [child "key" fails because ["key" must be a string, "key" must be an object]]',
        'key',
        ['x']
      )
      shouldError(
        'child "s3" fails because [child "key" fails because ["key" must be a string, "param" is not allowed, "key" must contain at least one of [pathParam, queryStringParam]]]',
        'key',
        { param: 'myKey' }
      )
    })

    it('should throw if requestParameters is not a string to string mapping', () => {
      shouldError(
        'child "s3" fails because [child "requestParameters" fails because [child "key2" fails because ["key2" must be a string]]]',
        'requestParameters',
        { key1: 'value', key2: [] }
      )
    })

    it('should not throw if requestParameters is a string to string mapping', () => {
      shouldSucceed('requestParameters', { key1: 'value1', key2: 'value2' })
    })

    it('should throw if requestParameters has "integration.request.path.object" and key is defined', () => {
      shouldError(
        'child "s3" fails because [child "key" fails because ["key" is not allowed]]',
        'requestParameters',
        {
          'integration.request.path.object': 'context.requestId',
          'integration.request.header.cache-control': "'public, max-age=31536000, immutable'"
        }
      )
    })

    it('should not throw if requestParameters has "integration.request.path.object" and key is not defined', () => {
      shouldSucceed(
        'requestParameters',
        {
          'integration.request.path.object': 'context.requestId',
          'integration.request.header.cache-control': "'public, max-age=31536000, immutable'"
        },
        'key'
      )
    })

    it(`should not throw if requestParameters doesn't have "integration.request.path.object" and key is defined`, () => {
      shouldSucceed('requestParameters', {
        'integration.request.header.cache-control': "'public, max-age=31536000, immutable'"
      })
    })
  })

  describe('sns', () => {
    it('should throw error if the "topicName" property doesn\'t exist', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              path: 'sns',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sns" fails because [child "topicName" fails because ["topicName" is required]]'
      )
    })

    it('should throw error if the "topicName" property is not a string or an AWS intrinsic function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              path: 'sns',
              method: 'post',
              topicName: ['xx', 'yy']
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sns" fails because [child "topicName" fails because ["topicName" must be a string, "topicName" must be an object]]'
      )
    })

    it('should throw error if the "topicName" property is missing the AWS intrinsic function "Fn::GetAtt"', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              path: 'sns',
              method: 'post',
              topicName: { xxx: 'SNSResourceId' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        `child "sns" fails because [child "topicName" fails because ["topicName" must be a string, "topicName" must be in the format "{ 'Fn::GetAtt': ['<ResourceId>', 'TopicName'] }"]]`
      )
    })

    it('should throw error if the "topicName" property is an intrinsic function "Fn::GetAtt" but specifies a property other than TopicName', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              path: 'sns',
              method: 'post',
              topicName: { 'Fn::GetAtt': ['SNSResourceId', 'Arn'] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        `child "sns" fails because [child "topicName" fails because ["topicName" must be a string, "topicName" must be in the format "{ 'Fn::GetAtt': ['<ResourceId>', 'TopicName'] }"]]`
      )
    })

    it('should not show error if topicName is valid string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              path: 'sns',
              method: 'post',
              topicName: 'someTopicName'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not show error if topicName is valid intrinsic function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              path: 'sns',
              method: 'post',
              topicName: { 'Fn::GetAtt': ['SNSResourceId', 'TopicName'] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if request is missing the template property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              topicName: 'topicName',
              path: 'sns',
              method: 'post',
              request: { xxx: { 'application/json': 'mappingTemplate' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sns" fails because [child "request" fails because [child "template" fails because ["template" is required]]]'
      )
    })

    it('should throw error if request is not a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              topicName: 'topicName',
              path: 'sns',
              method: 'post',
              request: { template: [] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sns" fails because [child "request" fails because [child "template" fails because ["template" must be an object]]]'
      )
    })

    it('should not throw error if request is a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sns: {
              topicName: 'topicName',
              path: 'sns',
              method: 'post',
              request: { template: { 'application/json': 'mappingTemplate' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })
  })

  describe('sqs', () => {
    it('should throw if sqs service is missing the "queueName" property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: 'sqs',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sqs" fails because [child "queueName" fails because ["queueName" is required]]'
      )
    })

    it('should throw if "queueName" is not a string or an AWS intrinsic "Fn::GetAtt" function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              queueName: ['xx', 'yy'],
              path: 'sqs',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sqs" fails because [child "queueName" fails because ["queueName" must be a string, "queueName" must be an object]]'
      )
    })

    it('should throw error if the "queueName" property is missing the AWS intrinsic function "Fn::GetAtt"', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              queueName: { xxx: 'sqsStreamResourceId' },
              path: 'sqs',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        `child "sqs" fails because [child "queueName" fails because ["queueName" must be a string, "queueName" must be in the format "{ 'Fn::GetAtt': ['<ResourceId>', 'QueueName'] }"]]`
      )
    })

    it('should not show error if queueName is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              queueName: 'yourQueue',
              path: 'sqs',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not show error if queueName is valid intrinsic function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              queueName: { 'Fn::GetAtt': ['SQSQueueResourceId', 'QueueName'] },
              path: 'sqs',
              method: 'post'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw if requestParameters is not a string to string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: '/sqs',
              method: 'post',
              queueName: 'queueName',
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

    it('should not throw if requestParameters is a string to string mapping', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: '/sqs',
              method: 'post',
              queueName: 'queueName',
              requestParameters: { key1: 'value', key2: 'value2' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if request is missing the template property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: '/sqs',
              method: 'post',
              queueName: 'queueName',
              request: { xxx: { 'application/json': 'mappingTemplate' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sqs" fails because [child "request" fails because [child "template" fails because ["template" is required]]]'
      )
    })

    it('should throw error if request is not a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: '/sqs',
              method: 'post',
              queueName: 'queueName',
              request: { template: [] }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "sqs" fails because [child "request" fails because [child "template" fails because ["template" must be an object]]]'
      )
    })

    it('should not throw error if request is a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            sqs: {
              path: '/sqs',
              method: 'post',
              queueName: 'queueName',
              request: { template: { 'application/json': 'mappingTemplate' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })
  })

  describe('dynamodb', () => {
    it('should throw if dynamodb service is missing the "tableName" property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "dynamodb" fails because [child "tableName" fails because ["tableName" is required]]'
      )
    })

    it('should throw if the "tableName" is not a string or an AWS intrinsic "Ref" function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: ['xx', 'yy'],
              path: '/dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        serverless.classes.Error,
        'child "dynamodb" fails because [child "tableName" fails because ["tableName" must be a string, "tableName" must be an object]]'
      )
    })

    it('should throw if the "tableName" is set to an object that is not an AWS intrinsic Ref function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: { xxx: 'DynamodbTableResourceId' },
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "tableName" fails because ["tableName" must be a string, child "Ref" fails because ["Ref" is required]]]'
      )
    })

    it('should not throw error if the "tableName" is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if the "tableName" is an AWS intrinsic Ref function', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: { Ref: 'DynamodbTableResourceId' },
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if dynamodb service is missing the "hashkey" property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "hashKey" fails because ["hashKey" is required]]'
      )
    })

    it('should throw error if the "hashKey" is object and missing "pathParam" or "queryStringParam" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "hashKey" fails because ["hashKey" must contain at least one of [pathParam, queryStringParam]]]'
      )
    })

    it('should throw error if the "hashKey" is object and missing "attributeType" property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              action: 'PutItem',
              method: 'post',
              hashKey: {
                pathParam: 'id'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "hashKey" fails because [child "attributeType" fails because ["attributeType" is required]]]'
      )
    })

    it('should not throw error if the "hashKey" is object and has both "pathParam" and "attributeType" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if the "hashKey" is object and has both "queryStringParam" and "attributeType" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                queryStringParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if the "hashKey" is object and has both "pathParam" and "attributeType" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if the "hashKey" is not a string or an object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: ['x', 'y']
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "hashKey" fails because ["hashKey" must be an object]]'
      )
    })

    it('should throw error if the "hashKey" is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: 'id'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "hashKey" fails because ["hashKey" must be an object]]'
      )
    })

    it('should throw error if the "hashKey" is a pathParam and a queryStringParam at the same time', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourStream',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: { pathParam: 'id', queryStringParam: 'id', attributeType: 'S' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "hashKey" fails because [key must contain "pathParam" or "queryStringParam" and only one]]'
      )
    })

    it('should throw error if the "rangeKey" is object and missing "pathParam" or "queryStringParam" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              rangeKey: {
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "rangeKey" fails because ["rangeKey" must contain at least one of [pathParam, queryStringParam]]]'
      )
    })

    it('should throw error if the "rangeKey" is object and missing "attributeType" property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              rangeKey: {
                pathParam: 'sort'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "rangeKey" fails because [child "attributeType" fails because ["attributeType" is required]]]'
      )
    })

    it('should not throw error if the "rangeKey" is object and has both "pathParam" and "attributeType" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              hashKey: {
                pathParam: 'sort',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if the "rangeKey" is object and has both "queryStringParam" and "attributeType" properties', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              hashKey: {
                queryStringParam: 'sort',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should throw error if the "rangeKey" is not a string or an object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              hashKey: 'id',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              rangeKey: ['x', 'y']
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "rangeKey" fails because ["rangeKey" must be an object]]'
      )
    })

    it('should throw error if the "rangeKey" is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              rangeKey: 'sort'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "rangeKey" fails because ["rangeKey" must be an object]]'
      )
    })

    it('should throw error if the "rangeKey" is a pathParam and a queryStringParam at the same time', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourStream',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: { pathParam: 'id', attributeType: 'S' },
              rangeKey: { pathParam: 'id', queryStringParam: 'id', attributeType: 'S' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "rangeKey" fails because [key must contain "pathParam" or "queryStringParam" and only one]]'
      )
    })

    it('should throw error if dynamodb service is missing the "action" property', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              hashKey: {
                pathParam: 'id',
                attributeType: 'S'
              },
              hashKey: {
                pathParam: 'sort',
                attributeType: 'S'
              }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "dynamodb" fails because [child "action" fails because ["action" is required]]'
      )
    })

    it('should throw error if the "action" is an invalid type given', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'post',
              action: 'xxxxx'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "action" fails because ["action" must be one of [PutItem, GetItem, DeleteItem]'
      )
    })

    it('should throw error if the "condition" parameter is not a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: { pathParam: 'id', attributeType: 'S' },
              condition: { a: 'b' }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.throw(
        'child "condition" fails because ["condition" must be a string]'
      )
    })

    it('should not throw error if the "condition" parameter is a string', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: { pathParam: 'id', attributeType: 'S' },
              condition: 'attribute_not_exists(id)'
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })

    it('should not throw error if request is a mapping template object', () => {
      serverlessApigatewayServiceProxy.serverless.service.custom = {
        apiGatewayServiceProxies: [
          {
            dynamodb: {
              tableName: 'yourTable',
              path: 'dynamodb',
              method: 'put',
              action: 'PutItem',
              hashKey: { pathParam: 'id', attributeType: 'S' },
              request: { template: { 'application/json': 'mapping template' } }
            }
          }
        ]
      }

      expect(() => serverlessApigatewayServiceProxy.validateServiceProxies()).to.not.throw()
    })
  })
})
