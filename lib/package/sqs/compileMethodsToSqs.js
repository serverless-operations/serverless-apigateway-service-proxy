'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async compileMethodsToSqs() {
    this.validated.events.forEach(async (event) => {
      if (event.functionName == 'sqs') {
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

        _.merge(
          template,
          await this.getSqsMethodIntegration(event.http),
          await this.getMethodResponses(event.http)
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

  async getSqsMethodIntegration(http) {
    let queueName = http.queueName
    if (typeof http.queueName == 'string') {
      queueName = `"${queueName}"`
    }
    const integration = {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn']
      },
      Uri: {
        'Fn::Join': [
          '',
          [
            'arn:aws:apigateway:',
            {
              Ref: 'AWS::Region'
            },
            ':sqs:path//',
            {
              Ref: 'AWS::AccountId'
            },
            '/',
            queueName
          ]
        ]
      },
      RequestParameters: {
        'integration.request.querystring.Action': "'SendMessage'",
        'integration.request.querystring.MessageBody': 'method.request.body.message'
      },
      RequestTemplates: { 'application/json': '{statusCode:200}' }
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
  }
}
