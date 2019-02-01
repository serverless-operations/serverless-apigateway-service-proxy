'use strict'
const BbPromise = require('bluebird')

module.exports = {
  async compileKinesisProxy() {
    await BbPromise.all(this.getAllServiceProxies().map(async () => {}))
  }
}
