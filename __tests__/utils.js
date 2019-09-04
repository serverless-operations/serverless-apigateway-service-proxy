'use strict'

const _ = require('lodash')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const aws = require('aws-sdk')
const s3 = new aws.S3()

const region = 'us-east-1'
const dynamodb = new aws.DynamoDB({ region })
const cloudformation = new aws.CloudFormation({ region })

function getApiGatewayEndpoint(outputs) {
  return outputs.ServiceEndpoint.match(/https:\/\/.+\.execute-api\..+\.amazonaws\.com.+/)[0]
}

async function getStackOutputs(stackName) {
  const result = await cloudformation.describeStacks({ StackName: stackName }).promise()
  const stack = result.Stacks[0]

  const keys = stack.Outputs.map((x) => x.OutputKey)
  const values = stack.Outputs.map((x) => x.OutputValue)

  return _.zipObject(keys, values)
}

async function getDynamodbItem(tableName, hashKeyAttribute, hashKey) {
  return await dynamodb
    .getItem({
      Key: {
        [hashKeyAttribute]: hashKey
      },
      TableName: tableName
    })
    .promise()
}

async function putDynamodbItem(tableName, item) {
  await dynamodb
    .putItem({
      Item: item,
      TableName: tableName
    })
    .promise()
}

async function cleanUpDynamodbItems(tableName, hashKeyAttribute) {
  const items = await dynamodb.scan({ TableName: tableName }).promise()
  if (items.Count > 0) {
    await Promise.all(
      items.Items.map(async (item) => {
        await dynamodb
          .deleteItem({
            Key: {
              [hashKeyAttribute]: item[hashKeyAttribute]
            },
            TableName: tableName
          })
          .promise()
      })
    )
  }
}

async function getS3Object(bucket, key) {
  const resp = await s3
    .getObject({
      Bucket: bucket,
      Key: key
    })
    .promise()

  return resp.Body
}

async function deleteS3Object(bucket, key) {
  await s3
    .deleteObject({
      Bucket: bucket,
      Key: key
    })
    .promise()
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
  const outputs = await getStackOutputs(stackName)
  const endpoint = getApiGatewayEndpoint(outputs)

  return { stackName, stage, outputs, endpoint, region }
}

module.exports = {
  deployService,
  removeService,
  deployWithRandomStage,
  getS3Object,
  deleteS3Object,
  getDynamodbItem,
  putDynamodbItem,
  cleanUpDynamodbItems
}
