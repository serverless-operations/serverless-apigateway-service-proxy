'use strict'
const chalk = require('chalk')
const BbPromise = require('bluebird')
const _ = require('lodash')

const utils = require('./utils')
const validate = require('./apiGateway/validate')
const methods = require('./apiGateway/methods')
const compileRestApi = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/restApi')
const compileResources = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/resources')
const compileCors = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/cors')
const compileDeployment = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/deployment')
const getStackInfo = require('serverless/lib/plugins/aws/info/getStackInfo')
// Kinesis
const compileMethodsToKinesis = require('./package/kinesis/compileMethodsToKinesis')
const compileIamRoleToKinesis = require('./package/kinesis/compileIamRoleToKinesis')
const compileKinesisServiceProxy = require('./package/kinesis/compileKinesisServiceProxy')
// SQS
const compileMethodsToSqs = require('./package/sqs/compileMethodsToSqs')
const compileIamRoleToSqs = require('./package/sqs/compileIamRoleToSqs')
const validateSqsServiceProxy = require('./package/sqs/validateSqsServiceProxy')
const compileSqsServiceProxy = require('./package/sqs/compileSqsServiceProxy')
// S3
const compileMethodsToS3 = require('./package/s3/compileMethodsToS3')
const compileIamRoleToS3 = require('./package/s3/compileIamRoleToS3')
const compileS3ServiceProxy = require('./package/s3/compileS3ServiceProxy')
// SNS
const compileMethodsToSns = require('./package/sns/compileMethodsToSns')
const compileIamRoleToSns = require('./package/sns/compileIamRoleToSns')
const validateSnsServiceProxy = require('./package/sns/validateSnsServiceProxy')
const compileSnsServiceProxy = require('./package/sns/compileSnsServiceProxy')

class ServerlessApigatewayServiceProxy {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}
    this.provider = this.serverless.getProvider('aws')
    this.service = this.serverless.service.service
    this.region = this.provider.getRegion()
    this.stage = this.provider.getStage()
    this.apiGatewayMethodLogicalIds = []
    Object.assign(
      this,
      compileRestApi,
      compileResources,
      compileMethodsToKinesis,
      compileIamRoleToKinesis,
      compileCors,
      compileDeployment,
      compileKinesisServiceProxy,
      compileMethodsToSqs,
      compileIamRoleToSqs,
      compileSqsServiceProxy,
      validateSqsServiceProxy,
      compileMethodsToS3,
      compileIamRoleToS3,
      compileS3ServiceProxy,
      compileMethodsToSns,
      compileIamRoleToSns,
      validateSnsServiceProxy,
      compileSnsServiceProxy,
      getStackInfo,
      validate,
      methods,
      utils
    )

    this.hooks = {
      'package:compileEvents': async () => {
        if (this.getAllServiceProxies().length > 0) {
          this.validated = await this.validateServiceProxies()

          await this.compileRestApi()
          await this.compileResources()
          await this.compileCors()

          //Kinesis proxy
          await this.compileKinesisServiceProxy()

          // SQS getProxy
          await this.compileSqsServiceProxy()

          // S3 getProxy
          await this.compileS3ServiceProxy()

          // SNS getProxy
          await this.compileSnsServiceProxy()

          await this.mergeDeployment()
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

  async mergeDeployment() {
    let exists = false
    Object.keys(this.serverless.service.provider.compiledCloudFormationTemplate.Resources).forEach(
      async (resource) => {
        if (
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'Type'
          ] === 'AWS::ApiGateway::Deployment'
        ) {
          exists = true
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'DependsOn'
          ] = this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'DependsOn'
          ].concat(this.apiGatewayMethodLogicalIds)
        }
      }
    )

    if (!exists) {
      await this.compileDeployment()
    }
  }

  async display() {
    let message = ''
    let serviceProxyMessages = ''

    const endpointInfo = this.gatheredData.info.endpoints
    message += `${chalk.yellow.underline('Serverless APIGateway Service Proxy OutPuts')}\n`
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
