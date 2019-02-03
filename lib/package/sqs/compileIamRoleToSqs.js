'use strict'
const _ = require('lodash')
const BbPromise = require('bluebird')

module.exports = {
  async compileIamRoleToSqs() {
    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        Object.keys(serviceProxy).forEach(async (serviceName) => {
          if (serviceName == 'sqs') {
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
                    PolicyName: 'apigatewaytosqs',
                    PolicyDocument: {
                      Version: '2012-10-17',
                      Statement: [
                        {
                          Effect: 'Allow',
                          Action: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents'
                          ],
                          Resource: '*'
                        },
                        {
                          Effect: 'Allow',
                          Action: ['sqs:SendMessage'],
                          Resource: '*'
                        }
                      ]
                    }
                  }
                ]
              }
            }

            _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
              ApigatewayToSqsRole: template
            })
          }
        })
      })
    )
  }
}
