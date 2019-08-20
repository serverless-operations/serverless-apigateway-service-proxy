'use strict'

const Joi = require('@hapi/joi')
const schema = require('./schema')

module.exports = {
  validateSnsServiceProxy() {
    this.validated.events.forEach((serviceProxy) => {
      if (serviceProxy.serviceName == 'sns') {
        const { error } = Joi.validate(serviceProxy.http, schema, { allowUnknown: true })

        if (error) {
          throw new this.serverless.classes.Error(error)
        }
      }
    })
  }
}
