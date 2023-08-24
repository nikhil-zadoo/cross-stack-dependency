# Showcase for coordinating dependencies between stacks deployed independently.

This particular example repository has 3 stacks:
 - StackDependencyStack (main stack)
 - DependentStack1 (depends on StackDependencyStack)
 - DependentStack2 (depends on StackDependencyStack)

To deply the stack, run the following commands:
```
npm ci
npm run cdk deploy <STACK-NAME>
```

![architecture](./inter-stackdependency-architecture.png)