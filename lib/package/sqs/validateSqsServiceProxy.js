'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async validateSqsServiceProxy() {
    await BbPromise.all(
      this.validated.events.map(async (serviceProxy) => {
        if (serviceProxy.functionName == 'sqs') {
          if (!_.has(serviceProxy.http, 'queueName')) {
            return BbPromise.reject(
              new this.serverless.classes.Error('Missing "queueName" property in SQS Service Proxy')
            )
          }

          if (
            typeof serviceProxy.http.queueName != 'object' &&
            typeof serviceProxy.http.queueName != 'string'
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS "Fn::GetAtt" intrinsic function',
              ' like { Fn::GetAtt: [ "SQSQueueResourceId", "QueueName" ] }}',
              ' as a queueName property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }

          if (
            typeof serviceProxy.http.queueName == 'object' &&
            !_.has(serviceProxy.http.queueName, 'Fn::GetAtt')
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS "Fn::GetAtt" intrinsic function',
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
