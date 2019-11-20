'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const {
  deployWithRandomStage,
  removeService,
  getDynamodbItemWithHashKey
} = require('../../../utils')

describe('Single dynamodb Proxy Integration Test', () => {
  let endpoint
  let stage
  const tableName = 'MyTestTable'
  const hashKeyAttribute = 'id'
  const config = '__tests__/integration/dynamodb/single-integration/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)

    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(async () => {
    removeService(stage, config)
  })

  it('should get correct response from dynamodb proxy endpoint', async () => {
    const testEndpoint = `${endpoint}/dynamodb/id`

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item1: { S: 'item1' }, item2: { S: 'item2' } })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)

    const item = await getDynamodbItemWithHashKey(tableName, hashKeyAttribute, { S: 'id' })
    expect(item).to.be.deep.equal({
      Item: {
        id: { S: 'id' },
        item1: { S: 'item1' },
        item2: { S: 'item2' }
      }
    })
  })
})
