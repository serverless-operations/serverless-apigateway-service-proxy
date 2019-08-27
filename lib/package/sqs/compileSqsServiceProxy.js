'use strict'
module.exports = {
  compileSqsServiceProxy() {
    this.compileIamRoleToSqs()
    this.compileMethodsToSqs()
  }
}
