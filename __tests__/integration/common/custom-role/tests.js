'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const {
  deployWithRandomStage,
  removeService,
  getS3Object,
  deleteS3Object
} = require('../../../utils')

describe('Proxy With Custom Role Integration Test', () => {
  let endpoint
  let stage
  let bucket
  const config = '__tests__/integration/common/custom-role/service/serverless.yml'
  const key = 'my-test-object.json'

  beforeAll(async () => {
    const result = await deployWithRandomStage(config)

    stage = result.stage
    endpoint = result.endpoint
    bucket = result.outputs.S3BucketName
  })

  afterAll(async () => {
    await deleteS3Object(bucket, key)
    removeService(stage, config)
  })

  it('should get correct response from s3 proxy endpoint with custom role', async () => {
    const testEndpoint = `${endpoint}/s3-custom-role/${key}`

    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' })
    })
    expect(response.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(response.status).to.be.equal(200)

    const uploadedObject = await getS3Object(bucket, key)
    expect(uploadedObject.toString()).to.equal(JSON.stringify({ message: 'test' }))
  })
})
