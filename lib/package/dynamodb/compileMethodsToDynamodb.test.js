'use strict'

const _ = require('lodash')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider')
const ServerlessApigatewayServiceProxy = require('./../../index')

const expect = require('chai').expect

const template = {
  Type: 'AWS::ApiGateway::Method',
  Properties: {
    RequestParameters: {},
    AuthorizationType: 'NONE',
    ApiKeyRequired: false,
    ResourceId: {
      Ref: 'ApiGatewayResourceDynamodb'
    },
    RestApiId: {
      Ref: 'ApiGatewayRestApi'
    },
    Integration: {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToDynamodbRole', 'Arn']
      },
      PassthroughBehavior: 'NEVER',
      IntegrationResponses: [
        {
          StatusCode: 200,
          SelectionPattern: '2\\d{2}',
          ResponseParameters: {}
        },
        {
          StatusCode: 400,
          SelectionPattern: '4\\d{2}',
          ResponseParameters: {},
          ResponseTemplates: {}
        },
        {
          StatusCode: 500,
          SelectionPattern: '5\\d{2}',
          ResponseParameters: {},
          ResponseTemplates: {}
        }
      ]
    },
    MethodResponses: [
      {
        ResponseParameters: {},
        ResponseModels: {},
        StatusCode: 200
      },
      {
        ResponseParameters: {},
        ResponseModels: {},
        StatusCode: 400
      },
      {
        ResponseParameters: {},
        ResponseModels: {},
        StatusCode: 500
      }
    ]
  }
}

