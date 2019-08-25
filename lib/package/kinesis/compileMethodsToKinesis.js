'use strict'

const _ = require('lodash')

module.exports = {
  compileMethodsToKinesis() {
    this.validated.events.forEach((event) => {
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
  },

  getKinesisMethodIntegration(http) {
    const integration = {
      IntegrationHttpMethod: 'POST',
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToKinesisRole', 'Arn']
      },
      Uri: {
        'Fn::Sub': 'arn:aws:apigateway:${AWS::Region}:kinesis:action/PutRecord'
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

  getKinesisObjectRequestParameter(http) {
    if (!_.has(http, 'partitionKey')) {
      return '$context.requestId'
    }

    if (http.partitionKey.pathParam) {
      return `$input.params().path.${http.partitionKey.pathParam}`
    }

    if (http.partitionKey.queryStringParam) {
      return `$input.params().querystring.${http.partitionKey.queryStringParam}`
    }

    if (http.partitionKey.bodyParam) {
      return `$util.parseJson($input.body).${http.partitionKey.bodyParam}`
    }

    return `${http.partitionKey}`
  },

  buildDefaultKinesisRequestTemplate(http) {
    const objectRequestParam = this.getKinesisObjectRequestParameter(http)

    return {
      'Fn::Sub': [
        '{"StreamName":"${StreamName}","Data":"${Data}","PartitionKey":"${PartitionKey}"}',
        {
          StreamName: http.streamName,
          Data: '$util.base64Encode($input.body)',
          PartitionKey: `${objectRequestParam}`
        }
      ]
    }
  }
}
