'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Single EventBridge Proxy Integration Test', () => {
  let endpoint
  let stage
  const config = '__tests__/integration/eventbridge/single-integration/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)
    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from eventbridge proxy endpoint', async () => {
    const testEndpoint = `${endpoint}/eventbridge`

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'some data' })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('Entries')
    expect(body).to.have.own.property('FailedEntryCount')
    expect(body.FailedEntryCount).to.equal(0)
  })
})
