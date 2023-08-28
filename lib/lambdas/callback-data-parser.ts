import * as events from 'aws-lambda'
export const handler = async (events: events.CloudFormationCustomResourceCreateEvent) => {
    const uniqueId = process.env.UNIQUE_ID as string;
    if (events.RequestType === 'Create') {
        console.log(`Got event ${JSON.stringify(events)}`)
        console.log(`Got ${events.RequestType} event`);
        const data = events.ResourceProperties.Data;
        const configuration = JSON.parse(data);
        console.log(`Returning data value ${configuration[uniqueId]}`)
        return {
            Data: {
                DependeeReturnData: configuration[uniqueId]
            }
        }

    }
    else {
        console.log(`Got ${events.RequestType} events. nothing to do`)
        return
    }
}