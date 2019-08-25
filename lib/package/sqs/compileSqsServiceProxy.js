'use strict'
module.exports = {
  async compileSqsServiceProxy() {
    this.compileIamRoleToSqs()
    this.compileMethodsToSqs()
  }
}
