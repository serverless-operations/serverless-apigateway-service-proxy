'use strict'

module.exports = {
  async compileDynamodbServiceProxy() {
    this.compileIamRoleToDynamodb()
    this.compileMethodsToDynamodb()
  }
}
