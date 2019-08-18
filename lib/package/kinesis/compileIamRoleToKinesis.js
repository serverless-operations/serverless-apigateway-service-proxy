'use strict'
const _ = require('lodash')

module.exports = {
  async compileIamRoleToKinesis() {
    const kinesisStreamNames = this.getAllServiceProxies()
      .filter((serviceProxy) => this.getServiceName(serviceProxy) === 'kinesis')
      .map((serviceProxy) => {
        const serviceName = this.getServiceName(serviceProxy)
        const { streamName } = serviceProxy[serviceName]
        return streamName
      })

    if (kinesisStreamNames.length <= 0) {
      return
    }

    const policyResource = kinesisStreamNames.map((streamName) => ({
      'Fn::Sub': [
        'arn:aws:kinesis:${AWS::Region}:${AWS::AccountId}:stream/${streamName}',
        { streamName }
      ]
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
            PolicyName: 'apigatewaytokinesis',
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
                  Action: ['kinesis:PutRecord'],
                  Resource: policyResource
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
}
