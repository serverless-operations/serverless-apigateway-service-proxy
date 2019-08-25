'use strict'
module.exports = {
  compileSnsServiceProxy() {
    this.compileIamRoleToSns()
    this.compileMethodsToSns()
  }
}
