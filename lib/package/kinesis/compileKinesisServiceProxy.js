'use strict'
module.exports = {
  async compileKinesisServiceProxy() {
    this.compileIamRoleToKinesis()
    this.compileMethodsToKinesis()
  }
}
