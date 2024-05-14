'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const _ = require('lodash')
const {
  deployWithRandomStage,
  removeService,
  getDynamodbItemWithHashKeyAndRangeKey,
  putDynamodbItem,
  cleanUpDynamodbItems
} = require('../../../utils')

describe('Multiple Dynamodb Proxies Integration Test', () => {
  let endpoint
  let stage
  const tableName = 'MyMuTestTable'
  const hashKeyAttribute = 'id'
  const rangeKeyAttribute = 'sort'
  const hashKey = { S: 'myid' }
  const sortKey = { S: 'mykey' }
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
    await cleanUpDynamodbItems(tableName, hashKeyAttribute, rangeKeyAttribute)
  })

  it('should get correct response from dynamodb PutItem action endpoint', async () => {
    const putEndpoint = `${endpoint}/dynamodb/${hashKey.S}/${sortKey.S}`

    const putResponse = await fetch(putEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { S: 'test' } })
    })
    expect(putResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(putResponse.status).to.be.equal(200)

    const item = await getDynamodbItemWithHashKeyAndRangeKey(
      tableName,
      hashKeyAttribute,
      hashKey,
      rangeKeyAttribute,
      sortKey
    )
    expect(item).to.be.deep.equal({
      Item: {
        [hashKeyAttribute]: hashKey,
        [rangeKeyAttribute]: sortKey,
        message: { S: 'test' }
      }
    })
  })

  it('should get correct response from dynamodb GetItem action endpoint', async () => {
    await putDynamodbItem(
      tableName,
      _.merge(
        {},
        { [hashKeyAttribute]: hashKey, [rangeKeyAttribute]: sortKey },
        { message: { S: 'testtest' } }
      )
    )
    const getEndpoint = `${endpoint}/dynamodb?id=${hashKey.S}&sort=${sortKey.S}`

    const getResponse = await fetch(getEndpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(getResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(getResponse.status).to.be.equal(200)

    const item = await getResponse.json()
    expect(item).to.be.deep.equal({
      id: hashKey.S,
      sort: sortKey.S,
      message: 'testtest'
    })
  })

  it('should get correct response from dynamodb Query with index', async () => {
    await putDynamodbItem(
      tableName,
      _.merge(
        {},
        { [hashKeyAttribute]: hashKey, [rangeKeyAttribute]: sortKey },
        {
          message: { S: 'testtest' },
          indexRange: { S: 'rangeTest' },
          indexSort: { S: 'sortTest' }
        }
      )
    )
    const getEndpoint = `${endpoint}/dynamodb/index/rangeTest/sortTest`

    const getResponse = await fetch(getEndpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(getResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(getResponse.status).to.be.equal(200)

    const item = await getResponse.json()
    expect(item).to.be.deep.equal([
      {
        id: hashKey.S,
        sort: sortKey.S,
        message: 'testtest',
        indexRange: 'rangeTest',
        indexSort: 'sortTest'
      }
    ])
  })

  it('should get correct response from dynamodb DeleteItem action endpoint', async () => {
    await putDynamodbItem(
      tableName,
      _.merge(
        {},
        { [hashKeyAttribute]: hashKey, [rangeKeyAttribute]: sortKey },
        { message: { S: 'test' } }
      )
    )
    const deleteEndpoint = `${endpoint}/dynamodb/${hashKey.S}?sort=${sortKey.S}`

    const deleteResponse = await fetch(deleteEndpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(deleteResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(deleteResponse.status).to.be.equal(200)

    const item = await getDynamodbItemWithHashKeyAndRangeKey(
      tableName,
      hashKeyAttribute,
      hashKey,
      rangeKeyAttribute,
      sortKey
    )
    expect(item).to.be.empty
  })
})
