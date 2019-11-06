'use strict'
const AWS = require('aws-sdk')
const expect = require('chai').expect

const fetch = require('node-fetch')
const { deployWithRandomStage, removeService } = require('../../../utils')

describe('Single SQS Proxy Integration Test', () => {
  let endpoint
  let region
  let stage
  let queueUrl
  const config = '__tests__/integration/common/accept-parameters/service/serverless.yml'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)

    region = result.region
    stage = result.stage
    endpoint = result.endpoint
    queueUrl = result.outputs.SqsQueueUrl
  })

  afterAll(() => {
    removeService(stage, config)
  })

  it('should pass custom header to sqs message attribute', async () => {
    const testEndpoint = `${endpoint}/sqs`

    const body = JSON.stringify({ message: 'test accept parameters' })
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Custom-Header': 'custom header value' },
      body
    })

    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)

    const json = await response.json()

    expect(json.SendMessageResponse.SendMessageResult).to.have.own.property(
      'MD5OfMessageAttributes'
    )
    expect(json.SendMessageResponse.SendMessageResult).to.have.own.property('MD5OfMessageBody')
    expect(json.SendMessageResponse.SendMessageResult).to.have.own.property('MessageId')
    expect(json.SendMessageResponse.SendMessageResult).to.have.own.property('SequenceNumber')
    expect(json.SendMessageResponse.ResponseMetadata).to.have.own.property('RequestId')

    const sqs = new AWS.SQS({ region })
    const { Messages = [] } = await sqs
      .receiveMessage({ QueueUrl: queueUrl, WaitTimeSeconds: 20, MessageAttributeNames: ['.*'] })
      .promise()

    expect(Messages).to.have.length(1)
    expect(Messages[0].Body).to.deep.equal(body)

    expect(Messages[0].MessageAttributes).to.deep.equal({
      'custom-Header': {
        StringValue: 'custom header value',
        StringListValues: [],
        BinaryListValues: [],
        DataType: 'String'
      }
    })
  })
})
