'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Multiple Kinesis Proxy Integrations Test', () => {
  let endpoint
  let stage
  const config = '__tests__/integration/kinesis/multiple-integrations/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)
    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from kinesis proxy endpoints with default partitionkey', async () => {
    const stream = 'kinesis1'
    const testEndpoint = `${endpoint}/${stream}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for stream ${stream}` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })

  it('should get correct response from kinesis proxy endpoints with hardcorded partitionkey', async () => {
    const stream = 'kinesis2'
    const testEndpoint = `${endpoint}/${stream}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for stream ${stream}` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })

  it('should get correct response from kinesis proxy endpoints with pathparam partitionkey', async () => {
    const stream = 'kinesis3'
    const partitionkey = 'partitionkey'
    const testEndpoint = `${endpoint}/${stream}/${partitionkey}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for stream ${stream}` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })

  it('should get correct response from kinesis proxy endpoints with bodyparam partitionkey', async () => {
    const stream = 'kinesis4'
    const partitionkey = 'partitionkey'
    const testEndpoint = `${endpoint}/${stream}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for stream ${stream}`, data: { myKey: partitionkey } })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })

  it('should get correct response from kinesis proxy endpoints with queryStringParam partitionkey', async () => {
    const stream = 'kinesis5'
    const partitionkey = 'partitionkey'
    const testEndpoint = `${endpoint}/${stream}?myKey=${partitionkey}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for stream ${stream}`, data: { mykey: partitionkey } })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })

  it('should get correct response from kinesis proxy endpoints with action "PutRecord" with default partitionkey', async () => {
    const stream = 'kinesis6'
    const testEndpoint = `${endpoint}/${stream}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `data for stream ${stream}` })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('ShardId')
    expect(body).to.have.own.property('SequenceNumber')
  })

  it('should get correct response from kinesis proxy endpoints with action "PutRecords" with default partitionkey', async () => {
    const stream = 'kinesis7'
    const testEndpoint = `${endpoint}/${stream}`
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [
          { data: 'some data', 'partition-key': 'some key' },
          { data: 'some other data', 'partition-key': 'some key' }
        ]
      })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body).to.have.own.property('FailedRecordCount')
    expect(body).to.have.own.property('Records')
    expect(body.Records.length).to.be.equal(2)
    expect(body.Records[0]).to.have.own.property('ShardId')
    expect(body.Records[0]).to.have.own.property('SequenceNumber')
    expect(body.Records[1]).to.have.own.property('ShardId')
    expect(body.Records[1]).to.have.own.property('SequenceNumber')
  })
})
