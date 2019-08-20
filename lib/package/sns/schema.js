'use strict'

const Joi = require('@hapi/joi')

// topic name must be a string or a an object structured as { 'Fn::GetAtt': ['SNSLogicalId', 'TopicName'] }
const topicName = Joi.alternatives().try([
  Joi.object({
    'Fn::GetAtt': Joi.array()
      .length(2)
      .ordered(
        Joi.string().required(),
        Joi.string()
          .valid('TopicName')
          .required()
      )
      .required()
  }),
  Joi.string()
])

const schema = Joi.object().keys({
  topicName: topicName.required()
})

module.exports = schema
