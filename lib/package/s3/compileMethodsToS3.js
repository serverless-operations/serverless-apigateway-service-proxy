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
          this.getS3MethodIntegration(event.http),
          this.getMethodResponses(event.http)
        )

        // ensure every integration request and response param mapping is
        // also configured in the method request and response param mappings
        Object.values(template.Properties.Integration.RequestParameters)
          .filter((x) => typeof x === 'string' && x.startsWith('method.'))
          .forEach((x) => {
            template.Properties.RequestParameters[x] = true
          })

        template.Properties.Integration.IntegrationResponses.forEach((resp) => {
          Object.keys(resp.ResponseParameters)
            .filter((x) => x.startsWith('method.'))
            .forEach((x) => {
              const methodResp = template.Properties.MethodResponses.find(
                (y) => y.StatusCode === resp.StatusCode
              )
              methodResp.ResponseParameters[x] = true
            })
        })

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

    return `'${http.key}'`
  },

  getIntegrationRequestParameters(http) {
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

  getIntegrationResponseParameters(http) {
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

    let requestParams = _.merge(this.getIntegrationRequestParameters(http), {
      'integration.request.path.bucket': {
        'Fn::Sub': ["'${bucket}'", { bucket }]
      }
    })

    if (_.has(http, 'key')) {
      const objectRequestParam = this.getObjectRequestParameter(http)
      requestParams = _.merge(requestParams, {
        'integration.request.path.object': objectRequestParam
      })
    }

    const responseParams = this.getIntegrationResponseParameters(http)

    const roleArn = http.roleArn || {
      'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn']
    }

    const integration = {
      IntegrationHttpMethod: httpMethod,
      Type: 'AWS',
      Credentials: roleArn,
      Uri: {
        'Fn::Sub': ['arn:aws:apigateway:${AWS::Region}:s3:path/{bucket}/{object}', {}]
      },
      PassthroughBehavior: 'WHEN_NO_MATCH',
      RequestParameters: _.merge(requestParams, http.requestParameters)
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
          SelectionPattern: '2\\d{2}',
          ResponseParameters: responseParams,
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
