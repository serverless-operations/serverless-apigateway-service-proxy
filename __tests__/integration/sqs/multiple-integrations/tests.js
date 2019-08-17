'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Multiple SQS Proxy Integrations Test', () => {
  let endpoint
  let stage
  const config = '__tests__/integration/sqs/multiple-integrations/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)
    stage = result.stage
    endpoint = result.endpoint
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should get correct response from multiple sqs proxy endpoints', async () => {
    const queues = ['sqs1', 'sqs2', 'sqs3']

    for (const queue of queues) {
      const testEndpoint = `${endpoint}/${queue}`
      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `message for ${queue}` })
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
    }
  })
})
