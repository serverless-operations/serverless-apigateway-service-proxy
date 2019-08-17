'use strict'

module.exports = {
  async compileS3ServiceProxy() {
    this.validateS3ServiceProxy()
    this.compileIamRoleToS3()
    this.compileMethodsToS3()
  }
}
