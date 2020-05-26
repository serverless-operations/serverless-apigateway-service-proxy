'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Multiple EventBridge Proxy Integrations Test', () => {
  let endpoint
  let stage
  const config = '__tests__/integration/eventbridge/multiple-integrations/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)
    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from eventbridge proxy endpoints with static detailType and source', async () => {
    const testEndpoint = `${endpoint}/eventbridge1`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for event bus` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('Entries')
    expect(body).to.have.own.property('FailedEntryCount')
    expect(body.FailedEntryCount).to.equal(0)
  })

  it('should get correct response from eventbridge proxy endpoints with detailType and source as path parameters', async () => {
    const testEndpoint = `${endpoint}/eventbridge2/myDetailType/mySource`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for event bus` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('Entries')
    expect(body).to.have.own.property('FailedEntryCount')
    expect(body.FailedEntryCount).to.equal(0)
  })

  it('should get correct response from eventbridge proxy endpoints with detailType and source as query parameters', async () => {
    const testEndpoint = `${endpoint}/eventbridge3?myDetailTypeKey=myDetailTypeValue&mySourceKey=mySourceValue`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for event bus` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('Entries')
    expect(body).to.have.own.property('FailedEntryCount')
    expect(body.FailedEntryCount).to.equal(0)
  })

  it('should get correct response from eventbridge proxy endpoints without given detailType and source parameters', async () => {
    const testEndpoint = `${endpoint}/eventbridge4`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for event bus` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('Entries')
    expect(body).to.have.own.property('FailedEntryCount')
    expect(body.FailedEntryCount).to.equal(0)
  })

  it('should get correct response from eventbridge proxy endpoints with bodyParams', async () => {
    const testEndpoint = `${endpoint}/eventbridge5`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          detail: `{"data": "data for event bus"}`,
          detailType: `myDetailType`,
          source: `mySource`
        }
      })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('Entries')
    expect(body).to.have.own.property('FailedEntryCount')
    expect(body.FailedEntryCount).to.equal(0)
  })
})
