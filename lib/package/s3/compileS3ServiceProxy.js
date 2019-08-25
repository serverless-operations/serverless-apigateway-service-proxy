'use strict'

module.exports = {
  async compileS3ServiceProxy() {
    this.compileIamRoleToS3()
    this.compileMethodsToS3()
  }
}
