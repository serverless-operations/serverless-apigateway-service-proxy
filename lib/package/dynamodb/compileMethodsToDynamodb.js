'use strict'

const _ = require('lodash')

module.exports = {
  compileMethodsToDynamodb() {
    this.validated.events.forEach((event) => {
      if (event.serviceName == 'dynamodb') {
        const resourceId = this.getResourceId(event.http.path)
        const resourceName = this.getResourceName(event.http.path)

        const template = {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            HttpMethod: event.http.method.toUpperCase(),
            RequestParameters: {},
            AuthorizationType: event.http.auth.authorizationType,
            AuthorizationScopes: event.http.auth.authorizationScopes,
            AuthorizerId: event.http.auth.authorizerId,
            ApiKeyRequired: Boolean(event.http.private),
            ResourceId: resourceId,
            RestApiId: this.provider.getApiGatewayRestApiId()
          }
        }

        _.merge(
          template,
          this.getDynamodbMethodIntegration(event.http),
          this.getMethodResponses(event.http)
        )

        const methodLogicalId = this.provider.naming.getMethodLogicalId(
          resourceName,
          event.http.method
        )

        this.apiGatewayMethodLogicalIds.push(methodLogicalId)

        _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
          [methodLogicalId]: template
        })
      }
    })
  },

  getDynamodbMethodIntegration(http) {
    const integration = {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToDynamodbRole', 'Arn']
      },
      Uri: {
        'Fn::Sub': [
          'arn:aws:apigateway:${AWS::Region}:dynamodb:action/${action}',
          { action: http.action }
        ]
      },
      PassthroughBehavior: 'NEVER',
      RequestTemplates: this.getDynamodbIntegrationRequestTemplates(http)
    }

    const integrationResponse = {
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
    }

    if (http && http.cors) {
      let origin = http.cors.origin
      if (http.cors.origins && http.cors.origins.length) {
        origin = http.cors.origins.join(',')
      }

      integrationResponse.IntegrationResponses.forEach(async (val, i) => {
        integrationResponse.IntegrationResponses[i].ResponseParameters = {
          'method.response.header.Access-Control-Allow-Origin': `'${origin}'`
        }
      })
    }

    _.merge(integration, integrationResponse)

    return {
      Properties: {
        Integration: integration
      }
    }
  },

  getDynamodbIntegrationRequestTemplates(http) {
    const defaultRequestTemplates = this.getDefaultDynamodbRequestTemplates(http)
    return Object.assign(defaultRequestTemplates, _.get(http, ['request', 'template']))
  },

  getDefaultDynamodbRequestTemplates(http) {
    return {
      'application/json': this.buildDefaultDynamodbRequestTemplate(http),
      'application/x-www-form-urlencoded': this.buildDefaultDynamodbRequestTemplate(http)
    }
  },

  getDynamodbObjectRequestParameter(http) {
    if (http.hashKey.pathParam) {
      return {
        hashKey: http.hashKey.pathParam,
        attributeType: http.hashKey.attributeType,
        attributeValue: `$input.params().path.${http.hashKey.pathParam}`
      }
    }

    if (http.hashKey.queryStringParam) {
      return {
        hashKey: http.hashKey.queryStringParam,
        attributeType: http.hashKey.attributeType,
        attributeValue: `$input.params().querystring.${http.hashKey.queryStringParam}`
      }
    }

    if (http.hashKey.bodyParam) {
      return {
        hashKey: http.hashKey.bodyParam,
        attributeType: http.hashKey.attributeType,
        attributeValue: `$util.parseJson($input.body).${http.hashKey.bodyParam}`
      }
    }

    return {
      hashKey: http.hashKey,
      attributeType: 'S',
      attributeValue: '$context.requestId'
    }
  },

  buildDefaultDynamodbRequestTemplate(http) {
    const objectRequestParam = this.getDynamodbObjectRequestParameter(http)
    const putItemRequestTemplate =
      '\
    {\
        "TableName": "${TableName}",\
        "Item": {\
            "${HashKey}": {"${HashAttributeType}": "${HashAttributeValue}"},\
            #set ($body = $util.parseJson($input.body))\
            #foreach( $key in $body.keySet())\
                #set ($item = $body.get($key))\
                #foreach( $type in $item.keySet())\
                    "$key":{"$type" : "$item.get($type)"}\
                #if($foreach.hasNext()),#end\
                #end\
            #if($foreach.hasNext()),#end\
            #end\
        }\
    }\
    '
    return {
      'Fn::Sub': [
        `${putItemRequestTemplate}`,
        {
          TableName: http.tableName,
          HashKey: `${objectRequestParam.hashKey}`,
          HashAttributeType: `${objectRequestParam.attributeType}`,
          HashAttributeValue: `${objectRequestParam.attributeValue}`
        }
      ]
    }
  }
}
