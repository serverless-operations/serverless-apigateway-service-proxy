'use strict'
module.exports = {
  async compileKinesisServiceProxy() {
    await this.validateKinesisServiceProxy()
    await this.compileIamRoleToKinesis()
    await this.compileMethodsToKinesis()
  }
}
