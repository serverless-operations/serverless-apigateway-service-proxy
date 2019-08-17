'use strict'

const Joi = require('@hapi/joi')

const action = Joi.string().valid('GetObject', 'PutObject', 'DeleteObject')

const bucket = Joi.alternatives().try([
  Joi.string(),
  Joi.object().keys({
    Ref: Joi.string().required()
  })
])

const key = Joi.alternatives().try([
  Joi.string(),
  Joi.object()
    .keys({
      pathParam: Joi.string(),
      queryStringParam: Joi.string()
    })
    .xor('pathParam', 'queryStringParam')
])

const schema = Joi.object().keys({
  action: action.required(),
  bucket: bucket.required(),
  key: key.required()
})

module.exports = schema
