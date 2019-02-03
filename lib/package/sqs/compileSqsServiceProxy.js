'use strict'
module.exports = {
  async compileSqsServiceProxy() {
    //await this.validateKinesisServiceProxy()
    await this.compileIamRoleToSqs()
    await this.compileMethodsToSqs()
  }
}
