import * as ssm from '@aws-sdk/client-ssm'
import * as events from 'aws-lambda';
import fetch from 'node-fetch'

const ssmClient = new ssm.SSMClient()
export const handler = async (event: any) => {
    console.log(`Got evet : ${event}`)
    if (event.StackId) {
        console.log("Triggered as a custom resource")
    }
    else {
        console.log("Triggered via Eventbridge")
    }
    let url: string
    // Read the SSM Parameter
    const mainStack = process.env.MAIN_STACK
    const dependentStacks = process.env.DEPENDENT_STACKS
    for (const dependentStack of dependentStacks!.split(',')) {
        try {
            const ssmParameter = `/dependency/${mainStack}/${dependentStack}`;
            console.log(`Trying to read SSM Parameter: ${ssmParameter}`)
            const paramResponse = await ssmClient.send(new ssm.GetParameterCommand({
                Name: ssmParameter
            }))
            url = paramResponse.Parameter!.Value!
            console.log(`Trying to send SUCCESS response to callback url : ${url}`)
            await fetch(url, {
                method: 'PUT',
                body: JSON.stringify({
                    Status: 'SUCCESS',
                    UniqueId: 'configuration',
                    Data: 'Dummy'
                })
            })
        }
        catch(ex) {
            if(ex instanceof ssm.ParameterNotFound) {
                console.log("Seems the dependent stack is not yet deployed")
            }
            else {
                console.log("unhandled exception")
            }
        }
    }
    return
}