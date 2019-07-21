'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async validateKinesisServiceProxy() {
    await BbPromise.all(
      this.validated.events.map(async (serviceProxy) => {
        if (serviceProxy.serviceName == 'kinesis') {
          if (!_.has(serviceProxy.http, 'streamName')) {
            return BbPromise.reject(
              new this.serverless.classes.Error(
                'Missing "streamName" property in Kinesis Service Proxy'
              )
            )
          }

          if (
            !_.isPlainObject(serviceProxy.http.streamName) &&
            !_.isString(serviceProxy.http.streamName)
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS intrinsic function',
              ' "Ref" like { Ref: \'KinesisStreamResourceId\' }',
              ' as a streamName property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }

          if (
            _.isPlainObject(serviceProxy.http.streamName) &&
            !_.has(serviceProxy.http.streamName, 'Ref')
          ) {
            const errorMessage = [
              'the AWS intrinsic function need "Ref" property like',
              " { Ref: 'KinesisStreamResourceId' } as a streamName"
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }
        }
      })
    )
  }
}
