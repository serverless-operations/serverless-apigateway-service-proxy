'use strict'

module.exports = {
  getMethodResponses(http) {
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
          },
          {
            ResponseParameters: {},
            ResponseModels: {},
            StatusCode: 500
          }
        ]
      }
    }

    if (http && http.partialContent) {
      methodResponse.Properties.MethodResponses.push({
        ResponseParameters: {},
        ResponseModels: {},
        StatusCode: 206
      })
    }

    if (http && http.cors) {
      methodResponse.Properties.MethodResponses.forEach((val, i) => {
        methodResponse.Properties.MethodResponses[i].ResponseParameters = {
          'method.response.header.Access-Control-Allow-Origin': true
        }
      })
    }

    return methodResponse
  }
}
