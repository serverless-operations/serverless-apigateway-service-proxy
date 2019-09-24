'use strict'

const _ = require('lodash')

module.exports = {
  compileMethodsToSqs() {
    this.validated.events.forEach((event) => {
      if (event.serviceName == 'sqs') {
        const resourceId = this.getResourceId(event.http.path)
        const resourceName = this.getResourceName(event.http.path)

        const template = {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            HttpMethod: event.http.method.toUpperCase(),
            RequestParameters: {},
            AuthorizationScopes: event.http.auth.authorizationScopes,
            AuthorizationType: event.http.auth.authorizationType,
            AuthorizerId: event.http.auth.authorizerId,
            ApiKeyRequired: Boolean(event.http.private),
            ResourceId: resourceId,
            RestApiId: this.provider.getApiGatewayRestApiId()
          }
        }

        _.merge(
          template,
          this.getSqsMethodIntegration(event.http),
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

  getSqsMethodIntegration(http) {
    const roleArn = http.roleArn || {
      'Fn::GetAtt': ['ApigatewayToSqsRole', 'Arn']
    }

    const integration = {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: roleArn,
      Uri: {
        'Fn::Sub': [
          'arn:aws:apigateway:${AWS::Region}:sqs:path//${AWS::AccountId}/${queueName}',
          { queueName: http.queueName }
        ]
      },
      RequestParameters: _.merge(
        {
          'integration.request.querystring.Action': "'SendMessage'",
          'integration.request.querystring.MessageBody': 'method.request.body'
        },
        http.requestParameters
      ),
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
        },
        {
          StatusCode: 500,
          SelectionPattern: 500,
          ResponseParameters: {},
          ResponseTemplates: {}
        }
      ]
    }

    this.addCors(http, integrationResponse)

    _.merge(integration, integrationResponse)

    return {
      Properties: {
        Integration: integration
      }
    }
  }
}
