'use strict'
const _ = require('lodash')

const customErrorBuilder = (type, message) => (errors) => {
  for (const error of errors) {
    switch (error.type) {
      case type:
        error.message = _.isFunction(message) ? message(error) : message
        break
      default:
        break
    }
  }
  return errors
}

const Joi = require('@hapi/joi')

const path = Joi.string().required()

const method = Joi.string()
  .required()
  .valid(['get', 'post', 'put', 'patch', 'options', 'head', 'delete', 'any'])
  .insensitive()

const cors = Joi.alternatives().try(
  Joi.boolean(),
  Joi.object({
    headers: Joi.array().items(Joi.string()),
    origin: Joi.string(),
    origins: Joi.array().items(Joi.string()),
    methods: Joi.array().items(method),
    maxAge: Joi.number().min(1),
    cacheControl: Joi.string(),
    allowCredentials: Joi.boolean()
  })
    .oxor('origin', 'origins') // can have one of them, but not required
    .error(customErrorBuilder('object.oxor', '"cors" can have "origin" or "origins" but not both'))
)

const authorizerId = Joi.alternatives().try(
  Joi.string(),
  Joi.object().keys({
    Ref: Joi.string().required()
  })
)

const authorizationScopes = Joi.array()

// https://hapi.dev/family/joi/?v=15.1.0#anywhencondition-options
const authorizationType = Joi.alternatives().when('authorizerId', {
  is: authorizerId.required(),
  then: Joi.string()
    .valid('CUSTOM')
    .required(),
  otherwise: Joi.alternatives().when('authorizationScopes', {
    is: authorizationScopes.required(),
    then: Joi.string()
      .valid('COGNITO_USER_POOLS')
      .required(),
    otherwise: Joi.string().valid('NONE', 'AWS_IAM', 'CUSTOM', 'COGNITO_USER_POOLS')
  })
})

// https://hapi.dev/family/joi/?v=15.1.0#objectpatternpattern-schema
const requestParameters = Joi.object().pattern(Joi.string(), Joi.string().required())

const proxy = Joi.object({
  path,
  method,
  cors,
  authorizationType,
  authorizerId,
  authorizationScopes
})
  .oxor('authorizerId', 'authorizationScopes') // can have one of them, but not required
  .error(
    customErrorBuilder('object.oxor', 'cannot set both "authorizerId" and "authorizationScopes"')
  )
  .required()

const stringOrRef = Joi.alternatives().try([
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
    .error(
      customErrorBuilder(
        'object.xor',
        'key must contain "pathParam" or "queryStringParam" but not both'
      )
    )
])

const stringOrGetAtt = (propertyName, attributeName) => {
  return Joi.alternatives().try([
    Joi.string(),
    Joi.object({
      'Fn::GetAtt': Joi.array()
        .length(2)
        .ordered(
          Joi.string().required(),
          Joi.string()
            .valid(attributeName)
            .required()
        )
        .required()
    }).error(
      customErrorBuilder(
        'object.child',
        `"${propertyName}" must be in the format "{ 'Fn::GetAtt': ['<ResourceId>', '${attributeName}'] }"`
      )
    )
  ])
}

const allowedProxies = ['kinesis', 'sqs', 's3', 'sns']

const proxiesSchemas = {
  kinesis: Joi.object({
    kinesis: proxy.append({ streamName: stringOrRef.required() })
  }),
  s3: Joi.object({
    s3: proxy.append({
      action: Joi.string()
        .valid('GetObject', 'PutObject', 'DeleteObject')
        .required(),
      bucket: stringOrRef.required(),
      key: key.required()
    })
  }),
  sns: Joi.object({
    sns: proxy.append({ topicName: stringOrGetAtt('topicName', 'TopicName').required() })
  }),
  sqs: Joi.object({
    sqs: proxy.append({
      queueName: stringOrGetAtt('queueName', 'QueueName').required(),
      requestParameters
    })
  })
}

const schema = Joi.array()
  .items(...allowedProxies.map((proxyKey) => proxiesSchemas[proxyKey]))
  .error(
    customErrorBuilder('array.includes', (error) => {
      // get a detailed error why the proxy object failed the schema validation
      // Joi default message is `"value" at position <i> does not match any of the allowed types`
      const proxyKey = Object.keys(error.context.value)[0]

      let message = ''
      if (proxiesSchemas[proxyKey]) {
        // e.g. value is { kinesis: { path: '/kinesis', method: 'xxxx' } }
        const { error: proxyError } = Joi.validate(error.context.value, proxiesSchemas[proxyKey])
        message = proxyError.message
      } else {
        // e.g. value is { xxxxx: { path: '/kinesis', method: 'post' } }
        message = `Invalid APIG proxy "${proxyKey}". This plugin supported Proxies are: ${allowedProxies.join(
          ', '
        )}.`
      }
      return message
    })
  )

module.exports = schema
