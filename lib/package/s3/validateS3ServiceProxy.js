'use strict'

const Joi = require('@hapi/joi')
const schema = require('./schema')

module.exports = {
  validateS3ServiceProxy() {
    this.validated.events.map((serviceProxy) => {
      if (serviceProxy.serviceName == 's3') {
        const { error } = Joi.validate(serviceProxy.http, schema, { allowUnknown: true })

        if (error) {
          throw new this.serverless.classes.Error(error)
        }
      }
    })
  }
}
