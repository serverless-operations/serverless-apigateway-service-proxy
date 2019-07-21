'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async validateSqsServiceProxy() {
    await BbPromise.all(
      this.validated.events.map(async (serviceProxy) => {
        if (serviceProxy.serviceName == 'sqs') {
          if (!_.has(serviceProxy.http, 'queueName')) {
            return BbPromise.reject(
              new this.serverless.classes.Error('Missing "queueName" property in SQS Service Proxy')
            )
          }

          if (
            !_.isPlainObject(serviceProxy.http.queueName) &&
            !_.isString(serviceProxy.http.queueName)
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS "Fn::GetAtt" intrinsic function',
              ' like { Fn::GetAtt: [ "SQSQueueResourceId", "QueueName" ] }}',
              ' as a queueName property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }

          if (
            _.isPlainObject(serviceProxy.http.queueName) &&
            !_.has(serviceProxy.http.queueName, 'Fn::GetAtt')
          ) {
            const errorMessage = [
              'the AWS intrinsic function needs "Fn::GetAtt"',
              ' like { Fn::GetAtt: [ "SQSQueueResourceId", "QueueName" ] }}',
              ' as a queueName property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }
        }
      })
    )
  }
}
