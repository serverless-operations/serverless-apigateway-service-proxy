'use strict'

const _ = require('lodash')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const aws = require('aws-sdk')
const cloudformation = new aws.CloudFormation({ region: 'us-east-1' })

async function getApiGatewayEndpoint(stackName) {
  const result = await cloudformation.describeStacks({ StackName: stackName }).promise()

  const endpointOutput = _.find(result.Stacks[0].Outputs, { OutputKey: 'ServiceEndpoint' })
    .OutputValue
  return endpointOutput.match(/https:\/\/.+\.execute-api\..+\.amazonaws\.com.+/)[0]
}

function deployService(stage, config) {
  execSync(`npx serverless deploy --stage ${stage} --config ${path.basename(config)}`, {
    stdio: 'inherit',
    cwd: path.dirname(config)
  })
}

function removeService(stage, config) {
  execSync(`npx serverless remove --stage ${stage} --config ${path.basename(config)}`, {
    stdio: 'inherit',
    cwd: path.dirname(config)
  })
}

async function deployWithRandomStage(config) {
  const serviceName = yaml.safeLoad(fs.readFileSync(config)).service
  const stage = Math.random()
    .toString(32)
    .substring(2)
  const stackName = `${serviceName}-${stage}`
  deployService(stage, config)
  const endpoint = await getApiGatewayEndpoint(stackName)

  return { stage, endpoint }
}

module.exports = {
  getApiGatewayEndpoint,
  deployService,
  removeService,
  deployWithRandomStage
}
