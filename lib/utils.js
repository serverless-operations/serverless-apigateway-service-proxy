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
  },
  shouldCreateDefaultRole(serviceName) {
    const proxies = this.getAllServiceProxies().filter(
      (serviceProxy) => this.getServiceName(serviceProxy) === serviceName
    )

    if (proxies.length <= 0) {
      return false
    }

    // if some proxies don't have a custom role defined we should create the default one
    const createDefaultRole = proxies.some((proxy) => !proxy[serviceName].roleArn)
    return createDefaultRole
  }
}
