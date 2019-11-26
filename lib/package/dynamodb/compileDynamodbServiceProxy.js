'use strict'

module.exports = {
  async compileDynamodbServiceProxy() {
    this.compileMethodsToDynamodb()
    this.compileIamRoleToDynamodb()
  }
}
