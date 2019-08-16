'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Single SQS Proxy Integration Test', () => {
  let endpoint
  let stage
  const config = '__tests__/integration/sqs/single-integration/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)

    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from sqs proxy endpoint', async () => {
    const testEndpoint = `${endpoint}/sqs`

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'testtest' })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)
    const body = await response.json()
    expect(body.SendMessageResponse.SendMessageResult).to.have.own.property(
      'MD5OfMessageAttributes'
    )
    expect(body.SendMessageResponse.SendMessageResult).to.have.own.property('MD5OfMessageBody')
    expect(body.SendMessageResponse.SendMessageResult).to.have.own.property('MessageId')
    expect(body.SendMessageResponse.SendMessageResult).to.have.own.property('SequenceNumber')
    expect(body.SendMessageResponse.ResponseMetadata).to.have.own.property('RequestId')
  })
})
