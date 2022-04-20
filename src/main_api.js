const express = require('express')
const awsClient = require('./aws_client')
const translator = require('./api_gateway_translator')
const config = require('../config')

const app = express()
const port = config.api.port
const lambdaEntryPoints = {}

exports.startServer = async () => {
    if (config.api.environmentVariables) {
        for (let env of config.api.environmentVariables) {
            console.log(`Setting ${env.name}=${env.value}`)
            process.env[env.name] = env.value
        }
    }

    const routes = await awsClient.downloadApis()
    for (let route of routes) {
        const path = translator.getPath(route.path)
        translator.setupPath(app, route.method, path, (req, res) => {
            console.log(`mock call received for ${path}`)
            const lambdaRequest = translator.translateRequest(req)
            const lambdaEntryPoint = getLambdaEntryPoint(route.name, route.location)
            lambdaEntryPoint.handler(lambdaRequest).then((result) => {
                res.status(result.statusCode).json(JSON.parse(result.body))
            })
        })
    }

    app.listen(port, () => {
        console.log(`Mock gateway listening on port ${port}`)
    })
}

function getLambdaEntryPoint(name, location) {
    if (lambdaEntryPoints[name]) {
        return lambdaEntryPoints[name]
    } else {
        location = `./${location}`
        if (config.api.local_lambda_overrides) {
            for (let localOverride of config.api.local_lambda_overrides) {
                if (name.toLowerCase().includes(localOverride.name.toLowerCase())) {
                    location = localOverride.location
                    break
                }
            }
        }

        let lambdaEntryPoint = require(`${location}/src/index`)
        lambdaEntryPoints[name] = lambdaEntryPoint
        return lambdaEntryPoint
    }
}

exports.startServer().then(() => {
    console.log("finished setting up server")
})
