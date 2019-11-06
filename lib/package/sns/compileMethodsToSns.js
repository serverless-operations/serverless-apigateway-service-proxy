'use strict'

const _ = require('lodash')

module.exports = {
  compileMethodsToSns() {
    this.validated.events.forEach((event) => {
      if (event.serviceName == 'sns') {
        const resourceId = this.getResourceId(event.http.path)
        const resourceName = this.getResourceName(event.http.path)

        const template = {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            HttpMethod: event.http.method.toUpperCase(),
            RequestParameters: event.http.acceptParameters || {},
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
          this.getSnsMethodIntegration(event.http),
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

  getSnsMethodIntegration(http) {
    const roleArn = http.roleArn || {
      'Fn::GetAtt': ['ApigatewayToSnsRole', 'Arn']
    }

    const integration = {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: roleArn,
      Uri: {
        'Fn::Sub': 'arn:aws:apigateway:${AWS::Region}:sns:path//'
      },
      PassthroughBehavior: 'NEVER',
      RequestParameters: {
        'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
      },
      RequestTemplates: this.getSnsIntegrationRequestTemplates(http)
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
  },

  getSnsIntegrationRequestTemplates(http) {
    const defaultRequestTemplates = this.getDefaultSnsRequestTemplates(http)
    return Object.assign(defaultRequestTemplates, _.get(http, ['request', 'template']))
  },

  getDefaultSnsRequestTemplates(http) {
    return {
      'application/json': this.buildDefaultSnsRequestTemplate(http),
      'application/x-www-form-urlencoded': this.buildDefaultSnsRequestTemplate(http)
    }
  },

  buildDefaultSnsRequestTemplate(http) {
    const { topicName } = http

    const topicArn = {
      'Fn::Sub': ['arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}', { topicName }]
    }

    return {
      'Fn::Join': [
        '',
        [
          "Action=Publish&Message=$util.urlEncode($input.body)&TopicArn=$util.urlEncode('",
          topicArn,
          "')"
        ]
      ]
    }
  }
}
