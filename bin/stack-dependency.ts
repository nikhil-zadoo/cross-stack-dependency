#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StackDependencyStack } from '../lib/stack-dependency-stack';
import { DependentStack } from '../lib/dependent-stack';

const app = new cdk.App();
const dependentStack1 = 'dependent-stack-1';
const dependentStack2 = 'dependent-stack-2';
const dependentStacks = [dependentStack1, dependentStack2]
const mainStack = 'main-stack';
new StackDependencyStack(app, 'StackDependencyStack', {
    dependentStacks,
    mainStack,
    stackName: mainStack
});
new DependentStack(app, 'DependentStack1', {
    dependentStacks,
    mainStack,
    stackName: dependentStack1,
});
new DependentStack(app, 'DependentStack2', {
    dependentStacks,
    mainStack,
    stackName: dependentStack2
})
