'use strict'

module.exports = {
  compileS3ServiceProxy() {
    this.compileIamRoleToS3()
    this.compileMethodsToS3()
  }
}
