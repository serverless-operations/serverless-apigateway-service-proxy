'use strict'
module.exports = {
  async compileSnsServiceProxy() {
    this.validateSnsServiceProxy()
    this.compileIamRoleToSns()
    this.compileMethodsToSns()
  }
}
