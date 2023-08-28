import { Construct } from 'constructs';
import { Stack, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { StackWithDependenciesProps } from './stack-util';
import { InterStackDependence, DepenednceType } from './inter-stack-dependence';

export class DependentStack extends Stack {
    constructor(scope: Construct, id: string, props: StackWithDependenciesProps) {
      super(scope, id, props);

      const bucket = new s3.Bucket(this, 'Bucket2', {autoDeleteObjects: true, removalPolicy: RemovalPolicy.DESTROY})
      const dependency = new InterStackDependence(this, 'Dependence', {
        dependencyResource: bucket,
        dependenceType: DepenednceType.DEPENDER,
        dependeeStackName: props.mainStack,
      })
      new CfnOutput(this, 'Output', dependency.dependeeReturnData)
    }
}

