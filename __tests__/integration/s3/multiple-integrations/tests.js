'use strict'

const expect = require('chai').expect
const fetch = require('node-fetch')
const {
  deployWithRandomStage,
  removeService,
  getS3Object,
  deleteS3Object
} = require('../../../utils')

describe('Multiple S3 Proxies Integration Test', () => {
  let endpoint
  let stage
  let bucket
  const config = '__tests__/integration/s3/multiple-integrations/service/serverless.yml'
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

  it('should get correct response from s3 put endpoint', async () => {
    const putEndpoint = `${endpoint}/s3`

    const putResponse = await fetch(putEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' })
    })
    expect(putResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(putResponse.status).to.be.equal(200)

    const uploadedObject = await getS3Object(bucket, key)
    expect(uploadedObject.toString()).to.equal(JSON.stringify({ message: 'test' }))
  })

  it('should get correct response from s3 get endpoint', async () => {
    const getEndpoint = `${endpoint}/s3/${key}`

    const getResponse = await fetch(getEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    expect(getResponse.headers.get('access-control-allow-origin')).to.deep.equal('*')
    expect(getResponse.status).to.be.equal(200)

    const body = await getResponse.json()
    expect(body).to.deep.equal({ message: 'test' })
  })

  it('should get correct response from s3 delete endpoint', async () => {
    const deleteEndpoint = `${endpoint}/s3?key=${key}`

    const deleteResponse = await fetch(deleteEndpoint, {
      method: 'DELETE'
    })
    expect(deleteResponse.status).to.be.equal(200)
  })
})
