'use strict'

const { default: awsTesting } = require('aws-testing-library/lib/chai')
const chai = require('chai')
chai.use(awsTesting)
const { expect } = chai

const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Single SNS Proxy Integration Test', () => {
  let endpoint
  let stage
  let region
  let queueUrl
  const config = '__tests__/integration/sns/single-integration/service/serverless.yml'

  beforeAll(async () => {
    ;({
      stage,
      region,
      endpoint,
      outputs: { SqsQueueUrl: queueUrl }
    } = await deployWithRandomStage(config))
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from sqs proxy endpoint', async () => {
    const testEndpoint = `${endpoint}/sns`

    const body = JSON.stringify({ message: 'testtest' })
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })

    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const json = await response.json()

    expect(json).to.have.own.property('PublishResponse')

    expect(json.PublishResponse).to.have.own.property('PublishResult')
    expect(json.PublishResponse).to.have.own.property('ResponseMetadata')

    expect(json.PublishResponse.PublishResult).to.have.own.property('MessageId')
    expect(json.PublishResponse.PublishResult).to.have.own.property('SequenceNumber')

    expect(json.PublishResponse.ResponseMetadata).to.have.own.property('RequestId')

    await expect({
      region,
      queueUrl,
      timeout: 10000,
      pollEvery: 2500
    }).to.have.message((message) => message.Message === body)
  })
})
