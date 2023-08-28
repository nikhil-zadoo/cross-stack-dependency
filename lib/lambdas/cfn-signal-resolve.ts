import * as ssm from '@aws-sdk/client-ssm'
import fetch from 'node-fetch'

const ssmClient = new ssm.SSMClient()
export const handler = async (event: any) => {
    console.log(`Got event : ${event}`)
    if (event.StackId) {
        if (event.RequestType === 'Delete' || event.RequestType === 'Update')
        {
            console.log(`Got a ${event.RequestType} request. Nothing to do further`)
            return
        }
        console.log(`Got a ${event.RequestType} request. Triggered as a custom resource`)
    }
    else {
        console.log("Triggered via Eventbridge")
    }

    let url: string;
    const mainStack = process.env.MAIN_STACK;
    const dependentStacks = process.env.DEPENDENT_STACKS;
    const ssmParameterPrefix = process.env.SSM_PARAMETER_PREFIX;
    const callbackData = process.env.CALLBACK_DATA;
    const uniqueId = process.env.UNIQUE_ID;

    for (const dependentStack of dependentStacks!.split(',')) {
        try {
            const ssmParameter = `/${ssmParameterPrefix}/${mainStack}/${dependentStack}`;
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
                    UniqueId: uniqueId,
                    Data: callbackData,
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