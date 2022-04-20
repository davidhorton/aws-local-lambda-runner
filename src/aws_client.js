const config = require('../config')
const AWS = require('aws-sdk')
const fs = require('fs')
const https = require('https')
const resolve = require('path').resolve
const extract = require('extract-zip')

const lambdasDir = "lambdas"
const lambdaZipsDir = "lambdaZips"

exports.downloadApis = async () => {
    process.env.AWS_REGION = config.api.region
    const apiGatewayClient = new AWS.ApiGatewayV2({
        region: config.api.region
    });

    const routes = []
    const awsApis = await apiGatewayClient.getApis().promise()
    for (let awsApi of awsApis.Items) {
        for (let apiName of config.api.api_names) {
            if (awsApi.Name.toLowerCase().includes(apiName.toLowerCase())) {
                console.log(`Getting routes for API with name = ${awsApi.Name} and ID = ${awsApi.ApiId}...`)
                await downloadRoutes(apiGatewayClient, routes, awsApi.ApiId)
            }
        }
    }

    console.log("Finished downloading routes: " + JSON.stringify(routes))
    routes.sort((a, b) => (a.path > b.path) ? 1 : -1)
    return routes
}

async function downloadRoutes(apiGatewayClient, routes, apiId) {
    if (config.api.download) {
        fs.rmSync(lambdasDir, {recursive: true, force: true})
        fs.rmSync(lambdaZipsDir, {recursive: true, force: true})
    }

    const awsRoutes = await apiGatewayClient.getRoutes({
        ApiId: apiId
    }).promise()

    for (let awsRoute of awsRoutes.Items) {
        const routeKeyParts = awsRoute.RouteKey.split(" ")
        const integrationId = awsRoute.Target.replace("integrations/", "")
        const lambdaName = await getLambdaName(apiGatewayClient, apiId, integrationId)
        routes.push({
            name: lambdaName,
            method: routeKeyParts[0].toUpperCase(),
            path: routeKeyParts[1],
            location: `${lambdasDir}/${lambdaName}`
        })
    }

    await downloadLambdas(routes)
}

async function getLambdaName(apiGatewayClient, apiId, integrationId) {
    const awsIntegration = await apiGatewayClient.getIntegration({ApiId: apiId, IntegrationId: integrationId}).promise()
    const functionNameSearchKey = ":function:"
    const uri = awsIntegration.IntegrationUri.substring(awsIntegration.IntegrationUri.indexOf(functionNameSearchKey) + functionNameSearchKey.length)
    const uriParts = uri.split(":")
    const functionName = uriParts[0]
    return functionName.replaceAll("/invocations", "")
}

async function downloadLambdas(routes) {
    const lambdaClient = new AWS.Lambda({
        region: config.api.region
    });

    if (config.api.download) {
        fs.mkdirSync(lambdaZipsDir)
    }

    const lambdaNames = new Set()
    for (let route of routes) { //just to get rid of duplicates
        lambdaNames.add(route.name)
    }
    for (let lambdaName of lambdaNames) {
        await downloadLambda(lambdaClient, lambdaName)
    }
}

async function downloadLambda(lambdaClient, lambdaName) {
    const lambda = await lambdaClient.getFunction({FunctionName: lambdaName}).promise()

    const envVariables = lambda.Configuration.Environment.Variables
    for (const [key, value] of Object.entries(envVariables)) {
        if (!process.env[key]) {
            process.env[key] = value
        }
    }

    if (config.api.download) {
        const zipPath = `${lambdaZipsDir}/${lambdaName}.zip`
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(zipPath);
            https.get(lambda.Code.Location, function (response) {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    console.log(`${zipPath} finished downloading.`);
                    resolve();
                });
                file.on("error", e => {
                    reject(e);
                });
            });
        }).catch(error => {
            console.log(`Failed to download ${zipPath}: ${error}`);
            throw error
        })

        await extract(zipPath, {dir: resolve(`${lambdasDir}/${lambdaName}`)})
        console.log(`Extracted ${zipPath} to ${lambdasDir}`)
    }
}