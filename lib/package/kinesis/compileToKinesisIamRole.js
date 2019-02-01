'use strict'
const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async compileToKinesisIamRole() {
    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        Object.keys(serviceProxy).forEach(async (serviceName) => {
          if (serviceName == 'kinesis') {
            const template = {
              Type: 'AWS::IAM::Role',
              Properties: {
                AssumeRolePolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Principal: {
                        Service: 'apigateway.amazonaws.com'
                      },
                      Action: 'sts:AssumeRole'
                    }
                  ]
                },
                Policies: [
                  {
                    PolicyName: 'apigatewaytokinesis',
                    PolicyDocument: {
                      Version: '2012-10-17',
                      Statement: [
                        {
                          Effect: 'Allow',
                          Action: ['kinesis:PutRecord'],
                          Resource: '*'
                        }
                      ]
                    }
                  }
                ]
              }
            }

            _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
              ApigatewayToKinesisRole: template
            })
          }
        })
      })
    )
  }
}
