'use strict'

module.exports = {
  getAllServiceProxies() {
    if (this.serverless.service.custom && this.serverless.service.custom.apiGatewayServiceProxy) {
      return this.serverless.service.custom.apiGatewayServiceProxy
    }
    return []
  }
}
