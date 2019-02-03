'use strict'

module.exports = {
  async getMethodResponses(http) {
    const methodResponse = {
      Properties: {
        MethodResponses: [
          {
            ResponseParameters: {},
            ResponseModels: {},
            StatusCode: 200
          },
          {
            ResponseParameters: {},
            ResponseModels: {},
            StatusCode: 400
          }
        ]
      }
    }

    if (http && http.cors) {
      let origin = http.cors.origin
      if (http.cors.origins && http.cors.origins.length) {
        origin = http.cors.origins.join(',')
      }

      methodResponse.Properties.MethodResponses.forEach(async (val, i) => {
        methodResponse.Properties.MethodResponses[i].ResponseParameters = {
          'method.response.header.Access-Control-Allow-Origin': `'${origin}'`
        }
      })
    }

    return methodResponse
  }
}
