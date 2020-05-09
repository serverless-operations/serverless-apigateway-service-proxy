'use strict'
module.exports = {
  compileEventBridgeServiceProxy() {
    this.compileIamRoleToEventBridge()
    this.compileMethodsToEventBridge()
  }
}
