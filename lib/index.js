'use strict'
const utils = require('./utils')
const compileKinesisProxy = require('./package/kinesis/compileKinesisProxy')

class ServerlessApigatewayServiceProxy {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}
    this.provider = this.serverless.getProvider('aws')
    this.service = this.serverless.service.service
    this.region = this.provider.getRegion()
    this.stage = this.provider.getStage()
    Object.assign(this, compileKinesisProxy, utils)

    this.hooks = {
      'package:compileEvents': async () => {
        await this.compileKinesisProxy()
      }
    }
  }
}

module.exports = ServerlessApigatewayServiceProxy
