'use strict'
const NOT_FOUND = -1
const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async validateServiceProxies() {
    const events = []
    const corsPreflight = {}
    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        const serviceName = this.getServiceName(serviceProxy)
        await this.checkAllowedService(serviceName)
        const http = serviceProxy[serviceName]
        http.path = await this.getProxyPath(serviceProxy[serviceName], serviceName)
        http.method = await this.getProxyMethod(serviceProxy[serviceName], serviceName)

        if (serviceProxy[serviceName].cors) {
          http.cors = await this.getCors(serviceProxy[serviceName])

          const cors = corsPreflight[http.path] || {}

          cors.headers = _.union(http.cors.headers, cors.headers)
          cors.methods = _.union(http.cors.methods, cors.methods)
          cors.origins = _.union(http.cors.origins, cors.origins)
          cors.origin = http.cors.origin || '*'
          cors.allowCredentials = cors.allowCredentials || http.cors.allowCredentials

          // when merging, last one defined wins
          if (_.has(http.cors, 'maxAge')) {
            cors.maxAge = http.cors.maxAge
          }

          if (_.has(http.cors, 'cacheControl')) {
            cors.cacheControl = http.cors.cacheControl
          }

          corsPreflight[http.path] = cors
        }

        events.push({ serviceName, http })
      })
    )
    return {
      events,
      corsPreflight
    }
  },

  async checkAllowedService(serviceName) {
    const allowedProxies = ['kinesis', 'sqs']
    if (allowedProxies.indexOf(serviceName) === NOT_FOUND) {
      const errorMessage = [
        `Invalid APIG proxy "${serviceName}".`,
        ` This plugin supported Proxies are: ${allowedProxies.join(', ')}.`
      ].join('')
      return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
    }
  },

  async getProxyPath(proxy, serviceName) {
    if (proxy.path && typeof proxy.path === 'string') {
      return proxy.path.replace(/^\//, '').replace(/\/$/, '')
    }

    return BbPromise.reject(
      new this.serverless.classes.Error(
        `Missing or invalid "path" property in ${serviceName} proxy`
      )
    )
  },

  async getProxyMethod(proxy, serviceName) {
    if (proxy.method && typeof proxy.method === 'string') {
      const method = proxy.method.toLowerCase()

      const allowedMethods = ['get', 'post', 'put', 'patch', 'options', 'head', 'delete', 'any']
      if (allowedMethods.indexOf(method) === NOT_FOUND) {
        const errorMessage = [
          `Invalid APIG method "${proxy.method}" in AWS service proxy.`,
          ` AWS supported methods are: ${allowedMethods.join(', ')}.`
        ].join('')
        return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
      }
      return method
    }
    return BbPromise.reject(
      new this.serverless.classes.Error(
        `Missing or invalid "method" property in ${serviceName} proxy`
      )
    )
  },

  async getCors(proxy) {
    const headers = [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent'
    ]

    let cors = {
      origins: ['*'],
      origin: '*',
      methods: ['OPTIONS'],
      headers,
      allowCredentials: false
    }

    if (typeof proxy.cors === 'object') {
      cors = proxy.cors
      cors.methods = cors.methods || []
      cors.allowCredentials = Boolean(cors.allowCredentials)

      if (cors.origins && cors.origin) {
        const errorMessage = [
          'You can only use "origin" or "origins",',
          ' but not both at the same time to configure CORS.',
          ' Please check the docs for more info.'
        ].join('')
        return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
      }

      if (cors.headers) {
        if (!Array.isArray(cors.headers)) {
          const errorMessage = [
            'CORS header values must be provided as an array.',
            ' Please check the docs for more info.'
          ].join('')
          return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
        }
      } else {
        cors.headers = headers
      }

      if (cors.methods.indexOf('OPTIONS') === NOT_FOUND) {
        cors.methods.push('OPTIONS')
      }

      if (cors.methods.indexOf(proxy.method.toUpperCase()) === NOT_FOUND) {
        cors.methods.push(proxy.method.toUpperCase())
      }

      if (_.has(cors, 'maxAge')) {
        if (!_.isInteger(cors.maxAge) || cors.maxAge < 1) {
          const errorMessage = 'maxAge should be an integer over 0'
          return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
        }
      }
    } else {
      cors.methods.push(proxy.method.toUpperCase())
    }

    return cors
  }
}
