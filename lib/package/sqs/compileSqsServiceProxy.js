'use strict'
module.exports = {
  async compileSqsServiceProxy() {
    await this.validateSqsServiceProxy()
    await this.compileIamRoleToSqs()
    await this.compileMethodsToSqs()
  }
}
