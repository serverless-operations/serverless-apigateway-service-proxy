'use strict'

const _ = require('lodash')

module.exports = {
  compileMethodsToS3() {
    this.validated.events.forEach((event) => {
      if (event.serviceName == 's3') {
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
          this.getS3MethodIntegration(event.http),
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

  getIntegrationHttpMethod(http) {
    switch (http.action) {
      case 'GetObject':
        return 'GET'
      case 'PutObject':
        return 'PUT'
      case 'DeleteObject':
        return 'DELETE'
    }
  },

  getObjectRequestParameter(http) {
    if (http.key.pathParam) {
      return `method.request.path.${http.key.pathParam}`
    }

    if (http.key.queryStringParam) {
      return `method.request.querystring.${http.key.queryStringParam}`
    }

    return http.key
  },

  getRequestParameters(http) {
    switch (http.action) {
      case 'GetObject':
        return {}
      case 'PutObject':
        return {
          'integration.request.header.x-amz-acl': "'authenticated-read'",
          'integration.request.header.Content-Type': 'method.request.header.Content-Type'
        }
      case 'DeleteObject':
        return {}
    }
  },

  getResponseParameters(http) {
    switch (http.action) {
      case 'GetObject':
        return {
          'method.response.header.content-type': 'integration.response.header.content-type',
          'method.response.header.Content-Type': 'integration.response.header.Content-Type'
        }
      case 'PutObject':
        return {
          'method.response.header.Content-Type': 'integration.response.header.Content-Type',
          'method.response.header.Content-Length': 'integration.response.header.Content-Length'
        }
      case 'DeleteObject':
        return {
          'method.response.header.Content-Type': 'integration.response.header.Content-Type',
          'method.response.header.Date': 'integration.response.header.Date'
        }
    }
  },

  getS3MethodIntegration(http) {
    const bucket = http.bucket
    const httpMethod = this.getIntegrationHttpMethod(http)
    const objectRequestParam = this.getObjectRequestParameter(http)
    const requestParams = _.merge(this.getRequestParameters(http), {
      'integration.request.path.object': objectRequestParam,
      'integration.request.path.bucket': bucket
    })
    const responseParams = this.getResponseParameters(http)

    const integration = {
      IntegrationHttpMethod: httpMethod,
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn']
      },
      Uri: {
        'Fn::Sub': ['arn:aws:apigateway:${AWS::Region}:s3:path/{bucket}/{object}', {}]
      },
      PassthroughBehavior: 'NEVER',
      RequestParameters: requestParams
    }

    const integrationResponse = {
      IntegrationResponses: [
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
        },
        {
          StatusCode: 200,
          SelectionPattern: '200',
          ResponseParameters: responseParams,
          ResponseTemplates: {}
        }
      ]
    }

    if (http && http.cors) {
      let origin = http.cors.origin
      if (http.cors.origins && http.cors.origins.length) {
        origin = http.cors.origins.join(',')
      }

      const corsKey = 'method.response.header.Access-Control-Allow-Origin'
      integrationResponse.IntegrationResponses.forEach((val, i) => {
        integrationResponse.IntegrationResponses[i].ResponseParameters[corsKey] = `'${origin}'`
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