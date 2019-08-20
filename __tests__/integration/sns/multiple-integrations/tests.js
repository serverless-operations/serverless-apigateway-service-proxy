'use strict'

const { default: awsTesting } = require('aws-testing-library/lib/chai')
const chai = require('chai')
chai.use(awsTesting)
const { expect } = chai

const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Multiple SQS Proxy Integrations Test', () => {
  let endpoint
  let stage
  let region
  let queueUrl
  const config = '__tests__/integration/sns/multiple-integrations/service/serverless.yml'

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

  it('should get correct response from multiple sqs proxy endpoints', async () => {
    const topics = ['sns1', 'sns2', 'sns3']

    for (const topic of topics) {
      const testEndpoint = `${endpoint}/${topic}`

      const body = JSON.stringify({ message: `message for ${topic}` })
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
    }
  })
})
