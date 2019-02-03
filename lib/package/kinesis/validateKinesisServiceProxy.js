'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async validateKinesisServiceProxy() {
    await BbPromise.all(
      this.validated.events.map(async (serviceProxy) => {
        if (serviceProxy.functionName == 'kinesis') {
          if (!_.has(serviceProxy.http, 'streamName')) {
            return BbPromise.reject(
              new this.serverless.classes.Error(
                'Missing "streamName" property in Kinesis Service Proxy'
              )
            )
          }

          if (
            typeof serviceProxy.http.streamName != 'object' &&
            typeof serviceProxy.http.streamName != 'string'
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS intrinsic function',
              ' "Ref" like { Ref: \'KinesisStreamResourceId\' }}',
              ' as a streamName property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }

          if (
            typeof serviceProxy.http.streamName == 'object' &&
            !_.has(serviceProxy.http.streamName, 'Ref')
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS intrinsic function',
              ' "Ref" like { Ref: \'KinesisStreamResourceId\' }}',
              ' as a streamName property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }
        }
      })
    )
  }
}
