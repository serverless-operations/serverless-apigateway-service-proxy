'use strict'

module.exports = {
  getAllServiceProxies() {
    if (this.serverless.service.custom && this.serverless.service.custom.apiGatewayServiceProxies) {
      return this.serverless.service.custom.apiGatewayServiceProxies
    }
    return []
  },
  getServiceName(serviceProxy) {
    return Object.keys(serviceProxy)[0]
  },
  addCors(http, integrationResponse) {
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
  }
}
