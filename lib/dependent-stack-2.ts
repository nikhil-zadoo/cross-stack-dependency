import { Construct } from 'constructs';
import { CustomResource, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as cloudformation from 'aws-cdk-lib/aws-cloudformation';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as events from 'aws-cdk-lib/aws-events'
import * as eventTarget from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StackWithDependenciesProps } from './stack-util';

export class DependentStack extends Stack {
    constructor(scope: Construct, id: string, props: StackWithDependenciesProps) {
      super(scope, id, props);

      const waitConditionHanle = new cloudformation.CfnWaitConditionHandle(this, 'WaitHandle')
      const waitCondition = new cloudformation.CfnWaitCondition(this, 'WaitCondition', {
        handle: waitConditionHanle.ref,
        timeout: '3600',
      });
      const ssmParameter = `/dependency/${props.mainStack}/${Stack.of(this).stackName}`;
      const dependencyEvent = new events.Rule(this, 'EventRule', {
        eventPattern: {
          source: ['aws.ssm'],
          detailType: ['Parameter Store Change'],
          detail: {
            name: [{prefix: ssmParameter}],
            operation: ['Create']
          }
        },
        targets: [
          new eventTarget.LambdaFunction(lambda.Function.fromFunctionName(this, 'DependencyLambda', 'dependency-lambda'))
        ]
      });
      const dependencySSMParam = new ssm.StringParameter(this, 'SSMPAram', {
        parameterName: ssmParameter,
        stringValue: waitConditionHanle.ref
      });
      (dependencySSMParam.node.defaultChild as ssm.CfnParameter).addDependency(dependencyEvent.node.defaultChild as events.CfnRule)
    }
}