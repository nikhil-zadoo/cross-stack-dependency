import { Construct } from 'constructs';
import { CfnResource, Stack, CustomResource, CfnCustomResource } from 'aws-cdk-lib';
import * as cloudformation from 'aws-cdk-lib/aws-cloudformation';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTarget from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export enum DepenednceType {
  /**
   * Type of stack on which another stack depends
   */
  DEPENDEE = "dependee",

  /**
   * Type of stack which dependes on another stack
   */
  DEPENDER = 'depender'
}

export interface InterStackDependenceProps {
  /**
   * Type of stack, Either dependee or depender
   */
  readonly dependenceType: DepenednceType;

  /**
   * Needs to be set only in case it is a dependee stack
   * Names of all the stack that depend on this stack
   */
  readonly dependerStackNames?: string[];

  /**
   * Needs to be set in case it is a depender stack
   * Add the name of the stack that this stack depends on
   */
  readonly dependeeStackName?: string;

  /**
   * CDK node with the dependence.
   * In case of dependeeStack, should point to the depender resource and vice vers
   */
  readonly dependencyResource: Construct;

  /**
   * Maximum time (in seconds) for which the dependent resource will wait
   * @default 3600
   */
  readonly timeoutSeconds?: number;

  /**
   * Callback data that can be sent from the depndee stack to the dependent stack using waitcondition callback data
   * Set the value accordingly
   * Ref : https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-waitcondition.html#using-cfn-waitcondition-signaljson
   */
  readonly callbackData?: string;
}

/**
 * Construct to set dependency between 2 stacks
 * 
 * The stack that depends on another stack is referred to as depender stack within the construct
 * 
 * The stack that the depender stack depends on is referred to as dependee stack
 */
export class InterStackDependence extends Construct {
  /**
   * Retrieves the value that was set in the dependee stack as callBackData property
   * Should be only used when dependenceType is depender
   */
  dependeeReturnData: any;

  constructor(scope: Construct, id: string, props: InterStackDependenceProps) {
    super(scope, id);

    const ssmParameterPrefix = 'dependency';
    const uniqueId = 'configuration';

    if (props.dependenceType === DepenednceType.DEPENDER) {
      if (!props.dependeeStackName) {
        throw new Error('Please set dependeeStackName, which points to the stack this stack depends on');
      }
      if(props.callbackData) {
        throw new Error('callbackData can only be set in case the stack is DEPENDEE stack')
      }
      const waitConditionHandle = new cloudformation.CfnWaitConditionHandle(this, 'WaitHandle');
      const waitCondition = new cloudformation.CfnWaitCondition(this, 'WaitCondition', {
        handle: waitConditionHandle.ref,
        timeout: props.timeoutSeconds?.toString() ?? '3600',
      });
      const ssmParameter = `/${ssmParameterPrefix}/${props.dependeeStackName}/${Stack.of(scope).stackName}`;
      
      new ssm.StringParameter(this, 'SSMParam', {
        parameterName: ssmParameter,
        stringValue: waitConditionHandle.ref
      });
      (props.dependencyResource.node.defaultChild as CfnResource).addDependency(waitCondition);

      const callbackDataParserLambda = new nodejs.NodejsFunction(this, 'CallbackDataParser', {
        entry: './lib/lambdas/callback-data-parser.ts',
        environment: {
          UNIQUE_ID: uniqueId,
        }
      })
      const crHandler = new cr.Provider(this, 'CustomResourceProvider', {
        onEventHandler: callbackDataParserLambda,
      })
      const customResource = new CustomResource(this, 'CallbackDataReaderCustomResource', {
        serviceToken: crHandler.serviceToken,
        properties: {
          Data: waitCondition.attrData,
        }
      })
      this.dependeeReturnData = customResource.getAtt('DependeeReturnData')
    }

    if (props.dependenceType === DepenednceType.DEPENDEE) {
      if (!props.dependerStackNames) {
        throw new Error('Please set dependerStackNames, which points to the other stacks that depend on this stack');
      }
      const resolveDependencyLambda = new nodejs.NodejsFunction(this, 'ResolveDependencyLambda', {
        entry: './lib/lambdas/cfn-signal-resolve.ts',
        logRetention: logs.RetentionDays.ONE_WEEK,
        environment: {
          MAIN_STACK: Stack.of(scope).stackName,
          DEPENDENT_STACKS: props.dependerStackNames.toString(),
          SSM_PARAMETER_PREFIX: ssmParameterPrefix,
          CALLBACK_DATA: props.callbackData ?? '',
          UNIQUE_ID: uniqueId,
        }
      });
      
      const customResourceProvider = new cr.Provider(this, 'Provider', {
        onEventHandler: resolveDependencyLambda,
      });
      const customResource = new CustomResource(this, 'CustomResource', {
        serviceToken: customResourceProvider.serviceToken,
      });
      props.dependerStackNames.map(
        dependerStackName => {
          const ssmParameter = `/${ssmParameterPrefix}/${Stack.of(this).stackName}/${dependerStackName}`
          const dependencyEvent = new events.Rule(this, `EventRule${dependerStackName}`, {
            eventPattern: {
              source: ['aws.ssm'],
              detailType: ['Parameter Store Change'],
              detail: {
                name: [{ prefix: ssmParameter }],
                operation: ['Create']
              }
            },
            targets: [
              new eventTarget.LambdaFunction(resolveDependencyLambda),
            ]
          });
          resolveDependencyLambda.addToRolePolicy(new iam.PolicyStatement({
            resources: [`arn:aws:ssm:eu-west-1:${Stack.of(scope).account}:parameter/${ssmParameterPrefix}/${Stack.of(scope).stackName}/${dependerStackName}`],
            actions: [
              'ssm:DescribeParameters',
              'ssm:GetParameter',
              'ssm:GetParameterHistory',
              'ssm:GetParameters'
            ]
          }));
          (customResource.node.defaultChild as CfnCustomResource).addDependency(dependencyEvent.node.defaultChild as events.CfnRule)
        }
      );

      (resolveDependencyLambda.node.defaultChild as lambda.CfnFunction).addDependency(props.dependencyResource.node.defaultChild as CfnResource)
    }
  }
}
