'use strict'
module.exports = {
  compileKinesisServiceProxy() {
    this.compileIamRoleToKinesis()
    this.compileMethodsToKinesis()
  }
}
