'use strict'
module.exports = {
  async compileSnsServiceProxy() {
    this.compileIamRoleToSns()
    this.compileMethodsToSns()
  }
}
