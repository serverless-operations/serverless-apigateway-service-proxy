'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async compileMethodsToKinesis() {
    this.validated.events.forEach(async (event) => {
      if (event.serviceName == 'kinesis') {
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
          this.getKinesisMethodIntegration(event.http),
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

    return BbPromise.resolve()
  },

  getKinesisMethodIntegration(http) {
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
      RequestTemplates: this.getKinesisIntegrationRequestTemplates(http)
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

  getKinesisIntegrationRequestTemplates(http) {
    const defaultRequestTemplates = this.getDefaultKinesisRequestTemplates(http)
    return Object.assign(defaultRequestTemplates, _.get(http, ['request', 'template']))
  },

  getDefaultKinesisRequestTemplates(http) {
    return {
      'application/json': this.buildDefaultKinesisRequestTemplate(http),
      'application/x-www-form-urlencoded': this.buildDefaultKinesisRequestTemplate(http)
    }
  },

  buildDefaultKinesisRequestTemplate(http) {
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
  }
}
