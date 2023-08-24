import { StackProps } from 'aws-cdk-lib';
export interface StackWithDependenciesProps extends StackProps {
    readonly mainStack: string;
    readonly dependentStacks: string [];
}