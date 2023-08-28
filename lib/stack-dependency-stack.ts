import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { StackWithDependenciesProps } from './stack-util';
import { DepenednceType, InterStackDependence } from './inter-stack-dependence';

export class StackDependencyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackWithDependenciesProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'DependerBucket', {autoDeleteObjects:true, removalPolicy: RemovalPolicy.DESTROY});

    new InterStackDependence(this, 'Dependece', {
      dependenceType: DepenednceType.DEPENDEE,
      dependencyResource: bucket,
      dependerStackNames: props.dependentStacks,
      callbackData: bucket.bucketArn,
    })
  }
}