describe('#compileMethodsToDynamodb()', () => {
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

  const testSingleProxy = (opts) => {
    const { http, logicalId, method, intRequestTemplates, uri, intResponseTemplates } = opts

    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 'dynamodb',
          http
        }
      ]
    }
    serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
    serverlessApigatewayServiceProxy.apiGatewayResources = {
      [http.path]: {
        name: 'dynamodb',
        resourceLogicalId: 'ApiGatewayResourceDynamodb'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToDynamodb()

    const diff = {
      Properties: {
        HttpMethod: method,
        AuthorizationType: http.auth.authorizationType,
        AuthorizationScopes: http.auth.authorizationScopes,
        AuthorizerId: http.auth.authorizerId,
        Integration: {
          Uri: uri,
          RequestTemplates: intRequestTemplates,
          IntegrationResponses: [
            {
              ResponseTemplates: intResponseTemplates
            }
          ]
        }
      }
    }
    const resource = _.merge({}, template, diff)

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      [logicalId]: resource
    })
  }

  const testPutItem = (params, intRequestTemplates, intResponseTemplates) => {
    const http = _.merge(
      {},
      {
        path: 'dynamodb',
        method: 'post',
        tableName: {
          Ref: 'MyTable'
        },
        auth: { authorizationType: 'NONE' }
      },
      params
    )

    const requestParams = {}

    const uri = {
      'Fn::Sub': [
        'arn:${AWS::Partition}:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'PutItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: `ApiGatewayMethoddynamodb${http.method.substring(0, 1).toUpperCase() +
        http.method.substring(1)}`,
      method: http.method.toUpperCase(),
      requestParams,
      intRequestTemplates,
      uri,
      intResponseTemplates
    })
  }

  const testGetItem = (params, intRequestTemplates, intResponseTemplates) => {
    const http = _.merge(
      {},
      {
        path: 'dynamodb',
        method: 'get',
        tableName: {
          Ref: 'MyTable'
        },
        auth: { authorizationType: 'NONE' }
      },
      params
    )

    const requestParams = {}

    const uri = {
      'Fn::Sub': [
        'arn:${AWS::Partition}:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'GetItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: `ApiGatewayMethoddynamodb${http.method.substring(0, 1).toUpperCase() +
        http.method.substring(1)}`,
      method: http.method.toUpperCase(),
      requestParams,
      intRequestTemplates,
      uri,
      intResponseTemplates
    })
  }

  const testDeleteItem = (params, intRequestTemplates, intResponseTemplates) => {
    const http = _.merge(
      {},
      {
        path: 'dynamodb',
        method: 'delete',
        tableName: {
          Ref: 'MyTable'
        },
        auth: { authorizationType: 'NONE' }
      },
      params
    )

    const requestParams = {}

    const uri = {
      'Fn::Sub': [
        'arn:${AWS::Partition}:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'DeleteItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: `ApiGatewayMethoddynamodb${http.method.substring(0, 1).toUpperCase() +
        http.method.substring(1)}`,
      method: http.method.toUpperCase(),
      requestParams,
      intRequestTemplates,
      uri,
      intResponseTemplates
    })
  }

  describe('#PutItem action', () => {
    it('should create corresponding resources when hashkey is given with a path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id'
          }
        ]
      }
      testPutItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'PutItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when hashkey is given with a querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().querystring.id'
          }
        ]
      }
      testPutItem(
        {
          hashKey: { queryStringParam: 'id', attributeType: 'S' },
          path: '/dynamodb',
          action: 'PutItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with a path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().path.range'
          }
        ]
      }
      testPutItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}',
          action: 'PutItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with a querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().querystring.range'
          }
        ]
      }
      testPutItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { queryStringParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'PutItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when condition is given', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    ,"ConditionExpression": "${ConditionExpression}"}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            ConditionExpression: 'attribute_not_exists(id)',
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().path.range'
          }
        ]
      }
      testPutItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}',
          condition: 'attribute_not_exists(id)',
          action: 'PutItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create a custom request template when one is given', () => {
      const customRequestTemplate = "#set($inputRoot = $input.path('$'))\n{ }"
      testPutItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}',
          condition: 'attribute_not_exists(id)',
          action: 'PutItem',
          request: {
            template: {
              'application/json': customRequestTemplate,
              'application/x-www-form-urlencoded': customRequestTemplate
            }
          }
        },
        {
          'application/json': customRequestTemplate,
          'application/x-www-form-urlencoded': customRequestTemplate
        },
        {}
      )
    })
  })

  describe('#get method', () => {
    it('should create corresponding resources when hashkey is given with a path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id'
          }
        ]
      }
      const intResponseTemplate =
        '#set($item = $input.path(\'$.Item\')){#foreach($key in $item.keySet())#set ($value = $item.get($key))#foreach( $type in $value.keySet())"$key":"$value.get($type)"#if($foreach.hasNext()),#end#end#if($foreach.hasNext()),#end#end}'
      testGetItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'GetItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {
          'application/json': intResponseTemplate,
          'application/x-www-form-urlencoded': intResponseTemplate
        }
      )
    })

    it('should create corresponding resources when hashkey is given with a querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().querystring.id'
          }
        ]
      }
      const intResponseTemplate =
        '#set($item = $input.path(\'$.Item\')){#foreach($key in $item.keySet())#set ($value = $item.get($key))#foreach( $type in $value.keySet())"$key":"$value.get($type)"#if($foreach.hasNext()),#end#end#if($foreach.hasNext()),#end#end}'
      testGetItem(
        {
          hashKey: { queryStringParam: 'id', attributeType: 'S' },
          path: '/dynamodb',
          action: 'GetItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {
          'application/json': intResponseTemplate,
          'application/x-www-form-urlencoded': intResponseTemplate
        }
      )
    })

    it('should create corresponding resources when rangekey is given with a path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().path.range'
          }
        ]
      }
      const intResponseTemplate =
        '#set($item = $input.path(\'$.Item\')){#foreach($key in $item.keySet())#set ($value = $item.get($key))#foreach( $type in $value.keySet())"$key":"$value.get($type)"#if($foreach.hasNext()),#end#end#if($foreach.hasNext()),#end#end}'
      testGetItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}',
          action: 'GetItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {
          'application/json': intResponseTemplate,
          'application/x-www-form-urlencoded': intResponseTemplate
        }
      )
    })

    it('should create corresponding resources when rangekey is given with a querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().querystring.range'
          }
        ]
      }
      const intResponseTemplate =
        '#set($item = $input.path(\'$.Item\')){#foreach($key in $item.keySet())#set ($value = $item.get($key))#foreach( $type in $value.keySet())"$key":"$value.get($type)"#if($foreach.hasNext()),#end#end#if($foreach.hasNext()),#end#end}'
      testGetItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { queryStringParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'GetItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {
          'application/json': intResponseTemplate,
          'application/x-www-form-urlencoded': intResponseTemplate
        }
      )
    })
  })

  describe('#delete method', () => {
    it('should create corresponding resources when hashkey is given with a path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id'
          }
        ]
      }

      testDeleteItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'DeleteItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when hashkey is given with a querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().querystring.id'
          }
        ]
      }

      testDeleteItem(
        {
          hashKey: { queryStringParam: 'id', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'DeleteItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with a path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().path.range'
          }
        ]
      }

      testDeleteItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}',
          action: 'DeleteItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with a querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}}}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().querystring.range'
          }
        ]
      }

      testDeleteItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { queryStringParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}',
          action: 'DeleteItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when condition is given', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}},"ConditionExpression": "${ConditionExpression}"}',
          {
            TableName: {
              Ref: 'MyTable'
            },
            ConditionExpression: 'attribute_not_exists(id)',
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id',
            RangeKey: 'range',
            RangeAttributeType: 'S',
            RangeAttributeValue: '$input.params().path.range'
          }
        ]
      }
      testDeleteItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}',
          condition: 'attribute_not_exists(id)',
          action: 'DeleteItem'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })
  })

  describe('#cors', () => {
    it('should create corresponding resources when a dynamodb proxy is given with cors', () => {
      serverlessApigatewayServiceProxy.validated = {
        events: [
          {
            serviceName: 'dynamodb',
            http: {
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              tableName: {
                Ref: 'MyTable'
              },
              key: 'key',
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
              },
              auth: { authorizationType: 'NONE' }
            }
          }
        ]
      }
      serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
      serverlessApigatewayServiceProxy.apiGatewayResources = {
        dynamodb: {
          name: 'dynamodb',
          resourceLogicalId: 'ApiGatewayResourceDynamodb'
        }
      }

      serverlessApigatewayServiceProxy.compileMethodsToDynamodb()
      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
        ApiGatewayMethoddynamodbPost: {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            HttpMethod: 'POST',
            RequestParameters: {},
            AuthorizationScopes: undefined,
            AuthorizerId: undefined,
            AuthorizationType: 'NONE',
            ApiKeyRequired: false,
            ResourceId: { Ref: 'ApiGatewayResourceDynamodb' },
            RestApiId: { Ref: 'ApiGatewayRestApi' },
            Integration: {
              IntegrationHttpMethod: 'POST',
              Type: 'AWS',
              Credentials: { 'Fn::GetAtt': ['ApigatewayToDynamodbRole', 'Arn'] },
              Uri: {
                'Fn::Sub': [
                  'arn:${AWS::Partition}:apigateway:${AWS::Region}:dynamodb:action/${action}',
                  { action: 'PutItem' }
                ]
              },
              PassthroughBehavior: 'NEVER',
              RequestTemplates: {
                'application/json': {
                  'Fn::Sub': [
                    '{"TableName": "${TableName}","Item": {\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
                    { TableName: { Ref: 'MyTable' } }
                  ]
                },
                'application/x-www-form-urlencoded': {
                  'Fn::Sub': [
                    '{"TableName": "${TableName}","Item": {\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
                    { TableName: { Ref: 'MyTable' } }
                  ]
                }
              },
              IntegrationResponses: [
                {
                  StatusCode: 200,
                  SelectionPattern: '2\\d{2}',
                  ResponseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': "'*'"
                  },
                  ResponseTemplates: {}
                },
                {
                  StatusCode: 400,
                  SelectionPattern: '4\\d{2}',
                  ResponseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': "'*'"
                  },
                  ResponseTemplates: {}
                },
                {
                  StatusCode: 500,
                  SelectionPattern: '5\\d{2}',
                  ResponseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': "'*'"
                  },
                  ResponseTemplates: {}
                }
              ]
            },
            MethodResponses: [
              {
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseModels: {},
                StatusCode: 200
              },
              {
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseModels: {},
                StatusCode: 400
              },
              {
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseModels: {},
                StatusCode: 500
              }
            ]
          }
        }
      })
    })
  })

  describe('#private', () => {
    it('should create corresponding resources when a dynamodb proxy is given with private', () => {
      serverlessApigatewayServiceProxy.validated = {
        events: [
          {
            serviceName: 'dynamodb',
            http: {
              path: 'dynamodb',
              method: 'post',
              action: 'PutItem',
              tableName: {
                Ref: 'MyTable'
              },
              key: 'key',
              private: true,
              auth: { authorizationType: 'NONE' }
            }
          }
        ]
      }
      serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
      serverlessApigatewayServiceProxy.apiGatewayResources = {
        dynamodb: {
          name: 'dynamodb',
          resourceLogicalId: 'ApiGatewayResourceDynamodb'
        }
      }

      serverlessApigatewayServiceProxy.compileMethodsToDynamodb()
      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
        ApiGatewayMethoddynamodbPost: {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            HttpMethod: 'POST',
            RequestParameters: {},
            AuthorizationScopes: undefined,
            AuthorizerId: undefined,
            AuthorizationType: 'NONE',
            ApiKeyRequired: true,
            ResourceId: { Ref: 'ApiGatewayResourceDynamodb' },
            RestApiId: { Ref: 'ApiGatewayRestApi' },
            Integration: {
              IntegrationHttpMethod: 'POST',
              Type: 'AWS',
              Credentials: { 'Fn::GetAtt': ['ApigatewayToDynamodbRole', 'Arn'] },
              Uri: {
                'Fn::Sub': [
                  'arn:${AWS::Partition}:apigateway:${AWS::Region}:dynamodb:action/${action}',
                  { action: 'PutItem' }
                ]
              },
              PassthroughBehavior: 'NEVER',
              RequestTemplates: {
                'application/json': {
                  'Fn::Sub': [
                    '{"TableName": "${TableName}","Item": {\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
                    { TableName: { Ref: 'MyTable' } }
                  ]
                },
                'application/x-www-form-urlencoded': {
                  'Fn::Sub': [
                    '{"TableName": "${TableName}","Item": {\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
                    { TableName: { Ref: 'MyTable' } }
                  ]
                }
              },
              IntegrationResponses: [
                {
                  StatusCode: 200,
                  SelectionPattern: '2\\d{2}',
                  ResponseParameters: {},
                  ResponseTemplates: {}
                },
                {
                  StatusCode: 400,
                  SelectionPattern: '4\\d{2}',
                  ResponseParameters: {},
                  ResponseTemplates: {}
                },
                {
                  StatusCode: 500,
                  SelectionPattern: '5\\d{2}',
                  ResponseParameters: {},
                  ResponseTemplates: {}
                }
              ]
            },
            MethodResponses: [
              {
                ResponseParameters: {},
                ResponseModels: {},
                StatusCode: 200
              },
              {
                ResponseParameters: {},
                ResponseModels: {},
                StatusCode: 400
              },
              {
                ResponseParameters: {},
                ResponseModels: {},
                StatusCode: 500
              }
            ]
          }
        }
      })
    })
  })

  describe('#authorization', () => {
    const testAuthorization = (auth) => {
      const param = {
        hashKey: {
          pathParam: 'id',
          attributeType: 'S'
        },
        action: 'PutItem',
        auth
      }

      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$input.params().path.id'
          }
        ]
      }
      testPutItem(
        param,
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    }

    it('should create corresponding resources with "NONE" authorization type', () => {
      testAuthorization({ authorizationType: 'NONE' })
    })

    it('should create corresponding resources with "CUSTOM" authorization type', () => {
      testAuthorization({
        authorizationType: 'CUSTOM',
        authorizerId: { Ref: 'AuthorizerLogicalId' }
      })
    })

    it('should create corresponding resources with "AWS_IAM" authorization type', () => {
      testAuthorization({ authorizationType: 'AWS_IAM' })
    })

    it('should create corresponding resources with "COGNITO_USER_POOLS" authorization type', () => {
      testAuthorization({ authorizationType: 'COGNITO_USER_POOLS', authorizationScopes: ['admin'] })
    })

    it('should not create corresponding resources when other proxies are given', () => {
      serverlessApigatewayServiceProxy.validated = {
        events: [
          {
            serviceName: 'sqs',
            http: {
              queueName: 'myQueue',
              path: 'sqs',
              method: 'post',
              auth: {
                authorizationType: 'NONE'
              }
            }
          }
        ]
      }

      serverlessApigatewayServiceProxy.apiGatewayRestApiLogicalId = 'ApiGatewayRestApi'
      serverlessApigatewayServiceProxy.apiGatewayResources = {
        dynamodb: {
          name: 'dynamodb',
          resourceLogicalId: 'ApiGatewayResourceDynamodb'
        }
      }

      serverlessApigatewayServiceProxy.compileMethodsToS3()

      expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
    })
  })
})
