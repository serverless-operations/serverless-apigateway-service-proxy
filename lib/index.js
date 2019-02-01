'use strict'
const chalk = require('chalk')
const BbPromise = require('bluebird')
const _ = require('lodash')

const utils = require('./utils')
const validate = require('./apiGateway/validate')
const compileRestApi = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/restApi')
const compileResources = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/resources')
const compileDeployment = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/deployment')
const getStackInfo = require('serverless/lib/plugins/aws/info/getStackInfo')
const compileKinesisMethods = require('./package/kinesis/methods')
const compileToKinesisIamRole = require('./package/kinesis/compileToKinesisIamRole')

class ServerlessApigatewayServiceProxy {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}
    this.provider = this.serverless.getProvider('aws')
    this.service = this.serverless.service.service
    this.region = this.provider.getRegion()
    this.stage = this.provider.getStage()
    Object.assign(
      this,
      compileRestApi,
      compileResources,
      compileKinesisMethods,
      compileToKinesisIamRole,
      compileDeployment,
      getStackInfo,
      validate,
      utils
    )

    this.hooks = {
      'package:compileEvents': async () => {
        if (this.getAllServiceProxies().length > 0) {
          this.validated = await this.serviceProxyValidate()
          await this.compileRestApi()
          await this.compileResources()
          if (await this.existsDeployment()) {
            await this.compileDeployment()
          }
          await this.compileKinesisMethods()
          await this.compileToKinesisIamRole()
        }
      },
      'after:deploy:deploy': async () => {
        if (this.getAllServiceProxies().length > 0) {
          await this.getStackInfo()
          await this.display()
        }
      }
    }
  }

  async existsDeployment() {
    let exists = true
    Object.keys(this.serverless.service.provider.compiledCloudFormationTemplate.Resources).forEach(
      async (resource) => {
        if (
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'Type'
          ] == 'AWS::ApiGateway::Deployment'
        ) {
          exists = false
        }
      }
    )
    return exists
  }

  async display() {
    let message = ''
    let serviceProxyMessages = ''

    const endpointInfo = this.gatheredData.info.endpoint
    message += `${chalk.yellow.underline('Serverless Apigateway Service proxy OutPuts')}\n`
    message += `${chalk.yellow('endpoints:')}`

    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        Object.keys(serviceProxy).forEach(async (serviceName) => {
          let path
          const method = serviceProxy[serviceName].method.toUpperCase()
          path = serviceProxy[serviceName].path
          path =
            path !== '/'
              ? `/${path
                  .split('/')
                  .filter((p) => p !== '')
                  .join('/')}`
              : ''
          serviceProxyMessages += `\n  ${method} - ${endpointInfo}${path}`
        })
      })
    )

    if (_.isEmpty(serviceProxyMessages)) {
      return ''
    }

    message += serviceProxyMessages
    message += '\n'

    this.serverless.cli.consoleLog(message)

    return message
  }
}

module.exports = ServerlessApigatewayServiceProxy
