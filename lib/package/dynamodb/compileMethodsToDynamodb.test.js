'use strict'

const _ = require('lodash')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
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

  const testPostItem = (params, intRequestTemplates, intResponseTemplates) => {
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
        'arn:aws:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'PutItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethoddynamodbPost',
      method: 'POST',
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
        'arn:aws:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'GetItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethoddynamodbGet',
      method: 'GET',
      requestParams,
      intRequestTemplates,
      uri,
      intResponseTemplates
    })
  }

  const testUpdateItem = (params, intRequestTemplates, intResponseTemplates) => {
    const http = _.merge(
      {},
      {
        path: 'dynamodb',
        method: 'patch',
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
        'arn:aws:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'UpdateItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethoddynamodbPatch',
      method: 'PATCH',
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
        'arn:aws:apigateway:${AWS::Region}:dynamodb:action/${action}',
        {
          action: 'DeleteItem'
        }
      ]
    }

    testSingleProxy({
      http,
      logicalId: 'ApiGatewayMethoddynamodbDelete',
      method: 'DELETE',
      requestParams,
      intRequestTemplates,
      uri,
      intResponseTemplates
    })
  }

  describe('#post method', () => {
    it('should create corresponding resources when a hashkey is given', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Item": {"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},\n      #set ($body = $util.parseJson($input.body))\n      #foreach( $key in $body.keySet())\n        #set ($item = $body.get($key))\n        #foreach( $type in $item.keySet())\n          "$key":{"$type" : "$item.get($type)"}\n        #if($foreach.hasNext()),#end\n        #end\n      #if($foreach.hasNext()),#end\n      #end\n    }\n    }',
          {
            TableName: {
              Ref: 'MyTable'
            },
            HashKey: 'id',
            HashAttributeType: 'S',
            HashAttributeValue: '$context.requestId'
          }
        ]
      }
      const intResponseTemplate = {
        'Fn::Sub': [
          '{"${HashKey}": "${HashAttributeValue}"}',
          {
            HashKey: 'id',
            HashAttributeValue: '$context.requestId'
          }
        ]
      }
      testPostItem(
        { hashKey: 'id' },
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

  describe('#put method', () => {
    it('should create corresponding resources when hashkey is given with path parameter', () => {
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
      testPostItem(
        { hashKey: { pathParam: 'id', attributeType: 'S' }, path: '/dynamodb/{id}' },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when hashkey is given with querystring', () => {
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
      testPostItem(
        { hashKey: { queryStringParam: 'id', attributeType: 'S' }, path: '/dynamodb' },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with path parameter', () => {
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
      testPostItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with querystring', () => {
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
      testPostItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { queryStringParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })
  })

  describe('#get method', () => {
    it('should create corresponding resources when hashkey is given with path parameter', () => {
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
        { hashKey: { pathParam: 'id', attributeType: 'S' }, path: '/dynamodb/{id}' },
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

    it('should create corresponding resources when hashkey is given with querystring', () => {
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
        { hashKey: { queryStringParam: 'id', attributeType: 'S' }, path: '/dynamodb' },
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

    it('should create corresponding resources when rangekey is given with path parameter', () => {
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
          path: '/dynamodb/{id}/{range}'
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

    it('should create corresponding resources when rangekey is given with querystring', () => {
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
          path: '/dynamodb/{id}'
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

  describe('#patch method', () => {
    it('should create corresponding resources when hashkey is given with path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"}}\n       #set ($body = $util.parseJson($input.body))\n       ,"UpdateExpression":"$body.get(\'UpdateExpression\')"\n       ,"ExpressionAttributeValues":$input.json(\'$.ExpressionAttributeValues\')\n       #if ($body.ExpressionAttributeNames != "")\n       ,"ExpressionAttributeNames":$input.json(\'$.ExpressionAttributeNames\')\n       #end\n       }',
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

      testUpdateItem(
        { hashKey: { pathParam: 'id', attributeType: 'S' }, path: '/dynamodb/{id}' },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when hashkey is given with querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"}}\n       #set ($body = $util.parseJson($input.body))\n       ,"UpdateExpression":"$body.get(\'UpdateExpression\')"\n       ,"ExpressionAttributeValues":$input.json(\'$.ExpressionAttributeValues\')\n       #if ($body.ExpressionAttributeNames != "")\n       ,"ExpressionAttributeNames":$input.json(\'$.ExpressionAttributeNames\')\n       #end\n       }',
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

      testUpdateItem(
        { hashKey: { queryStringParam: 'id', attributeType: 'S' }, path: '/dynamodb/{id}' },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with path parameter', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}}\n       #set ($body = $util.parseJson($input.body))\n       ,"UpdateExpression":"$body.get(\'UpdateExpression\')"\n       ,"ExpressionAttributeValues":$input.json(\'$.ExpressionAttributeValues\')\n       #if ($body.ExpressionAttributeNames != "")\n       ,"ExpressionAttributeNames":$input.json(\'$.ExpressionAttributeNames\')\n       #end\n       }',
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

      testUpdateItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { pathParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}/{range}'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with querystring', () => {
      const intRequestTemplate = {
        'Fn::Sub': [
          '{"TableName": "${TableName}","Key":{"${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},"${RangeKey}": {"${RangeAttributeType}": "${RangeAttributeValue}"}}\n       #set ($body = $util.parseJson($input.body))\n       ,"UpdateExpression":"$body.get(\'UpdateExpression\')"\n       ,"ExpressionAttributeValues":$input.json(\'$.ExpressionAttributeValues\')\n       #if ($body.ExpressionAttributeNames != "")\n       ,"ExpressionAttributeNames":$input.json(\'$.ExpressionAttributeNames\')\n       #end\n       }',
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

      testUpdateItem(
        {
          hashKey: { pathParam: 'id', attributeType: 'S' },
          rangeKey: { queryStringParam: 'range', attributeType: 'S' },
          path: '/dynamodb/{id}'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })
  })

  describe('#delete method', () => {
    it('should create corresponding resources when hashkey is given with path parameter', () => {
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
        { hashKey: { pathParam: 'id', attributeType: 'S' }, path: '/dynamodb/{id}' },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when hashkey is given with querystring', () => {
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
        { hashKey: { queryStringParam: 'id', attributeType: 'S' }, path: '/dynamodb/{id}' },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with path parameter', () => {
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
          path: '/dynamodb/{id}/{range}'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })

    it('should create corresponding resources when rangekey is given with querystring', () => {
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
          path: '/dynamodb/{id}'
        },
        {
          'application/json': intRequestTemplate,
          'application/x-www-form-urlencoded': intRequestTemplate
        },
        {}
      )
    })
  })

  /*
  it(
    'should create corresponding resources when s3 PutObject proxy is given with a path key',
    () => {
      testPutObject({ pathParam: 'key' }, 'method.request.path.key')
    }
  )

  it(
    'should create corresponding resources when s3 PutObject proxy is given with a query string key',
    () => {
      testPutObject({ queryStringParam: 'key' }, 'method.request.querystring.key')
    }
  )

  it(
    'should create corresponding resources when s3 PutObject proxy is given with a static key',
    () => {
      testPutObject('myKey', "'myKey'")
    }
)*/

  /*
  it(
    'should create corresponding resources when s3 DeleteObject proxy is given with a path key',
    () => {
      testDeleteObject({ pathParam: 'key' }, 'method.request.path.key')
    }
  )

  it(
    'should create corresponding resources when s3 DeleteObject proxy is given with a query string key',
    () => {
      testDeleteObject({ queryStringParam: 'key' }, 'method.request.querystring.key')
    }
  )

  it(
    'should create corresponding resources when s3 DeleteObject proxy is given with a static key',
    () => {
      testDeleteObject('myKey', "'myKey'")
    }
  )

  it('should create corresponding resources when a s3 proxy is given with cors', () => {
    serverlessApigatewayServiceProxy.validated = {
      events: [
        {
          serviceName: 's3',
          http: {
            path: 's3',
            method: 'post',
            bucket: {
              Ref: 'MyBucket'
            },
            action: 'PutObject',
            key: {
              pathParam: 'key'
            },
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
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()
    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.deep.equal({
      ApiGatewayMethods3Post: {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: 'POST',
          RequestParameters: {
            'method.request.header.Content-Type': true,
            'method.request.path.key': true
          },
          AuthorizationType: 'NONE',
          AuthorizationScopes: undefined,
          AuthorizerId: undefined,
          ApiKeyRequired: false,
          ResourceId: { Ref: 'ApiGatewayResourceS3' },
          RestApiId: { Ref: 'ApiGatewayRestApi' },
          Integration: {
            Type: 'AWS',
            IntegrationHttpMethod: 'PUT',
            Credentials: { 'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn'] },
            Uri: {
              'Fn::Sub': ['arn:aws:apigateway:${AWS::Region}:s3:path/{bucket}/{object}', {}]
            },
            PassthroughBehavior: 'WHEN_NO_MATCH',
            RequestParameters: {
              'integration.request.header.Content-Type': 'method.request.header.Content-Type',
              'integration.request.header.x-amz-acl': "'authenticated-read'",
              'integration.request.path.bucket': {
                'Fn::Sub': [
                  "'${bucket}'",
                  {
                    bucket: {
                      Ref: 'MyBucket'
                    }
                  }
                ]
              },
              'integration.request.path.object': 'method.request.path.key'
            },
            IntegrationResponses: [
              {
                StatusCode: 400,
                SelectionPattern: '4\\d{2}',
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              },
              {
                StatusCode: 500,
                SelectionPattern: '5\\d{2}',
                ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': "'*'" },
                ResponseTemplates: {}
              },
              {
                StatusCode: 200,
                SelectionPattern: '2\\d{2}',
                ResponseParameters: {
                  'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                  'method.response.header.Content-Length':
                    'integration.response.header.Content-Length',
                  'method.response.header.Access-Control-Allow-Origin': "'*'"
                },
                ResponseTemplates: {}
              }
            ]
          },
          MethodResponses: [
            {
              ResponseParameters: {
                'method.response.header.Access-Control-Allow-Origin': true,
                'method.response.header.Content-Type': true,
                'method.response.header.Content-Length': true
              },
              ResponseModels: {},
              StatusCode: 200
            },
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': true },
              ResponseModels: {},
              StatusCode: 400
            },
            {
              ResponseParameters: { 'method.response.header.Access-Control-Allow-Origin': true },
              ResponseModels: {},
              StatusCode: 500
            }
          ]
      }
    }
  })
})*/

  /*
  it('should create corresponding resources with "NONE" authorization type', () => {
    testAuthorization({ authorizationType: 'NONE' })
  })

  it('should create corresponding resources with "CUSTOM" authorization type', () => {
    testAuthorization({ authorizationType: 'CUSTOM', authorizerId: { Ref: 'AuthorizerLogicalId' } })
  })

  it('should create corresponding resources with "AWS_IAM" authorization type', () => {
    testAuthorization({ authorizationType: 'AWS_IAM' })
  })

  it('should create corresponding resources with "AWS_IAM" authorization type', () => {
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
      s3: {
        name: 's3',
        resourceLogicalId: 'ApiGatewayResourceS3'
      }
    }

    serverlessApigatewayServiceProxy.compileMethodsToS3()

    expect(serverless.service.provider.compiledCloudFormationTemplate.Resources).to.be.empty
})*/
})
