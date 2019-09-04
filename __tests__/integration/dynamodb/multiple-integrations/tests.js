'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const _ = require('lodash')
const {
  deployWithRandomStage,
  removeService,
  getDynamodbItem,
  putDynamodbItem,
  cleanUpDynamodbItems
} = require('../../../utils')

describe('Multiple Dynamodb Proxies Integration Test', () => {
  let endpoint
  let stage
  const tableName = 'MyMuTestTable'
  const hashKeyAttribute = 'id'
  const hashKey = { S: 'myid' }
  const config = '__tests__/integration/dynamodb/multiple-integrations/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)

    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(async () => {
    removeService(stage, config)
  })

  afterEach(async () => {
    await cleanUpDynamodbItems(tableName, hashKeyAttribute)
  })

  it('should get correct response from dynamodb PutItem action endpoint', async () => {
    const putEndpoint = `${endpoint}/dynamodb/${hashKey.S}`

    const putResponse = await fetch(putEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { S: 'test' } })
    })
    expect(putResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(putResponse.status).to.be.equal(200)

    const item = await getDynamodbItem(tableName, hashKeyAttribute, hashKey)
    expect(item).to.be.deep.equal({
      Item: {
        [hashKeyAttribute]: hashKey,
        message: { S: 'test' }
      }
    })
  })

  it('should get correct response from dynamodb GetItem action endpoint', async () => {
    await putDynamodbItem(
      tableName,
      _.merge({}, { [hashKeyAttribute]: hashKey }, { message: { S: 'testtest' } })
    )
    const getEndpoint = `${endpoint}/dynamodb?id=${hashKey.S}`

    const getResponse = await fetch(getEndpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(getResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(getResponse.status).to.be.equal(200)

    const item = await getResponse.json()
    expect(item).to.be.deep.equal({
      id: hashKey.S,
      message: 'testtest'
    })
  })

  it('should get correct response from dynamodb UpdateItem action endpoint', async () => {
    await putDynamodbItem(
      tableName,
      _.merge({}, { [hashKeyAttribute]: hashKey }, { message: { S: 'testtesttest' } })
    )
    const updateEndpoint = `${endpoint}/dynamodb/${hashKey.S}`

    const updateResponse1 = await fetch(updateEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        UpdateExpression: 'ADD QuantityOnHand :q',
        ExpressionAttributeValues: { ':q': { N: '5' } }
      })
    })
    expect(updateResponse1.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(updateResponse1.status).to.be.equal(200)

    const item1 = await getDynamodbItem(tableName, hashKeyAttribute, hashKey)
    expect(item1).to.be.deep.equal({
      Item: {
        [hashKeyAttribute]: hashKey,
        QuantityOnHand: { N: '5' },
        message: { S: 'testtesttest' }
      }
    })

    const updateResponse2 = await fetch(updateEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        UpdateExpression: 'SET #n = :newName',
        ExpressionAttributeValues: { ':newName': { S: 'myname' } },
        ExpressionAttributeNames: {
          '#n': 'name'
        }
      })
    })
    expect(updateResponse2.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(updateResponse2.status).to.be.equal(200)
    const item2 = await getDynamodbItem(tableName, hashKeyAttribute, hashKey)
    expect(item2).to.be.deep.equal({
      Item: {
        [hashKeyAttribute]: hashKey,
        QuantityOnHand: { N: '5' },
        name: { S: 'myname' },
        message: { S: 'testtesttest' }
      }
    })
  })

  it('should get correct response from dynamodb DeleteItem action endpoint', async () => {
    await putDynamodbItem(
      tableName,
      _.merge({}, { [hashKeyAttribute]: hashKey }, { message: { S: 'test' } })
    )
    const deleteEndpoint = `${endpoint}/dynamodb/${hashKey.S}`

    const deleteResponse = await fetch(deleteEndpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(deleteResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(deleteResponse.status).to.be.equal(200)

    const item = await getDynamodbItem(tableName, hashKeyAttribute, hashKey)
    expect(item).to.be.empty
  })
})
