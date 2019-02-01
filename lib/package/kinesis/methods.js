'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async compileKinesisMethods() {
    this.apiGatewayMethodLogicalIds = []
    this.validated.events.forEach((event) => {
      const resourceId = this.getResourceId(event.http.path)
      const resourceName = this.getResourceName(event.http.path)

      const template = {
        Type: 'AWS::ApiGateway::Method',
        Properties: {
          HttpMethod: event.http.method.toUpperCase(),
          RequestParameters: {},
          AuthorizationType: 'NONE',
          ApiKeyRequired: Boolean(event.http.private),
          ResourceId: resourceId,
          RestApiId: this.provider.getApiGatewayRestApiId()
        }
      }

      _.merge(template, this.getMethodIntegration(event.http), this.getMethodResponses(event.http))

      const methodLogicalId = this.provider.naming.getMethodLogicalId(
        resourceName,
        event.http.method
      )

      this.apiGatewayMethodLogicalIds.push(methodLogicalId)

      _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
        [methodLogicalId]: template
      })
    })

    return BbPromise.resolve()
  },

  getMethodIntegration(http) {
    const integration = {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn']
      },
      Uri: {
        'Fn::Join': [
          '',
          [
            'arn:aws:apigateway:',
            {
              Ref: 'AWS::Region'
            },
            ':kinesis:action/PutRecord'
          ]
        ]
      },
      PassthroughBehavior: 'NEVER',
      RequestTemplates: this.getIntegrationRequestTemplates(http)
    }

    const integrationResponse = {
      IntegrationResponses: [
        {
          StatusCode: 200,
          SelectionPattern: 200,
          ResponseParameters: {},
          ResponseTemplates: {}
        },
        {
          StatusCode: 400,
          SelectionPattern: 400,
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

      integrationResponse.IntegrationResponses.forEach((val, i) => {
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

  getIntegrationRequestTemplates(http) {
    const defaultRequestTemplates = this.getDefaultRequestTemplates(http)
    return Object.assign(defaultRequestTemplates, _.get(http, ['request', 'template']))
  },

  getDefaultRequestTemplates(http) {
    return {
      'application/json': this.buildDefaultRequestTemplate(http),
      'application/x-www-form-urlencoded': this.buildDefaultRequestTemplate(http)
    }
  },

  buildDefaultRequestTemplate(http) {
    let streamName
    if (typeof http.streamName == 'object') {
      streamName = http.streamName
    } else {
      streamName = `"${http.streamName}"`
    }

    return {
      'Fn::Join': [
        '',
        [
          '{',
          '"StreamName": "',
          streamName,
          '",',
          '"Data": "$util.base64Encode($input.json(\'$.Data\'))",',
          '"PartitionKey": "$input.path(\'$.PartitionKey\')"',
          '}'
        ]
      ]
    }
  },

  getMethodResponses(http) {
    const methodResponse = {
      Properties: {
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
          }
        ]
      }
    }

    if (http && http.cors) {
      let origin = http.cors.origin
      if (http.cors.origins && http.cors.origins.length) {
        origin = http.cors.origins.join(',')
      }

      methodResponse.Properties.MethodResponses.forEach((val, i) => {
        methodResponse.Properties.MethodResponses[i].ResponseParameters = {
          'method.response.header.Access-Control-Allow-Origin': `'${origin}'`
        }
      })
    }

    return methodResponse
  }
}
