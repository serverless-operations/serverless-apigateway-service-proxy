'use strict'
const _ = require('lodash')

module.exports = {
  compileIamRoleToSqs() {
    const sqsQueueNames = this.getAllServiceProxies()
      .filter((serviceProxy) => this.getServiceName(serviceProxy) === 'sqs')
      .map((serviceProxy) => {
        const serviceName = this.getServiceName(serviceProxy)
        const { queueName } = serviceProxy[serviceName]
        return queueName
      })

    if (sqsQueueNames.length <= 0) {
      return
    }

    const policyResource = sqsQueueNames.map((queueName) => ({
      'Fn::Sub': ['arn:aws:sqs:${AWS::Region}:${AWS::AccountId}:${queueName}', { queueName }]
    }))

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
                  Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                  Resource: '*'
                },
                {
                  Effect: 'Allow',
                  Action: ['sqs:SendMessage'],
                  Resource: policyResource
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
}
