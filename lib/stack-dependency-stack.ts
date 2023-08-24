import { CustomResource, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StackWithDependenciesProps } from './stack-util';

export class StackDependencyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackWithDependenciesProps) {
    super(scope, id, props);

    const resolveDependencyLambda = new nodejs.NodejsFunction(this, 'ResolveDependencyLambda', {
      entry: './lib/lambdas/cfn-signal-resolve.ts',
      logRetention: logs.RetentionDays.ONE_DAY,
      functionName: 'dependency-lambda',
      environment: {
        MAIN_STACK: props.mainStack,
        DEPENDENT_STACKS: props.dependentStacks.toString()
      }
    });

    resolveDependencyLambda.grantInvoke(new iam.ServicePrincipal('events.amazonaws.com'))
    resolveDependencyLambda.addToRolePolicy(new iam.PolicyStatement({
      resources: props.dependentStacks.map(x => `arn:aws:ssm:eu-west-1:${this.account}:parameter/dependency/${this.stackName}/${x}`), // [`arn:aws:ssm:eu-west-1:077952531709:parameter/test/dependency`],
      actions: ['ssm:*']
    }))

    const customResourceProvider = new cr.Provider(this, 'Provider', {
      onEventHandler: resolveDependencyLambda,
    })
    new CustomResource(this, 'CustomResource', {
      serviceToken: customResourceProvider.serviceToken,
    })

  }
}
