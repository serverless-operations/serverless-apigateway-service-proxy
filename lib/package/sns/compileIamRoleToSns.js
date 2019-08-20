'use strict'
const _ = require('lodash')

module.exports = {
  compileIamRoleToSns() {
    const topicNames = this.getAllServiceProxies()
      .filter((serviceProxy) => this.getServiceName(serviceProxy) === 'sns')
      .map((serviceProxy) => {
        const serviceName = this.getServiceName(serviceProxy)
        const { topicName } = serviceProxy[serviceName]
        return topicName
      })

    if (topicNames.length <= 0) {
      return
    }

    const policyResource = topicNames.map((topicName) => ({
      'Fn::Sub': ['arn:aws:sns:${AWS::Region}:${AWS::AccountId}:${topicName}', { topicName }]
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
            PolicyName: 'apigatewaytosns',
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
                  Action: ['sns:Publish'],
                  Resource: policyResource
                }
              ]
            }
          }
        ]
      }
    }

    _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
      ApigatewayToSnsRole: template
    })
  }
}
