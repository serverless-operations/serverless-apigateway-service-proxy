'use strict'

const _ = require('lodash')
const execSync = require('child_process').execSync
const aws = require('aws-sdk')
const cloudformation = new aws.CloudFormation({ region: 'us-east-1' })

module.exports = {
  async getApiGatewayEndpoint(stackName) {
    const result = await cloudformation.describeStacks({ StackName: stackName }).promise()

    const endpointOutput = _.find(result.Stacks[0].Outputs, { OutputKey: 'ServiceEndpoint' })
      .OutputValue
    return endpointOutput.match(/https:\/\/.+\.execute-api\..+\.amazonaws\.com.+/)[0]
  },

  deployService(stage, config) {
    execSync(`npx serverless deploy --stage ${stage} --config ${config}`, {
      stdio: 'inherit'
    })
  },

  removeService(stage, config) {
    execSync(`npx serverless remove --stage ${stage} --config ${config}`, { stdio: 'inherit' })
  }
}
