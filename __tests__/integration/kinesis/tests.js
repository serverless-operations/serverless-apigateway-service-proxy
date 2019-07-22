'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const { deployService, removeService, getApiGatewayEndpoint } = require('./../../utils')

describe('Kinesis Proxy Integration Test', () => {
  let endpoint
  let stackName
  let stage
  const config = '__tests__/integration/kinesis/service/serverless.yml'

  beforeAll(async () => {
    stage = Math.random()
      .toString(32)
      .substring(2)
    stackName = 'kinesis-proxy-' + stage
    deployService(stage, config)
    endpoint = await getApiGatewayEndpoint(stackName)
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from kinesis proxy endpoint', async () => {
    const testEndpoint = `${endpoint}/kinesis`

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Data: 'some data', PartitionKey: 'some key' })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })
})
